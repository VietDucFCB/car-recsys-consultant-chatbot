# Chatbot v2 Sub-1 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-point chatbot_2's data layer at the real system — ingest chatbot_2-style chunked documents into a new Qdrant Cloud collection, and rewrite every SQL helper in `generate_response.py` from SQL-Server star schema to Postgres `gold.*` on AlloyDB.

**Architecture:** Two units in `chatbot_2/` (sub-2 later moves the graph into the backend): (1) `ingest_database.py` rewritten to read `gold.vehicles`+`gold.vehicle_features` on AlloyDB → chunk → Qdrant collection `car_vectorize` via LangChain `QdrantVectorStore`; (2) the SQL helpers + analytics queries in `generate_response.py` rewritten to single-table `gold.*` queries (de-JOIN, `TOP n`→`LIMIT n`, `LIKE`→`ILIKE`, column renames).

**Tech Stack:** Python, LangChain (`langchain-qdrant` `QdrantVectorStore`, `langchain-openai` embeddings), Qdrant Cloud, SQLAlchemy + psycopg2 against AlloyDB (Postgres 17), `RecursiveCharacterTextSplitter`.

**Reference spec:** `docs/superpowers/specs/2026-06-01-chatbot-v2-sub1-data-layer-design.md`

**Working dir:** `/home/duc-nguyen16/car-recsys-consultant-chatbot/chatbot_2`

**Verification reality:** No test runner in chatbot_2, and this env cannot `pip install`/run against the cloud DBs. Each code task is verified by `python -m py_compile` + grep here; the real ingest + SQL execution runs on the USER's machine (needs deps + AlloyDB/Qdrant access + OpenAI key, ~$0.10 re-embed). DB schema is FIXED (verified):
- `gold.vehicles`: vin, new_used, title, brand, car_name, car_model, price, monthly_payment, mileage, mpg, exterior_color, interior_color, drivetrain, fuel_type, transmission, engine, car_rating, car_rating_count, percentage_recommend, vehicle_url, primary_image_url, … (denormalized — every field chatbot_2 JOINed).
- `gold.vehicle_features`: vehicle_id, feature_category, feature_name.
- `gold.vehicle_images`: vehicle_id, image_order, image_url.

**Env the rewritten code uses (replaces SQL-Server vars):**
- `WAREHOUSE_DSN` (or `DATABASE_URL`) — AlloyDB Postgres DSN (`postgresql://admin:admin123@104.155.166.86:5432/car_recsys?sslmode=require`).
- `QDRANT_URL`, `QDRANT_API_KEY`, `OPENAI_API_KEY` — as elsewhere in the system.
- Drops: `DB_CONNECTION_STRING`, `MAIN_POST`/`MAIN_VIEW`, `FEATURE_POST`, `IMAGE_POST`.

---

## File Structure
- `chatbot_2/requirements.txt` (MODIFY) — add `langchain-qdrant`, `qdrant-client`, `psycopg2-binary`.
- `chatbot_2/ingest_database.py` (REWRITE) — gold.vehicles → chunked docs → Qdrant `car_vectorize`.
- `chatbot_2/generate_response.py` (MODIFY) — module engine + 4 SQL helpers + 6 analytics queries to gold.*.

Order: deps (T1) → ingest rewrite (T2) → engine+helpers rewrite (T3) → analytics rewrite (T4) → user runs ingest + smoke SQL (T5).

---

## Task 1: Add Qdrant + Postgres deps

**Files:** Modify `chatbot_2/requirements.txt`

- [ ] **Step 1: Append the deps**

Add these lines to `chatbot_2/requirements.txt` (the file already has langchain/langgraph/openai; append at the end):
```
langchain-qdrant==0.2.0
qdrant-client==1.12.1
psycopg2-binary==2.9.9
```

