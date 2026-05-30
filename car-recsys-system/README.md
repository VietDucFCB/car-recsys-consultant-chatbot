# 🚗 Car Recommendation System

Nền tảng gợi ý xe end-to-end: **crawl → transform → recommend → chatbot**, dựng trên
kiến trúc medallion (bronze/silver/gold) với pipeline tự động hoá bằng **Temporal**.

- **Data pipeline** — crawl cars.com (host, Chrome+Xvfb) → GCS bronze → dbt silver/gold → ML.
- **Recommendation** — multi-stage hybrid: candidate generation → ranking → MMR re-rank.
- **Chatbot** — RAG hybrid (SQL constraints + Qdrant vector + RRF fusion) trên OpenAI.
- **Orchestration** — Temporal self-host, 1 schedule weekly chạy chain crawl→transform→ml.

> Kiến trúc chi tiết (Excalidraw): xem [docs/architecture/](../docs/architecture/).

---

## Service ports

| Service       | Port | URL / mô tả                          |
|---------------|------|--------------------------------------|
| Frontend      | 3000 | Vite + React (chạy host: `npm run dev`) |
| Backend API   | 8000 | FastAPI — http://localhost:8000/docs |
| PostgreSQL    | 5432 | Warehouse (bronze/silver/gold) + Temporal DBs |
| PostgREST     | 3001 | REST tự sinh từ Postgres             |
| Qdrant        | 6333 | Vector DB (chatbot + reco)           |
| Redis         | 6379 | Cache                                |
| Temporal      | 7233 | gRPC — worker + scripts connect      |
| Temporal UI   | 8233 | http://localhost:8233 — workflows, schedules |
| Bytebase      | 8080 | DB browser (opt-in: `--profile tools`) |

Mặc định `admin` / `admin123`, database `car_recsys`.

---

## Kiến trúc tổng thể

```
                         ┌─────────────────── HOST ───────────────────┐
  cars.com ──crawl──►    │ crawler worker (Chrome+Xvfb)  ./run_worker.sh│
                         └──────────────┬──────────────────────────────┘
                                        │ upload dt=YYYY-MM-DD/
                                        ▼
                            gs://incremental_raw/   (GCS bronze, date-partitioned)
                                        │
   ┌──────────────────────── DOCKER (docker compose up) ───────────────────────┐
   │  Temporal (7233) + UI (8233)   ── orchestrate ──►  pipeline-worker         │
   │       │                                              │ load_bronze         │
   │       │ schedule weekly                              │ dbt build           │
   │       ▼                                              │ refresh matviews    │
   │  WeeklyPipeline: crawl → transform → ml              │ embed → Qdrant      │
   │                                                      ▼                     │
   │  PostgreSQL  bronze.raw_listings → silver.* → gold.*  ◄── dbt              │
   │       ▲                                              │                     │
   │       │                                              ▼                     │
   │  backend (8000) ── reco + chatbot ──►  Qdrant (6333) · Redis (6379)        │
   └──────────────────────────────────┬────────────────────────────────────────┘
                                       │ /api
                          frontend (3000, host npm run dev)
```

---

## Data pipeline (Temporal)

Ba workflow, gom trong **một** workflow cha `WeeklyPipeline` chạy theo lịch:

| Workflow | Task queue | Worker | Các bước |
|----------|-----------|--------|----------|
| `WeeklyCrawl` | `car-crawler-tq` | **host** (Chrome) | crawl_links → scrape_details → upload_gcs |
| `Transform`   | `car-pipeline-tq` | Docker | load_bronze → ensure_partition → dbt_build → refresh_matviews |
| `ML`          | `car-pipeline-tq` | Docker | compute_item_similarity ∥ embed_vehicles |
| `WeeklyPipeline` | `car-pipeline-tq` | Docker | crawl → transform → ml (fail-stop chain) |

- **2 worker**: crawl chạy host (cars.com cần Chrome thật bypass Cloudflare); transform/ml
  chạy Docker (`pipeline-worker`, luôn online).
- **Incremental**: mỗi run dùng `crawl_date`; GCS lưu `dt=YYYY-MM-DD/`, `load_bronze` chỉ
  đọc đúng ngày đó (không quét full bucket).
- **Schedule**: 1 cron `Mon 02:00` (đăng ký 1 lần) → Temporal tự chạy mãi.

### dbt medallion

```
bronze.raw_listings  (JSONB landing, append-only, idempotent qua file_hash)
        │ staging: stg_raw_latest (DISTINCT ON vin) → stg_listings (parse) → stg_*
        ▼
silver  dim_car_model · dim_seller · dim_feature · dim_listing_image
        fct_listing (incremental delete+insert) · fct_model_rating · fct_model_review
        bridge_listing_feature
        ▼
gold    vehicles (merge by VIN — current state, first/last seen)
        vehicle_price_history (change-event log, partition by day)
        car_models · sellers · reviews · vehicle_features · vehicle_images
        + matviews: mv_popular_vehicles · mv_trending_models
```

