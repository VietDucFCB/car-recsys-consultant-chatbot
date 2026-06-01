# Migrate Cloud SQL → AlloyDB — Design

**Date:** 2026-05-31
**Status:** Approved (design), pending implementation

## Problem

Cloud SQL (PostgreSQL 18, instance `free-trial-first-project`, public IP `34.66.189.61`)
holds prod data but costs money. The user created an AlloyDB cluster
(`free-trial-cluster`, PG17, primary has **public IP `104.155.166.86`**, free for ~1 month)
and wants to move all data there, repoint every consumer, keep the pipeline transforms
working, then delete Cloud SQL to cut cost.

Consumers of the current DB (all env-driven, no hardcoded host):
- **backend** (Cloud Run `car-backend`) → Secret Manager secret `database-url` (currently a
  Cloud SQL **unix-socket** DSN + `--add-cloudsql-instances`).
- **VM worker** (`temporal-worker`, pipeline) → `worker.env`: `WAREHOUSE_DSN` + `DBT_PG_*`.
- **local dev** → `.env.cloud`.

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Migration method | **pg_dump (custom format) → pg_restore** over AlloyDB public IP. Simple, controllable, fine for ~5,318 vehicles. |
| Backend → AlloyDB | **Public IP + SSL** (`sslmode=require`). Drop `--add-cloudsql-instances`; backend connects `104.155.166.86:5432` like the VM worker. |
| AlloyDB auth | Set the `postgres` password, then create role **`admin`/`admin123`** + DB `car_recsys` so every DSN only changes host (user/pass unchanged). |
| AlloyDB networking | **Authorized network `0.0.0.0/0` + enforced `sslmode=require`** (free-trial/thesis tradeoff: open to internet but SSL+auth gated). No VPC connector (avoids extra cost). |
| Cloud SQL after | **Delete** the instance — but ONLY after AlloyDB is fully verified (backend + a green pipeline run). No deleting before cutover. |
| Pipeline code | **No code change** — dbt + Temporal activities read DB from env. Only `worker.env` host changes. |

## Architecture / Flow

```
STEP 0 — Prepare AlloyDB
  gcloud alloydb users set-password postgres --password=<PG_PW> ...   (postgres pw unknown today)
  Add authorized network 0.0.0.0/0 to the AlloyDB primary (public IP already enabled).
  Connect as postgres @104.155.166.86 (sslmode=require), run:
    CREATE ROLE admin LOGIN PASSWORD 'admin123';
    CREATE DATABASE car_recsys OWNER admin;
  (No manual init SQL — schema arrives via the dump in STEP 2.)

STEP 1 — Dump from Cloud SQL (PG18 source)
  gcloud sql instances patch free-trial-first-project --activation-policy=ALWAYS   (it's STOPPED)
  Add your machine IP to Cloud SQL authorized networks.
  pg_dump "host=34.66.189.61 dbname=car_recsys user=admin sslmode=require" \
     --no-owner --no-privileges -Fc -f car_recsys.dump
  (Captures bronze/silver/gold + app tables: users, user_interactions, chat_*, item_similarity.)

STEP 2 — Restore into AlloyDB (PG17, public IP)
  pg_restore --no-owner --role=admin --no-privileges \
     -d "host=104.155.166.86 dbname=car_recsys user=admin sslmode=require" car_recsys.dump
  Re-own all objects to admin (so ensure_partition's CREATE TABLE PARTITION OF works):
     as postgres: GRANT admin TO postgres; then REASSIGN OWNED BY postgres TO admin;
     (or run the init SQL's DO $reown$ block adapted to AlloyDB).
  Verify: SELECT count(*) FROM gold.vehicles;  -- expect 5318
          \dn  shows bronze, silver, gold, public.

STEP 3 — Repoint datasources
  Backend:
    Update secret database-url to:
      postgresql+psycopg2://admin:admin123@104.155.166.86:5432/car_recsys?sslmode=require
    gcloud run deploy car-backend --image <current> ... WITHOUT --add-cloudsql-instances
      (and the cloudsql.client IAM grant becomes unnecessary; leave or remove later).
    Verify: /health 200, /api/v1/listings?limit=3 returns vehicles, /api/v1/listing/{vin} OK.
  VM worker:
    Edit worker.env: WAREHOUSE_DSN host → 104.155.166.86 (+ ?sslmode=require),
      DBT_PG_HOST=104.155.166.86, DBT_PG_SSLMODE=require (keep admin/admin123).
    docker rm -f pipeline-worker && docker run ... (recreate with new env).
    Trigger ONE pipeline "transform" (trigger_once transform) → confirm load_bronze + dbt build +
      ensure_partition + refresh_matviews all PASS against AlloyDB.
  Local:
    Update .env.cloud host → 104.155.166.86 + sslmode=require.

STEP 4 — Verify end-to-end, THEN delete Cloud SQL
  All backend endpoints OK + a green end-to-end pipeline run on AlloyDB.
  gcloud sql instances delete free-trial-first-project --project=cobalt-bond-494609-a6
  Update docs: docs/cloud-sql.md → docs/alloydb.md (placeholders only, no secrets).
```

## Risks (already considered)

- **PG18 → PG17 downgrade.** AlloyDB is PG17; source is PG18. A logical `pg_dump`/restore of
  plain data + standard DDL is normally fine; risk is PG18-only extensions/syntax. Mitigation:
  do the restore EARLY (STEP 2) and resolve any per-object error before repointing.
- **AlloyDB free for ~1 month.** After the trial it bills — track cost; this is the user's
  cost-cutting move but introduces a new clock. (Out of scope to automate; note in docs.)
- **`0.0.0.0/0` exposure.** DB reachable from the internet; mitigated by enforced SSL +
  password auth. Acceptable for free-trial/thesis; documented as a known tradeoff.
- **ensure_partition ownership.** Re-own objects to `admin` on AlloyDB (same gotcha already
  solved on Cloud SQL).
- **No pipeline code change** — confirmed: dbt profile + activities are env-driven.

## Out of scope (YAGNI)

- VPC connector / Cloud NAT / private IP (cost; `0.0.0.0/0`+SSL chosen instead).
- Database Migration Service (overkill for this size).
- Zero-downtime cutover (brief downtime acceptable; repoint is a few minutes).
- Re-running the pipeline to recreate data (we migrate the real data, including app tables).

## Verification

1. AlloyDB has `car_recsys` with bronze/silver/gold + app tables; `gold.vehicles` count = 5318.
2. `admin` owns the partitioned tables (ensure_partition can create partitions).
3. Backend on Cloud Run (no `--add-cloudsql-instances`) serves `/api/v1/listings`,
   `/api/v1/listing/{vin}`, `/health` from AlloyDB.
4. A pipeline `transform` run completes green against AlloyDB (dbt build + ensure_partition +
   refresh_matviews), proving the transform scripts work unchanged on the new datasource.
5. Cloud SQL instance deleted; no consumer still references `34.66.189.61` or the socket.
6. `docs/alloydb.md` documents the new connection (placeholders, no secrets).
