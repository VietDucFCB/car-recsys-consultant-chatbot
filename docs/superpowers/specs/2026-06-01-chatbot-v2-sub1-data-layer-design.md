# Chatbot v2 Integration — Sub-project 1: Data Layer — Design

**Date:** 2026-06-01
**Status:** Approved (design), pending plan.
**Parent:** `docs/superpowers/specs/2026-06-01-chatbot-v2-integration-overview.md`

## Problem

chatbot_2's agentic graph (`generate_response.py`) needs two data sources that currently
point at the teammate's LOCAL setup: a **ChromaDB** vector store and a **SQL Server star
schema** (`post.Post` / `core.Car` / `core.Brand` / `lookup.*` via `DB_CONNECTION_STRING`).
Before the graph can run in the real system, the data layer must be re-pointed:
- **Vector:** ingest chatbot_2-style documents into **Qdrant Cloud** (new collection).
- **SQL:** rewrite every query (`sql_search_cars`, `get_avg_price`, `get_feature`,
  `get_image_urls`, analytics branch) to **Postgres `gold.*`** on AlloyDB.

This sub-project delivers ONLY the data layer; the graph/route/UI come in sub-2/3.

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Vector store | **Qdrant Cloud**, LangChain `QdrantVectorStore`, **new collection `car_vectorize`** (separate from `car_chatbot_vectors`, which the recommender's VectorRecaller keeps). |
| Document granularity | **Chunked** (`RecursiveCharacterTextSplitter(chunk_size=250, overlap=30)`), uuid4 point ids — matches chatbot_2's retrieval expectations (multiple vectors per car). |
| Embedding model | `text-embedding-3-large` (3072 dim) — already used system-wide, compatible. |
| SQL target | **`gold.vehicles`** (denormalized — carries every field chatbot_2 JOINed) + `gold.vehicle_features` + `gold.reviews`/`gold.vehicle_images` as needed. **De-JOIN**, `TOP n`→`LIMIT n`, SQL-Server `LIKE`→Postgres `ILIKE`, column renames. |
| DB connection | AlloyDB DSN (replaces `DB_CONNECTION_STRING`); drop/replace the SQL-Server view env vars (`MAIN_VIEW`/`FEATURE_POST`/`IMAGE_POST`/`MAIN_POST`) with gold table references. |

## Architecture / Components

Work lands in `chatbot_2/` for now (sub-2 moves the graph into the backend). Two units:

### 1. Qdrant ingest (rewrite `chatbot_2/ingest_database.py`)
- Read from AlloyDB `gold.vehicles` (+ `gold.vehicle_features` for the features dict), not
  the SQL-Server view. Build the SAME page_content shape chatbot_2 uses (status/title/brand/
  interior_color/exterior_color/drivetrain/fuel_type/transmission/engine/features) and the
  SAME metadata keys (VIN, Price, Monthly Payment, Mileage, MPG, Post Link, Status, Title,
  Brand, colors, Drivetrain, Fuel Type, Transmission, Engine) — mapping gold columns:
  `vin`→VIN, `new_used`→status, `vehicle_url`→Post Link, `monthly_payment`, `mileage`, `mpg`,
  etc. (Features come from `gold.vehicle_features` grouped by feature category, mirroring the
  old `feature_type → [feature_name]` dict.)
- Chunk with `RecursiveCharacterTextSplitter(250, 30)`; upsert into Qdrant collection
  `car_vectorize` via LangChain `QdrantVectorStore` (Qdrant Cloud URL + api_key). Create the
  collection if missing (3072-dim COSINE). Batched add (uuid4 ids).
- Runnable as a script (env: AlloyDB DSN, QDRANT_URL, QDRANT_API_KEY, OPENAI_API_KEY).

### 2. SQL rewrite (in `chatbot_2/generate_response.py`)
Rewrite each SQL helper to Postgres `gold.*`. The functions and their gold mappings:
- **`sql_search_cars(brand, model, constraints, exclude_brands, limit)`** — single-table
  query on `gold.vehicles`: `WHERE title IS NOT NULL` + brand/`title ILIKE`/price range/
  `fuel_type ILIKE`/`new_used` (status)/year-in-title; `ORDER BY price ASC LIMIT :limit`.
  Select: vin, new_used, title, brand, exterior_color, interior_color, drivetrain, fuel_type,
  transmission, engine, price, monthly_payment, mileage, mpg, vehicle_url.
- **`get_avg_price(brand, model)`** — `SELECT avg(price), min(price), max(price) FROM
  gold.vehicles WHERE brand=:brand AND title ILIKE :model AND price>0`.
- **`get_feature(vin)`** — from `gold.vehicle_features WHERE vehicle_id=:vin` grouped to
  `{category: [feature_name]}` (drop the old `FEATURE_POST` view).
- **`get_image_urls(vin, n)`** — `gold.vehicle_images WHERE vehicle_id=:vin LIMIT n`, or fall
  back to `gold.vehicles.primary_image_url` if the images table isn't suitable.
- **Analytics branch (`analytics_retrieve`, ~5 queries)** — the star-schema JOINs
  (`post.Post`⋈`core.Car`⋈`core.Brand`⋈`lookup.fuel_type`) collapse to single-table
  aggregates on `gold.vehicles` (everything is one row): top models by listings, price
  stats, fuel-type distribution, top-rated models (`car_rating`,`percentage_recommend`),
  specific-model listings, feature popularity (via `gold.vehicle_features`). `TOP n`→`LIMIT n`.
- Replace the module-level `db_engine` / connection-string with an AlloyDB engine built from
  the system DSN (env). Remove SQL-Server-only syntax (`TOP`, bracketed identifiers).

## Data flow
```
AlloyDB gold.vehicles(+features/reviews/images)
  ├─(ingest_database.py)→ chunked docs → Qdrant `car_vectorize` (QdrantVectorStore, 3072-dim)
  └─(generate_response.py SQL helpers)→ rows for sql_search/analytics/spec/compare branches
```

## Out of scope (sub-1)
- Wiring the LangGraph app / `/api/v1/chat` route (sub-2).
- React UI (sub-3).
- Removing the old chatbot, adding deps to `backend/requirements.txt` (sub-2).
- Reusing `car_chatbot_vectors` (recommender keeps it).
- Persisting chat history.

## Verification
1. Run the ingest script → Qdrant collection `car_vectorize` exists with N points
   (≈ 5337 vehicles × chunks); `points_count` > 5337.
2. `QdrantVectorStore.similarity_search("reliable hybrid SUV under 30k")` returns relevant
   vehicles with metadata (VIN/Price/...).
3. Each rewritten SQL helper, run against AlloyDB with a real brand/model, returns rows:
   `sql_search_cars(brand="Toyota")` → listings; `get_avg_price(brand="Toyota", model="Camry")`
   → avg/min/max; analytics for a brand → the expected aggregate dicts; `get_feature(vin)` →
   a category→features dict; `get_image_urls(vin)` → urls.
4. No SQL-Server syntax remains (`grep -i "TOP \|post.Post\|core.Car\|core.Brand\|lookup\."`
   returns nothing in generate_response.py / ingest_database.py).