**Idempotency**: bronze dedup theo `file_hash`; gold.vehicles upsert theo VIN; embeddings
upsert theo `point_id = uuid5(vin)` → không trùng vector.

---

## Recommendation (multi-stage hybrid)

`backend/app/services/reco/` — candidate generation → ranking → re-rank:

```
4 Recallers ──► WeightedLinearRanker ──► MMRReranker ──► top-K
  CollaborativeRecaller   (gold.item_similarity — CF precomputed)
  ContentRecaller         (brand/model/price band/fuel match)
  VectorRecaller          (Qdrant similarity on last-engaged vehicle)
  PopularityRecaller      (gold.mv_popular_vehicles — cold-start)
```

Trọng số / λ time-decay / top-k đều config-driven (`reco_config.yaml`). Guest → Popularity +
Content; authed user → cả 4 recaller blend.

---

## Chatbot (RAG hybrid)

`backend/app/services/chatbot/` — retrieval lai, bỏ ngưỡng điểm tuỳ tiện:

```
user message
  1. query_parser  → trích hard constraints (budget, brand, body, year, fuel)
  2. SQL filter    → gold.vehicles WHERE …
  3. vector search → Qdrant với payload filter (tôn trọng constraints)
  4. RRF fusion    → hợp nhất 2 ranked list (Reciprocal Rank Fusion)
  5. generation    → gpt-4o-mini grounding trên DB rows, cite VIN
```

Hội thoại lưu `gold.chat_sessions` / `gold.chat_messages`; turn cũ được summarize thay vì
cắt cứng.

---

## Khởi động (người mới)

### 0. Prerequisites
```bash
docker --version && docker compose version    # bắt buộc
node --version                                  # frontend (Node 18+)
# chỉ nếu CHẠY CRAWLER trên máy này (worker host cần Chrome):
sudo apt install -y xvfb python3-tk
google-chrome --version
gcloud auth application-default login           # để load_bronze/upload đọc-ghi GCS
```

### 1. Cấu hình secrets
```bash
cp car-recsys-system/.env.example car-recsys-system/.env
# sửa trong .env:  OPENAI_API_KEY=sk-...   SECRET_KEY=<ngẫu nhiên>
```

### 2. Lên toàn bộ backend stack — 1 lệnh
```bash
cd car-recsys-system
docker compose up -d
```
Lên: postgres · qdrant · redis · postgrest · temporal · temporal-ui · backend ·
**pipeline-worker**. (frontend + bytebase bị loại khỏi mặc định.)

### 3. Frontend (host)
```bash
cd car-recsys-system/frontend && npm install && npm run dev   # :3000
```

### 4. Đổ data
**A — đã có data trên GCS:**
```bash
cd crawler
.venv/bin/python -m temporal_app.scripts.trigger_once transform
.venv/bin/python -m temporal_app.scripts.trigger_once ml
```
**B — crawl mới (cần Chrome host):**
```bash
cd crawler && ./run_worker.sh        # giữ chạy (terminal riêng)
.venv/bin/python -m temporal_app.scripts.trigger_once pipeline
```

### 5. Bật lịch weekly (1 lần)
```bash
cd crawler
.venv/bin/python -m temporal_app.scripts.create_schedule
# cron Mon 02:00 → Temporal tự chạy crawl→transform→ml mãi mãi
```

---

## Lưu ý quan trọng

1. **Crawler chạy HOST, không Docker** — cars.com Cloudflare Turnstile cần Chrome+Xvfb thật
   (đã verify Docker không bypass được). Mọi thứ khác chạy Docker.
2. **Sửa dbt model → rebuild image** — pipeline-worker bake sẵn dbt project:
   `docker build -f crawler/Dockerfile.pipeline -t car-pipeline-worker:latest .` rồi
   `docker compose up -d --force-recreate pipeline-worker`.
3. **OPENAI_API_KEY thiếu** → chatbot + bước `embed_vehicles` skip (không lỗi, không vector).
4. **Schedule cron crawl** chỉ chạy khi crawler worker host online lúc đó; transform/ml
   (Docker) thì luôn tự động.

---

## Lệnh vận hành

```bash
docker compose ps                              # trạng thái services
docker compose logs -f pipeline-worker         # log transform/ml
docker compose logs -f temporal                # log Temporal server
docker compose exec postgres psql -U admin -d car_recsys   # psql

# dbt thủ công (qua image, mount dbt dir):
docker run --rm -v "$PWD/dbt:/app/dbt" \
  -e DBT_PG_HOST=x -e DBT_PG_USER=admin -e DBT_PG_PASSWORD=admin123 -e DBT_PG_DBNAME=car_recsys \
  car-pipeline-worker:latest dbt parse --profiles-dir /app/dbt --project-dir /app/dbt

# xem schedule:
docker compose exec temporal tctl --address temporal:7233 --namespace default schedule list

# bật DB browser (Bytebase):
docker compose --profile tools up -d bytebase   # http://localhost:8080
```
