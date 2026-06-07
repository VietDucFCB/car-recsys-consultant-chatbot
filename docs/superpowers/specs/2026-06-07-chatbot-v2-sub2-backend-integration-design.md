# Chatbot v2 Integration — Sub-project 2: Backend Integration — Design

**Date:** 2026-06-07
**Status:** Approved (design), pending plan.
**Parent:** `docs/superpowers/specs/2026-06-01-chatbot-v2-integration-overview.md`
**Depends on:** Sub-1 (data layer) — DONE. `car_vectorize` (22720 pts) + gold.* SQL helpers are live.

## Problem

chatbot_2's agentic LangGraph (in `chatbot_2/generate_response.py` + `user_profile.py`) is
data-ready (Sub-1 re-pointed it at Qdrant `car_vectorize` + AlloyDB gold.*), but it still
runs as a **standalone local FastAPI** (`chatbot_2/api_server.py`) with **file-based profile
persistence**. Sub-2 moves the graph into the **main backend** at `POST /api/v1/chat`,
replacing the old hybrid-RAG chatbot, with in-memory session state.

Two coupled findings to address here:
1. **Backend already has LangChain but old** (`langchain==0.2.16` / `langchain-core==0.2.38`);
   chatbot_2 needs **1.3.2 / core 1.4.0 / langgraph 1.2.2**. Verified: **nothing else in the
   backend imports langchain** (reco/search/etc don't) — only the chatbot — so the upgrade is
   safe, blast radius = the chatbot only.
2. **The weekly ML pipeline only refreshes `car_chatbot_vectors`** (reco's collection, 1
   vector/VIN) via `embed_vehicles`. It does **not** touch `car_vectorize` (chatbot v2's
   chunked collection), so chatbot data goes stale after each crawl. → Add a parallel
   `embed_chatbot_vehicles` activity (this spec covers it as part of the integration).

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Route | **`POST /api/v1/chat`** — `{session_id?, message, reset?}` → `{session_id, answer}`. Drop the old `/message`, `/conversations`, `/conversation/{id}`, DELETE endpoints + `gold.chat_*` persistence. Keep `GET /api/v1/chat/health`. |
| Old chatbot dir | **Delete** `backend/app/services/chatbot/` (core/retrieval/generation/memory/ingest/config/__init__) and replace with chatbot_2's `generate_response.py` + `user_profile.py`. |
| Profile + history | **In-memory** per `session_id` (dict + lock, mirroring `api_server.py`). No DB persistence. |
| LangChain version | **Upgrade** backend to langchain 1.3.2 / core 1.4.0 / langgraph 1.2.2 / langchain-qdrant / langchain-text-splitters. Safe — chatbot is the only langchain consumer. |
| Cloud Run | Deploy backend with **`--max-instances=1`** so in-memory sessions stay consistent. Add env `CHATBOT_QDRANT_COLLECTION=car_vectorize` (QDRANT_URL/API_KEY/OPENAI_API_KEY/DATABASE_URL already set). |
| Pipeline freshness | Add `embed_chatbot_vehicles` activity to `MLWorkflow`, parallel to `embed_vehicles`, re-ingesting gold.vehicles → `car_vectorize` (chunked) each week. |

## Architecture / Components

### A. Move graph into backend `app/services/chatbot/`
- Delete the 7 old files. Add `generate_response.py` + `user_profile.py` (copied from
  `chatbot_2/`, already Qdrant+gold-pointed). New `__init__.py` exposes
  `initialize_resources()` and `generate_response()`.
- `user_profile.py` → **in-memory**: replace the file-JSON `load/save/delete_profile` with a
  module-level `dict[str, UserProfile]` guarded by a lock. Same function signatures so the
  graph code is untouched. Also fix the one leftover `if feature_view:` analytics gate
  (env-less now) so the gold-based `top_features` query always runs.

### B. Rewrite `app/api/v1/chat.py`
- One model in (`ChatRequest{session_id?, message, reset?}`), one out (`ChatResponse{session_id, answer}`).
- Lazy global init of `(llm, vector_store)` via `initialize_resources()` (cached), exactly
  like `api_server.py`. In-memory `_histories: dict[str, list]` + `_lock`. `POST /api/v1/chat`:
  resolve/!create session_id → optional reset (clear history + profile) → run
  `generate_response` in a worker thread (`anyio.to_thread.run_sync`) → persist history →
  return answer. Keep `GET /health`.
- Remove the gold.chat_* SQL endpoints (conversations/messages). No other backend module
  imports the old chatbot (only docstrings), so deletion is clean.

### C. Deps + config
- `backend/requirements.txt`: bump to chatbot_2's langchain family + add `langchain-qdrant`,
  `langchain-text-splitters`, `langgraph`; keep `qdrant-client` (bump if needed). `openai`
  bump to a 1.x compatible with langchain 1.4.
- `app/core/config.py`: add `CHATBOT_QDRANT_COLLECTION` (default `car_vectorize`); the graph
  reads `QDRANT_URL`/`QDRANT_API_KEY`/`DATABASE_URL` already in env.
- Delete `chatbot_2/api_server.py` (its logic now lives in the route).

### D. ML pipeline — `embed_chatbot_vehicles` activity
- New activity in `crawler/temporal_app/activities.py` that re-ingests gold.vehicles (+
  features) → chunked docs → Qdrant `car_vectorize` (reuse the Sub-1 ingest logic; factor the
  shared builder into a `pipeline/chatbot_embeddings.py` so both the standalone script and the
  activity use it). Wire it into `MLWorkflow` parallel to `compute_item_similarity` /
  `embed_vehicles`. Skips gracefully if `QDRANT_URL`/`OPENAI_API_KEY` unset (like
  `embed_vehicles`). Rebuild + push the pipeline-worker image after.

## Data flow
```
React → POST /api/v1/chat {session_id, message}
  → chat.py → generate_response(llm, QdrantVectorStore[car_vectorize], history[sid], message, sid)
      → LangGraph: profile slot-fill (in-mem) → route_intent → {compare|analytics|spec|hybrid}
          (Qdrant car_vectorize + gold.* on AlloyDB) → answer
  → {session_id, answer}; history[sid] updated in-mem
weekly MLWorkflow → embed_chatbot_vehicles → re-ingest gold.vehicles → car_vectorize (fresh)
```

## Out of scope (sub-2)
- React wiring (Sub-3).
- Persisting history/profile to DB (in-memory only).
- Re-using `car_chatbot_vectors` for the chatbot (reco keeps it).
- Multi-instance session sharing (max-instances=1 instead).

## Verification
1. `backend` builds with upgraded langchain (no resolver conflict; reco/search still import-clean).
2. Deployed backend (max-instances=1): `POST /api/v1/chat {"message":"reliable hybrid SUV under 30k"}`
   returns a grounded answer citing real cars; a follow-up turn with the same `session_id`
   keeps context (slot-fill / no re-asking answered slots).
3. `reset:true` clears the session. `GET /api/v1/chat/health` → ready.
4. `/api/v1/listings`, `/api/v1/reco/popular`, `/api/v1/search` still 200 (no regression from
   the langchain bump or chatbot deletion).
5. Old endpoints (`/conversations`, `/conversation/{id}`) return 404 (removed) — Sub-3 updates React.
6. ML pipeline: triggering `MLWorkflow` runs `embed_chatbot_vehicles` and `car_vectorize`
   point count reflects the current gold.vehicles (re-ingested), no error.
