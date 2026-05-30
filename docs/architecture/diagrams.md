# Architecture Diagrams (Mermaid)

Các sơ đồ dưới đây dùng **Mermaid** — render trực tiếp trên GitHub, [mermaid.live](https://mermaid.live),
VSCode (extension *Markdown Preview Mermaid*), hoặc Notion. Đã verify render ra SVG hợp lệ.

> Muốn có logo Docker/Postgres/Temporal nhúng trong chart? Mermaid hỗ trợ qua
> `@{ icon: "logos:postgresql" }` (v11.3+) **nhưng chỉ hiển thị trên trình render bật
> *iconify*** (mermaid.live) — GitHub README sẽ hiện dấu `?`. Vì vậy các diagram dưới
> dùng **màu + label** để render đẹp ở mọi nơi.

---

## 1. Kiến trúc tổng thể

```mermaid
flowchart TB
  subgraph HOST["🖥️ HOST (./run_worker.sh)"]
    direction LR
    carscom["cars.com"]:::ext
    crawlw["crawler worker<br/>Chrome + Xvfb"]:::host
    carscom -->|crawl| crawlw
  end

  gcs["GCS bronze<br/>gs://incremental_raw/dt=YYYY-MM-DD/"]:::store

  subgraph DOCKER["🐳 DOCKER (docker compose up)"]
    temporal["Temporal<br/>server :7233 · UI :8233"]:::orch
    pworker["pipeline-worker<br/>load_bronze · dbt · refresh · embed"]:::orch
    subgraph PG["🐘 PostgreSQL :5432"]
      bronze["bronze<br/>raw_listings (JSONB)"]:::bronze
      silver["silver<br/>dim/fct/bridge (3NF)"]:::silver
      gold["gold<br/>vehicles · marts · matviews"]:::gold
      bronze --> silver --> gold
    end
    qdrant["Qdrant :6333"]:::vec
    redis["Redis :6379"]:::cache
    backend["backend :8000 (FastAPI)<br/>reco + chatbot"]:::api
    temporal -->|tasks| pworker
    pworker -->|dbt| bronze
    pworker -->|embed| qdrant
    gold -->|read| backend
    backend -.->|vector| qdrant
    backend -.-> redis
  end

  frontend["frontend :3000<br/>Vite + React (host npm)"]:::ui

  crawlw -->|upload| gcs
  gcs -->|read dt=| bronze
  backend <-->|/api| frontend

  classDef ext fill:#ffd8a8,stroke:#f59e0b,color:#000
  classDef host fill:#a5d8ff,stroke:#4a9eed,color:#000
  classDef store fill:#c3fae8,stroke:#06b6d4,color:#000
  classDef orch fill:#d0bfff,stroke:#8b5cf6,color:#000
  classDef bronze fill:#ffd8a8,stroke:#f59e0b,color:#000
  classDef silver fill:#a5d8ff,stroke:#4a9eed,color:#000
  classDef gold fill:#b2f2bb,stroke:#22c55e,color:#000
  classDef vec fill:#eebefa,stroke:#ec4899,color:#000
  classDef cache fill:#ffc9c9,stroke:#ef4444,color:#000
  classDef api fill:#a5d8ff,stroke:#4a9eed,color:#000
  classDef ui fill:#fff3bf,stroke:#f59e0b,color:#000
```

---

## 2. Temporal pipeline — WeeklyPipeline

```mermaid
flowchart TB
  sched{{"Schedule<br/>cron Mon 02:00"}}:::sched
  parent["WeeklyPipeline<br/>(parent workflow)"]:::orch
  sched -->|fire| parent

  subgraph CHAIN["fail-stop chain (bước fail → dừng cả chain)"]
    crawl["1. WeeklyCrawl<br/>queue: car-crawler-tq · HOST"]:::host
    transform["2. Transform<br/>queue: car-pipeline-tq · DOCKER"]:::gold
    ml["3. ML<br/>queue: car-pipeline-tq · DOCKER"]:::vec
    crawl -->|ok| transform -->|ok| ml
  end
  parent -->|child| crawl

  crawl --- crawlsteps["crawl_links → scrape_details → upload_gcs<br/>(dt=YYYY-MM-DD/ on GCS)"]:::note
  transform --- transteps["load_bronze → ensure_partition →<br/>dbt_build → refresh_matviews"]:::note
  ml --- mlsteps["compute_item_similarity ∥<br/>embed_vehicles → Qdrant"]:::note

  classDef sched fill:#fff3bf,stroke:#f59e0b,color:#000
  classDef orch fill:#d0bfff,stroke:#8b5cf6,color:#000
  classDef host fill:#a5d8ff,stroke:#4a9eed,color:#000
  classDef gold fill:#b2f2bb,stroke:#22c55e,color:#000
  classDef vec fill:#eebefa,stroke:#ec4899,color:#000
  classDef note fill:#f8f9fa,stroke:#adb5bd,color:#000
```

---

## 3. dbt medallion — data flow

```mermaid
flowchart TB
  bronze["bronze.raw_listings<br/>JSONB landing · idempotent (file_hash)"]:::bronze
  stg["staging (views)<br/>stg_raw_latest (DISTINCT ON vin) → stg_listings (parse)"]:::stg
  bronze -->|dedup VIN| stg

  subgraph SILVER["SILVER (3NF tables)"]
    fct["fct_listing<br/>incremental delete+insert"]:::silver
    dims["dim_car_model · dim_seller<br/>dim_feature · bridge_listing_feature"]:::silver
  end
  stg --> fct

  subgraph GOLD["GOLD (app marts)"]
    vehicles["vehicles — MERGE by VIN (current)<br/>source · first_seen · last_updated"]:::gold
    pricehist["vehicle_price_history<br/>change-events · partition by day"]:::bronze
    goldrest["car_models · sellers · reviews<br/>features/images · matviews"]:::store
  end
  fct -->|dbt| vehicles
  fct -->|dbt| pricehist
  vehicles --> goldrest

  goldrest -->|read| consumers["backend reco/chatbot · embed → Qdrant"]:::api

  classDef bronze fill:#ffd8a8,stroke:#f59e0b,color:#000
  classDef stg fill:#fff3bf,stroke:#f59e0b,color:#000
  classDef silver fill:#a5d8ff,stroke:#4a9eed,color:#000
  classDef gold fill:#b2f2bb,stroke:#22c55e,color:#000
  classDef store fill:#c3fae8,stroke:#06b6d4,color:#000
  classDef api fill:#a5d8ff,stroke:#4a9eed,color:#000
```

---

## 4. Recommendation engine (multi-stage hybrid)

```mermaid
flowchart LR
  subgraph RECALL["Candidate generation"]
    collab["Collaborative<br/>(gold.item_similarity)"]:::recall
    content["Content<br/>(brand/price/fuel)"]:::recall
    vector["Vector (Qdrant)"]:::recall
    pop["Popularity (matview)"]:::recall
  end
  ranker["WeightedLinearRanker"]:::rank
  mmr["MMR Reranker<br/>(diversity)"]:::rank
  topk["top-K<br/>recommendations"]:::out

  collab --> ranker
  content --> ranker
  vector --> ranker
  pop --> ranker
  ranker -->|rank| mmr -->|re-rank| topk

  classDef recall fill:#d0bfff,stroke:#8b5cf6,color:#000
  classDef rank fill:#ffd8a8,stroke:#f59e0b,color:#000
  classDef out fill:#b2f2bb,stroke:#22c55e,color:#000
```

---

## 5. Chatbot — RAG hybrid retrieval

```mermaid
flowchart LR
  umsg["user message"]:::host
  parser["query_parser<br/>(hard constraints)"]:::rank
  sql["SQL filter<br/>gold.vehicles WHERE"]:::gold
  vec["Qdrant vector<br/>(payload filter)"]:::vec
  rrf["RRF fusion<br/>(merge ranks)"]:::rank
  gen["gpt-4o-mini<br/>grounded · cite VIN"]:::orch

  umsg --> parser
  parser --> sql
  parser --> vec
  sql --> rrf
  vec --> rrf
  rrf --> gen

  classDef host fill:#a5d8ff,stroke:#4a9eed,color:#000
  classDef rank fill:#fff3bf,stroke:#f59e0b,color:#000
  classDef gold fill:#b2f2bb,stroke:#22c55e,color:#000
  classDef vec fill:#eebefa,stroke:#ec4899,color:#000
  classDef orch fill:#d0bfff,stroke:#8b5cf6,color:#000
```
