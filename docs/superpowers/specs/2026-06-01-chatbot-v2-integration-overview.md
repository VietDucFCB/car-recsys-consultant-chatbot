# Chatbot v2 (Agentic) Integration — Overview & Decomposition

**Date:** 2026-06-01
**Status:** Approved (decomposition + decisions); sub-projects specced separately.

## Problem

A teammate pushed `chatbot_2/` — a newer, more capable **agentic chatbot** (LangChain +
LangGraph): a stateful consultation graph with **profile slot-filling** (collects user
needs over turns) and **intent routing** into specialized branches
(`compare` / `analytics` / `spec` / `hybrid`), plus topic-redirect. But it runs **entirely
local**: ChromaDB (local persist), Streamlit UI, its own FastAPI (`api_server.py`), and SQL
against a **SQL Server star schema** (`post.Post`, `core.Car`, `core.Brand`, `lookup.*`)
with a local `DB_CONNECTION_STRING`.

The user wants chatbot_2 to **replace the current chatbot**, integrated into the **real
system the same way the old one was**: **Qdrant Cloud** (not Chroma), **React** frontend
(not Streamlit), the **main FastAPI backend** at `/api/v1/chat` (not a separate server),
and **AlloyDB** (not the local SQL Server).

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Replace vs add | **Replace** the current `backend/app/services/chatbot/` (core/retrieval/generation/memory) and the old `/api/v1/chat` flow with chatbot_2's agentic graph. |
| LangGraph | **Keep** LangChain/LangGraph (add to backend deps). The graph's `_build_agentic_app(llm, vector_store)` already injects the vector store, so the swap point is clean. Updates CLAUDE.md's "No LangChain" note for the chatbot. |
| Vector store | **Qdrant Cloud** via LangChain's Qdrant wrapper. **Re-ingest** chatbot_2-style documents into a **new collection** (e.g. `car_vectorize`), separate from `car_chatbot_vectors` (which the recommender's VectorRecaller keeps using). |
| SQL | chatbot_2's SQL is **SQL Server + star schema**; the system is **Postgres `gold.*` denormalized**. So the queries must be **rewritten** (drop JOINs — everything is in `gold.vehicles`; `TOP n`→`LIMIT n`; column renames), not just remapped. This is the biggest risk and is isolated in sub-project 1. |
| Chat history | **In-memory** per `session_id` (as chatbot_2 already does). `gold.chat_*` persistence deferred. |
| UI | **React** `ChatPage`/`ChatPopup` calls the new `/api/v1/chat`. Drop Streamlit `chat_ui.py`. |

## Why decompose (scope is large)

The integration spans: a new Qdrant ingest, a full SQL rewrite (SQL Server star schema →
Postgres gold denormalized across `sql_search_cars`, `get_avg_price`, and ~5 analytics
queries), wiring the 1283-line LangGraph app into the backend with injected Qdrant+AlloyDB,
a new chat route, React multi-turn wiring, dependency + CLAUDE.md changes. Per the
brainstorming scope rule, this is **three independent sub-projects**, each producing
working, testable software, built in order:

### Sub-project 1 — Data layer (Qdrant ingest + SQL rewrite to gold.*)
The foundation. (a) Port `ingest_database.py` to read `gold.vehicles` (+ features/reviews) on
AlloyDB, build chatbot_2-style chunked documents, and write to a **new Qdrant collection**
via LangChain `QdrantVectorStore`. (b) Rewrite every SQL query in `generate_response.py`
(`sql_search_cars`, `get_avg_price`, analytics branch) to Postgres `gold.*`. Verifiable
standalone: ingest populates Qdrant; the rewritten SQL functions return rows against AlloyDB.
**`gold.vehicles` already carries every field chatbot_2 JOINed for** (vin, title, brand,
car_name, car_model, price, mileage, mpg, colors, drivetrain, fuel_type, transmission,
engine, car_rating, percentage_recommend, …) — so rewrite = de-JOIN + rename + dialect.

### Sub-project 2 — Backend integration (agentic graph → /api/v1/chat)
Add `langchain`/`langgraph`/`langchain-qdrant`/`langchain-openai` to `backend/requirements.txt`.
Move the graph (`generate_response.py`) + `user_profile.py` into
`backend/app/services/chatbot/`, initialized with the Qdrant `QdrantVectorStore` (sub-1
collection) + AlloyDB. Replace the `/api/v1/chat` route with a `{session_id, message} →
{session_id, answer}` endpoint backed by `generate_response`, history in-memory per session.
Remove the old chatbot modules + `api_server.py`/Streamlit. Verifiable: deployed backend
answers a multi-turn consultation.

### Sub-project 3 — Frontend wiring (React ChatPage → new /api/v1/chat)
Point `ChatPage`/`ChatPopup` at the new endpoint with the new request/response shape
(session_id + message, multi-turn slot-filling — the bot may ask follow-up questions). Drop
any dependence on the old chat conversation endpoints. Verifiable: a user holds a
multi-turn consultation in the web UI on carsalesfinder.com.

## Out of scope (for this overview)
- Per-sub-project detail (each gets its own spec + plan).
- Persisting history to `gold.chat_*` (deferred; in-memory for now).
- Keeping the old chatbot as a fallback (full replace).
- Streamlit UI, `chatbot_2/api_server.py` (dropped).
- Re-using `car_chatbot_vectors` for the chatbot (recommender keeps it; chatbot gets its own).

## Build order
Sub-1 (data) → Sub-2 (backend) → Sub-3 (frontend). Each is brainstormed → spec → plan →
implemented before the next. This overview is the shared reference; **sub-project 1 is
brainstormed next.**
