# Deploy Web to GCP Cloud Run — Design

**Date:** 2026-05-31
**Status:** Approved (design), pending implementation

## Problem

The web (Vite+React frontend + FastAPI backend) runs only locally. Data/pipeline
already moved to cloud (Cloud SQL, Qdrant Cloud, Temporal Cloud, GCE VM worker).
Goal: host frontend + backend on GCP so external users can access via a public
URL, on the same project `cobalt-bond-494609-a6`.

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Compute | **2 Cloud Run services** — frontend (nginx static) + backend (FastAPI) |
| Domain | Default `*.run.app` (free, HTTPS built-in) |
| FE→BE | Separate services; frontend built with `VITE_API_URL=<backend run.app URL>`; backend CORS allows the frontend origin |
| BE→Cloud SQL | **Cloud SQL Connector** (unix socket via `--add-cloudsql-instances`), no public IP / authorized network |
| BE→Qdrant | Qdrant Cloud URL + **api_key** (code currently omits it) |
| Redis | **Dropped** — backend declares `REDIS_URL` but no code actually connects Redis |
| Scope | Deploy + fix only the deploy-blocking bugs (Qdrant key, DB socket, PORT, CORS) |

## Architecture

```
                    Internet (external users)
                          │ HTTPS
          ┌───────────────┴────────────────┐
          ▼                                 ▼
 frontend (Cloud Run)             backend (Cloud Run)
 nginx serves Vite build          FastAPI on $PORT (8080)
 https://frontend-*.run.app       https://backend-*.run.app
 built w/ VITE_API_URL ──CORS────►  │
                                    ├─► Cloud SQL  (Cloud SQL Connector, unix socket
                                    │     /cloudsql/cobalt-bond-494609-a6:us-central1:free-trial-first-project)
                                    ├─► Qdrant Cloud (URL + api_key)
                                    └─► OpenAI API
```

Region: `us-central1` (same as Cloud SQL → low latency).

## Code changes (deploy-blocking)

### 1. Qdrant api_key (Qdrant Cloud requires auth)
Both spots create `QdrantClient(url=settings.QDRANT_URL)` with no api_key:
- `backend/app/api/v1/recommendations.py:42` (VectorRecaller's client)
- `backend/app/services/chatbot/core.py:121`

Fix: add `QDRANT_API_KEY` to `config.py`; pass `api_key=settings.QDRANT_API_KEY or None`
to both `QdrantClient(...)` calls. (None for local self-host, key for Cloud.)

### 2. DATABASE_URL for Cloud SQL Connector (unix socket)
`database.py` uses sync `create_engine(settings.DATABASE_URL)`. Cloud SQL Connector
exposes a unix socket at `/cloudsql/<INSTANCE_CONNECTION_NAME>`. The DSN form:
```
postgresql+psycopg2://admin:PASS@/car_recsys?host=/cloudsql/cobalt-bond-494609-a6:us-central1:free-trial-first-project
```
No code change needed if `DATABASE_URL` env carries this — `create_engine` accepts
it. Just set the env at deploy. (Local keeps the `@localhost:5432` form.)

### 3. PORT (Cloud Run injects $PORT, default 8080)
Backend Dockerfile must `exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}`.
Current Dockerfile has no explicit CMD with $PORT — add it.

### 4. CORS (already wired, just configure)
`main.py` uses `allow_origins=["*"]` only when `ENVIRONMENT=="development"`, else
`settings.BACKEND_CORS_ORIGINS`. Circular dependency (frontend build needs backend
URL; backend CORS needs frontend URL) is resolved by the deploy order in the next
section: backend goes up first WITHOUT setting ENVIRONMENT=production (so CORS stays
`*` during bring-up), then after the frontend URL is known, set
`ENVIRONMENT=production` + `BACKEND_CORS_ORIGINS=<frontend URL>` and redeploy.

## Production Dockerfiles

### Backend (`car-recsys-system/backend/Dockerfile`)
Add a production CMD (listen $PORT). Keep slim python base. No code mount.
```dockerfile
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

### Frontend (`car-recsys-system/frontend/Dockerfile`) — rewrite to multi-stage nginx
Current Dockerfile runs `vite` dev. Replace with build + nginx serve (nginx.conf
already exists). `VITE_API_URL` is a **build arg** (Vite inlines env at build time).
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* ./
RUN npm ci || npm install
COPY . .
ARG VITE_API_URL
RUN VITE_API_URL=$VITE_API_URL npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```
nginx.conf currently `listen 3000` → change to `listen 8080` (Cloud Run $PORT). Or
template it; simplest is hardcode 8080.

## Deploy flow

```
1. Code fixes (Qdrant key) + Dockerfile updates + nginx port → commit.
2. Build & push backend image to Artifact Registry (reuse car-recsys repo).
3. Deploy BACKEND:
   gcloud run deploy car-backend --image ... --region us-central1 \
     --add-cloudsql-instances cobalt-bond-494609-a6:us-central1:free-trial-first-project \
     --set-env-vars ENVIRONMENT=production,QDRANT_URL=...,QDRANT_COLLECTION=...,DATABASE_URL=... \
     --set-secrets OPENAI_API_KEY=...,QDRANT_API_KEY=...,DB password via Secret Manager \
     --allow-unauthenticated
   → capture backend URL.
4. Build FRONTEND image with --build-arg VITE_API_URL=<backend URL>, push.
5. Deploy FRONTEND: gcloud run deploy car-frontend --image ... --allow-unauthenticated.
   → capture frontend URL.
6. Update backend BACKEND_CORS_ORIGINS to the frontend URL, redeploy (or re-set-env).
7. Open frontend URL → verify external access (search/reco/chat).
```

## Secrets

DB password, OpenAI key, Qdrant key → **Secret Manager** (not plain --set-env-vars).
Grant the Cloud Run service account `roles/secretmanager.secretAccessor`. Non-secret
config (QDRANT_URL, collection, ENVIRONMENT) can be plain env vars.

## Out of scope (YAGNI)

- Custom domain (using *.run.app).
- Redis / Memorystore (no real Redis usage).
- CI/CD pipeline (manual gcloud deploy for now).
- Autoscaling tuning (Cloud Run defaults fine for low traffic).
- Async SQLAlchemy migration (sync works on Cloud Run; revisit only if load issues).

## Verification

1. **Backend health** — `curl https://car-backend-*.run.app/docs` (Swagger loads).
2. **DB** — `/api/v1/listings?limit=5` returns vehicles from Cloud SQL (5318 backfilled).
3. **Reco** — `/api/v1/reco/popular` returns results.
4. **Chatbot** — `/api/v1/chat/...` returns grounded answer (Qdrant Cloud reachable
   with api_key; needs embeddings present — may be empty until embed runs).
5. **Frontend** — open frontend URL in a browser on another network/device →
   pages load, API calls succeed (no CORS error in console).
6. **External access** — share frontend URL, confirm a non-dev machine can use it.
