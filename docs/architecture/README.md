# Architecture Diagrams

Sơ đồ kiến trúc Car Recommendation System (vẽ bằng Excalidraw). Click link để mở,
chỉnh sửa hoặc export ảnh.

| # | Diagram | Mở Excalidraw |
|---|---------|---------------|
| 1 | **Kiến trúc tổng thể** — host crawler + Docker stack + data flow | [mở](https://excalidraw.com/#json=iPcpKCC70WF8Y6_n24v7Z,lpdv-TKixS6fvZYP6wO3YQ) |
| 2 | **Temporal pipeline** — WeeklyPipeline chain crawl→transform→ml | [mở](https://excalidraw.com/#json=IC_mqEJKI8Gut7J42THkk,xf2H9jeExFxfRPqzQH2d9Q) |
| 3 | **dbt medallion** — bronze → silver (3NF) → gold (marts) | [mở](https://excalidraw.com/#json=AiuvjKRya8WtA_Tlw92bL,y7US-pb8T_jEMOYanLPOkA) |
| 4 | **Recommendation + Chatbot** — multi-stage hybrid + RAG hybrid | [mở](https://excalidraw.com/#json=YoSxOwwzeW9Ki893pZ6Pq,Y1O-jcWr48JT1wyCY-RfhA) |

---

## 1. Kiến trúc tổng thể

```
HOST    cars.com ──► crawler worker (Chrome+Xvfb) ──► GCS bronze (dt=YYYY-MM-DD/)
DOCKER  Temporal (7233/8233) ──► pipeline-worker ──► PostgreSQL bronze→silver→gold
                                                  └─► Qdrant (embed) · Redis
        backend (8000) đọc gold + Qdrant ──► /api ──► frontend (3000, host npm)
```

- **2 worker**: crawl chạy host (cars.com cần Chrome thật); transform/ml chạy Docker.
- Mọi service trong `docker compose up`; chỉ crawler + frontend chạy host.

## 2. Temporal pipeline (WeeklyPipeline)

1 schedule cron `Mon 02:00` → workflow cha `WeeklyPipeline` chạy 3 child **fail-stop**:
`WeeklyCrawl` (car-crawler-tq, host) → `Transform` (car-pipeline-tq) → `ML` (car-pipeline-tq).
Bước nào fail thì dừng cả chain. Đăng ký schedule 1 lần, Temporal tự chạy mãi.

## 3. dbt medallion

```
bronze.raw_listings (JSONB, idempotent file_hash)
  → staging stg_raw_latest (DISTINCT ON vin) → stg_listings (parse)
  → silver  fct_listing (incremental delete+insert) · dim_* · bridge
  → gold    vehicles (MERGE by VIN) · vehicle_price_history (partition by day)
            car_models · sellers · reviews · features · images · matviews
```

## 4. Recommendation + Chatbot

**Reco** — 4 recaller (Collaborative/Content/Vector/Popularity) → WeightedLinearRanker
→ MMRReranker → top-K.

**Chatbot** — user → query_parser → (SQL filter gold.vehicles ∥ Qdrant vector) →
RRF fusion → gpt-4o-mini grounded (cite VIN).

---

> **Cập nhật diagram**: mở link Excalidraw, sửa, rồi `File → Save to...` hoặc export lại.
> Các link trên là snapshot trên excalidraw.com (public, ai có link đều xem được).
