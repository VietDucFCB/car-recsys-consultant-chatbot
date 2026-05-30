# Architecture Diagrams

Sơ đồ kiến trúc Car Recommendation System.

> **Nên dùng [diagrams.md](diagrams.md)** — bản **Mermaid**, render trực tiếp trên GitHub
> với đầy đủ label + màu. (Bản Excalidraw bên dưới đẹp khi vẽ interactive nhưng export ra
> link bị mất chữ trong shape — chỉ dùng nếu bạn muốn chỉnh layout thủ công.)

| # | Diagram | Mermaid (khuyến nghị) | Excalidraw (interactive) |
|---|---------|----------------------|--------------------------|
| 1 | Kiến trúc tổng thể | [diagrams.md](diagrams.md#1-kiến-trúc-tổng-thể) | [mở](https://excalidraw.com/#json=iPcpKCC70WF8Y6_n24v7Z,lpdv-TKixS6fvZYP6wO3YQ) |
| 2 | Temporal pipeline | [diagrams.md](diagrams.md#2-temporal-pipeline--weeklypipeline) | [mở](https://excalidraw.com/#json=IC_mqEJKI8Gut7J42THkk,xf2H9jeExFxfRPqzQH2d9Q) |
| 3 | dbt medallion | [diagrams.md](diagrams.md#3-dbt-medallion--data-flow) | [mở](https://excalidraw.com/#json=AiuvjKRya8WtA_Tlw92bL,y7US-pb8T_jEMOYanLPOkA) |
| 4 | Recommendation + Chatbot | [diagrams.md](diagrams.md#4-recommendation-engine-multi-stage-hybrid) | [mở](https://excalidraw.com/#json=YoSxOwwzeW9Ki893pZ6Pq,Y1O-jcWr48JT1wyCY-RfhA) |

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