- [ ] **Step 2: Verify + commit**
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot
grep -nE "langchain-qdrant|qdrant-client|psycopg2" chatbot_2/requirements.txt
git add chatbot_2/requirements.txt
git commit -m "chore(chatbot_2): add langchain-qdrant + qdrant-client + psycopg2 deps

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: the three deps present. (Versions are pinned to known-good; if a resolver conflict appears at install time on the user's machine, loosen to `langchain-qdrant>=0.2,<0.3` etc.)

---

## Task 2: Rewrite ingest to gold.vehicles → Qdrant

**Files:** Rewrite `chatbot_2/ingest_database.py`

- [ ] **Step 1: Replace the file**

Replace ALL of `chatbot_2/ingest_database.py` with:
```python
"""Ingest gold.vehicles (+ features) from AlloyDB into a Qdrant collection for the
chatbot_2 agentic retriever. Chatbot-2-style chunked documents (page_content +
metadata), embedded with text-embedding-3-large, written to Qdrant `car_vectorize`.
"""
import os
from collections import defaultdict
from uuid import uuid4

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

load_dotenv()

WAREHOUSE_DSN = os.getenv("WAREHOUSE_DSN") or os.getenv("DATABASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("CHATBOT_QDRANT_COLLECTION", "car_vectorize")
EMBED_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
EMBED_DIM = int(os.getenv("OPENAI_EMBEDDING_DIM", "3072"))

CHUNK_SIZE = 250
CHUNK_OVERLAP = 30
BATCH_SIZE = 256


def _load_rows():
    """One dict per vehicle, with features grouped by category (mirrors the old
    feature_type -> [feature_name] shape)."""
    engine = create_engine(WAREHOUSE_DSN)
    with engine.connect() as con:
        vehicles = con.execute(text("""
            SELECT vin, new_used AS status, title, brand, car_name, car_model,
                   price, monthly_payment, mileage, mpg,
                   exterior_color, interior_color, drivetrain, fuel_type,
                   transmission, engine, vehicle_url
            FROM gold.vehicles
            WHERE title IS NOT NULL
        """)).mappings().all()
        feats = con.execute(text("""
            SELECT vehicle_id, feature_category, feature_name
            FROM gold.vehicle_features
            WHERE feature_name IS NOT NULL
        """)).all()
    by_vin = defaultdict(lambda: defaultdict(list))
    for vid, cat, name in feats:
        if name not in by_vin[vid][cat or "Other"]:
            by_vin[vid][cat or "Other"].append(name)
    out = []
    for v in vehicles:
        d = dict(v)
        d["features"] = {k: list(vs) for k, vs in by_vin.get(d["vin"], {}).items()}
        out.append(d)
    return out


def _to_document(d: dict) -> Document:
    page_content = (
        f"status: {d.get('status', '')}. title: {d.get('title', '')}"
        f". brand: {d.get('brand', '')}. interior_color: {d.get('interior_color', '')}"
        f". exterior_color: {d.get('exterior_color', '')}. drivetrain: {d.get('drivetrain', '')}"
        f". fuel_type: {d.get('fuel_type', '')}. transmission: {d.get('transmission', '')}"
        f". engine: {d.get('engine', '')}. features: {d.get('features', '')}"
    )
    metadata = {
        "VIN": d.get("vin"),
        "Price": float(d["price"]) if d.get("price") is not None else None,
        "Monthly Payment": float(d["monthly_payment"]) if d.get("monthly_payment") is not None else None,
        "Mileage": int(d["mileage"]) if d.get("mileage") is not None else None,
        "Miles Per Gallon": d.get("mpg"),
        "Post Link": d.get("vehicle_url"),
        "Status": d.get("status", ""),
        "Title": d.get("title", ""),
        "Brand": d.get("brand", ""),
        "Interior Color": d.get("interior_color", ""),
        "Exterior Color": d.get("exterior_color", ""),
        "Drivetrain": d.get("drivetrain", ""),
        "Fuel Type": d.get("fuel_type", ""),
        "Transmission": d.get("transmission", ""),
        "Engine": d.get("engine", ""),
    }
    return Document(page_content=page_content, metadata=metadata)


def _ensure_collection(client: QdrantClient):
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
        print(f"created Qdrant collection {COLLECTION_NAME}")


def main():
    if not (WAREHOUSE_DSN and QDRANT_URL):
        raise SystemExit("WAREHOUSE_DSN and QDRANT_URL are required")
    print("loading rows from gold.vehicles ...")
    rows = _load_rows()
    print(f"loaded {len(rows)} vehicles")
    docs = [_to_document(d) for d in rows]
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    chunks = splitter.split_documents(docs)
    print(f"split into {len(chunks)} chunks")

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
    _ensure_collection(client)
    embeddings = OpenAIEmbeddings(model=EMBED_MODEL)
    store = QdrantVectorStore(client=client, collection_name=COLLECTION_NAME, embedding=embeddings)

    total = len(chunks)
    for i in range(0, total, BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        store.add_documents(documents=batch, ids=[str(uuid4()) for _ in batch])
        print(f"added {min(i + BATCH_SIZE, total)}/{total}")
    print("ingest complete")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify + commit**
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot
python -m py_compile chatbot_2/ingest_database.py && echo "ingest OK"
grep -nE "gold.vehicles|gold.vehicle_features|QdrantVectorStore|car_vectorize|Chroma" chatbot_2/ingest_database.py
git add chatbot_2/ingest_database.py
git commit -m "feat(chatbot_2): ingest gold.vehicles -> Qdrant car_vectorize (was Chroma+SQL Server)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: `ingest OK`; grep shows gold tables + QdrantVectorStore + collection, and NO `Chroma`.

---

## Task 3: Rewrite module engine + 4 SQL helpers to gold.*

**Files:** Modify `chatbot_2/generate_response.py`

- [ ] **Step 1: Module engine + drop SQL-Server view env**

Find (lines ~31-38):
```python
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
db_engine = create_engine(DB_CONNECTION_STRING, pool_size=10, max_overflow=20)
```
Replace with:
```python
WAREHOUSE_DSN = os.getenv("WAREHOUSE_DSN") or os.getenv("DATABASE_URL")
db_engine = create_engine(WAREHOUSE_DSN, pool_size=10, max_overflow=20)
```
And find the `MAIN_VIEW = os.getenv("MAIN_POST", "[dbo].[view_post_info]")` line — DELETE it (the rewritten `sql_search_cars` uses `gold.vehicles` directly).

- [ ] **Step 2: Rewrite `sql_search_cars`**

Replace the `query = text(f"""...""")` inside `sql_search_cars` (the SELECT … FROM {MAIN_VIEW} … block) with a gold.vehicles query (note `LIKE`→`ILIKE`, `TOP`→`LIMIT`, `post_link`→`vehicle_url`, `status`→`new_used`):
```python
    query = text(f"""
        SELECT DISTINCT
            vin AS "VIN", new_used AS status, title, brand,
            exterior_color, interior_color, drivetrain, fuel_type,
            transmission, engine, price, monthly_payment, mileage, mpg,
            vehicle_url AS post_link
        FROM gold.vehicles
        WHERE {' AND '.join(conditions)}
        ORDER BY price ASC
        LIMIT :limit
    """)
```
ALSO update the `conditions`/`params` builder in that function to Postgres: change every `LIKE` to `ILIKE` and `status`→`new_used`. The current builder uses bare column names (`brand`, `title`, `fuel_type`, `price`, `status`) which all exist on gold.vehicles EXCEPT `status` → use `new_used`. Specifically:
- `conditions.append("status LIKE :status")` → `conditions.append("new_used ILIKE :status")`
- `conditions.append("fuel_type LIKE :fuel_type")` → `conditions.append("fuel_type ILIKE :fuel_type")`
- `conditions.append("title LIKE :model")` → `conditions.append("title ILIKE :model")`
- `conditions.append("title LIKE :year")` → `conditions.append("title ILIKE :year")`
- brand/price conditions stay (`brand = :brand`, `price >= :price_min`, etc. — valid Postgres).

- [ ] **Step 3: Rewrite `get_avg_price`**

Replace the whole `get_avg_price` body's query (the `post.Post`⋈`core.Car`⋈`core.Brand` JOIN) with single-table gold.vehicles:
```python
def get_avg_price(brand: str = None, model: str = None):
    conditions = ["price IS NOT NULL", "price > 0"]
    params = {}
    if brand:
        conditions.append("brand = :brand")
        params["brand"] = brand
    if model:
        conditions.append("(car_name ILIKE :model OR title ILIKE :model)")
        params["model"] = f"%{model}%"
    query = text(f"""
        SELECT AVG(price) AS avg_price, MIN(price) AS min_price,
               MAX(price) AS max_price, COUNT(DISTINCT vin) AS total
        FROM gold.vehicles
        WHERE {' AND '.join(conditions)}
    """)
    with db_engine.connect() as con:
        row = con.execute(query, params).mappings().first()
        return dict(row) if row else {}
```

- [ ] **Step 4: Rewrite `get_image_urls` + `get_feature` (drop the view_name param)**

These currently take a `view_name` from `FEATURE_POST`/`IMAGE_POST`. Repoint to gold tables and drop the view arg. Replace both functions:
```python
def get_image_urls(vin_query: str, max_images: int = 3):
    with db_engine.connect() as con:
        rows = con.execute(
            text("""
                SELECT image_url FROM gold.vehicle_images
                WHERE vehicle_id = :vin ORDER BY image_order LIMIT :n
            """),
            {"vin": vin_query, "n": max_images},
        ).all()
    return [r[0] for r in rows if r[0]]


def get_feature(vin_query: str):
    feature = defaultdict(list)
    with db_engine.connect() as con:
        rows = con.execute(
            text("""
                SELECT feature_category, feature_name FROM gold.vehicle_features
                WHERE vehicle_id = :vin AND feature_name IS NOT NULL
            """),
            {"vin": vin_query},
        ).all()
    for cat, name in rows:
        if name not in feature[cat or "Other"]:
            feature[cat or "Other"].append(name)
    return dict(feature)
```
THEN update ALL callers of these two helpers to drop the view arg. Find every call (they pass `image_view`/`feature_view`): `get_image_urls(image_view, vin, 3)` → `get_image_urls(vin, 3)`; `get_feature(feature_view, vin)` → `get_feature(vin)`. Grep first: `grep -n "get_image_urls(\|get_feature(" chatbot_2/generate_response.py` — there are calls in `format_sql_cars`, `format_docs`, and inside spec/compare branches (~lines 328, 331, and around 625-626, 1030-1031). Also DELETE the now-unused `feature_view = os.getenv("FEATURE_POST")` / `image_view = os.getenv("IMAGE_POST")` lines at each of those call sites.

- [ ] **Step 5: Verify + commit**
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot
python -m py_compile chatbot_2/generate_response.py && echo "gen OK"
grep -nE "gold.vehicles|gold.vehicle_features|gold.vehicle_images|FEATURE_POST|IMAGE_POST|MAIN_VIEW|post.Post|core.Car| LIKE |TOP " chatbot_2/generate_response.py | head -40
```
Expected: `gen OK`; gold tables present; NO remaining `FEATURE_POST`/`IMAGE_POST`/`MAIN_VIEW`/`post.Post`/`core.Car` in the helpers (analytics handled in Task 4 — those star-schema refs are allowed to remain until then; note them). If `get_image_urls`/`get_feature` callers still pass a view arg, fix them.
```bash
git add chatbot_2/generate_response.py
git commit -m "feat(chatbot_2): rewrite SQL helpers (search/avg_price/feature/images) to gold.*

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Rewrite the analytics queries to gold.*

**Files:** Modify `chatbot_2/generate_response.py` (the `analytics_retrieve` node, ~lines 703-1000)

- [ ] **Step 1: Rewrite each analytics query (de-JOIN to gold.vehicles)**

In `analytics_retrieve`, replace the six star-schema queries with single-table gold.vehicles equivalents (`TOP n`→`LIMIT n`, JOINs removed, `c.car_name`→`car_name`, `b.brand`→`brand`, `p.*`→bare). Read the function to get the exact dict keys and surrounding Python, then replace the SQL text of each:

`brand_top_sellers`:
```sql
SELECT car_name, COUNT(vin) AS total_listings,
       MAX(car_rating) AS car_rating, MAX(percentage_recommend) AS percentage_recommend
FROM gold.vehicles WHERE brand = :brand
GROUP BY car_name ORDER BY total_listings DESC, car_rating DESC LIMIT 10
```
`brand_price_stats`:
```sql
SELECT AVG(price) AS avg_price, MIN(price) AS min_price, MAX(price) AS max_price,
       COUNT(DISTINCT vin) AS total
FROM gold.vehicles WHERE brand = :brand AND price IS NOT NULL AND price > 0
```
`brand_fuel_types`:
```sql
SELECT fuel_type, COUNT(vin) AS total FROM gold.vehicles
WHERE brand = :brand AND fuel_type IS NOT NULL
GROUP BY fuel_type ORDER BY total DESC
```
`brand_top_rated`:
```sql
SELECT car_name, MAX(car_rating) AS car_rating, MAX(percentage_recommend) AS percentage_recommend
FROM gold.vehicles WHERE brand = :brand AND car_rating IS NOT NULL
GROUP BY car_name ORDER BY car_rating DESC, percentage_recommend DESC LIMIT 10
```
`model_top_sellers` (when a model is given):
```sql
SELECT title, price, mileage, new_used AS status, fuel_type, vehicle_url AS post_link
FROM gold.vehicles
WHERE brand = :brand AND car_name ILIKE :model
ORDER BY price ASC LIMIT 10
```
`brand_top_features` (uses gold.vehicle_features joined to gold.vehicles for the brand):
```sql
SELECT vf.feature_name, vf.feature_category AS feature_type_name, COUNT(DISTINCT vf.vehicle_id) AS total
FROM gold.vehicle_features vf
JOIN gold.vehicles v ON v.vehicle_id = vf.vehicle_id
WHERE v.brand = :brand
GROUP BY vf.feature_name, vf.feature_category
ORDER BY total DESC LIMIT 15
```
Keep the surrounding Python (the `queries[...] = text(...)` dict, params, result handling) intact — only swap the SQL strings. Match the result column NAMES the downstream code reads (e.g. `total_listings`, `avg_price`, `feature_name`, `feature_type_name`) — the aliases above preserve them. If `model_top_sellers` had a `:model` param as `f"%{model}%"`, keep that param binding.

- [ ] **Step 2: Verify + commit**
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot
python -m py_compile chatbot_2/generate_response.py && echo "gen OK"
grep -niE "post.Post|core.Car|core.Brand|lookup\.|feature.Feature|TOP [0-9]| LIKE " chatbot_2/generate_response.py || echo "no SQL-Server syntax remains"
git add chatbot_2/generate_response.py
git commit -m "feat(chatbot_2): rewrite analytics queries to gold.* (de-JOIN, LIMIT, ILIKE)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: `gen OK`; the grep prints `no SQL-Server syntax remains` (all `post.Post`/`core.*`/`lookup.*`/`TOP n`/`LIKE` gone). If any remain, fix them.

---

## Task 5: User runs ingest + smoke-tests SQL (USER runs)

**Files:** none.

- [ ] **Step 1: Install deps + set env (user machine)**
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot/chatbot_2
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export WAREHOUSE_DSN='postgresql://admin:admin123@104.155.166.86:5432/car_recsys?sslmode=require'
export QDRANT_URL='https://ace7f34a-eb29-4ae5-9454-707191cc9612.us-east4-0.gcp.cloud.qdrant.io:6333'
export QDRANT_API_KEY='<qdrant key>'
export OPENAI_API_KEY='<openai key>'
```

- [ ] **Step 2: Run the ingest**
```bash
python ingest_database.py
```
Expected: prints loaded vehicles (~5337), split into N chunks, `added .../...`, `ingest complete`. Then verify the new collection:
```bash
curl -s "$QDRANT_URL/collections/car_vectorize" -H "api-key: $QDRANT_API_KEY" \
  | python3 -c "import sys,json;print('points:',json.load(sys.stdin)['result']['points_count'])"
```
Expected: `points:` > 5337 (chunks > vehicles).

- [ ] **Step 3: Smoke-test the rewritten SQL + vector search**
```bash
python - <<'PY'
import os
from chatbot_2.generate_response import sql_search_cars, get_avg_price, get_feature, get_image_urls
print("search Toyota:", len(sql_search_cars(brand="Toyota", limit=3)), "rows")
print("avg Toyota Camry:", get_avg_price(brand="Toyota", model="Camry"))
rows = sql_search_cars(brand="Toyota", limit=1)
vin = rows[0]["VIN"]
print("features:", list(get_feature(vin).keys())[:3])
print("images:", get_image_urls(vin, 2))
PY
```
Expected: search returns rows; avg returns avg/min/max/total; features returns categories; images returns urls (or empty list if none). No SQL errors. (Run from the repo root so `chatbot_2` imports resolve, or adjust import to `from generate_response import ...` inside chatbot_2 with PYTHONPATH=.)

- [ ] **Step 4: Report**
If ingest populates `car_vectorize` and the SQL smoke-test returns rows with no errors, sub-1 is done. Paste any SQL error (the controller fixes the query). This unblocks sub-2 (wire the graph with this Qdrant store + AlloyDB).

---

## Self-Review Notes
- **Spec coverage:** Qdrant ingest (gold.vehicles+features → chunked → `car_vectorize`, QdrantVectorStore, text-embedding-3-large) → Task 2; SQL rewrite of sql_search_cars/get_avg_price/get_feature/get_image_urls → Task 3; analytics 6 queries → Task 4; deps → Task 1; verify (ingest points, SQL rows, no SQL-Server syntax) → Task 5 + grep gates. All spec items mapped.
- **Placeholder scan:** No TBD. Every SQL rewrite is given as concrete SQL with the verified gold columns. The only `<...>` are user secrets (Task 5 keys). Task 3 Step 4 / Task 4 Step 1 say "read the function to get exact surrounding Python then swap the SQL" — this is precise (swap SQL strings, preserve result-key names which the given aliases match), not hand-waving, because the downstream Python that consumes these results is large and unchanged.
- **Type consistency:** column aliases preserve the names downstream code reads (`VIN`, `post_link`, `total_listings`, `avg_price`, `feature_name`, `feature_type_name`, `avg_price/min_price/max_price/total`). `get_feature`/`get_image_urls` signatures drop the view arg consistently AND Task 3 Step 4 updates all call sites. `COLLECTION_NAME` = `car_vectorize` in ingest matches the spec; sub-2 will point the graph's QdrantVectorStore at the same name. DSN env `WAREHOUSE_DSN`/`DATABASE_URL` consistent between ingest and generate_response.
- **No test runner** — verify is py_compile + grep here; real ingest + SQL smoke-test is user-run (Task 5), the correct gate for cloud-DB data work.
