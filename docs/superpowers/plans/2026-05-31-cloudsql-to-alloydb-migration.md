# Cloud SQL → AlloyDB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all prod data from Cloud SQL (PG18) to the AlloyDB cluster (PG17, public IP), repoint backend + VM worker + local to AlloyDB over public IP + SSL, prove the pipeline transforms still run, then delete Cloud SQL.

**Architecture:** Logical `pg_dump -Fc` (custom format) from Cloud SQL → `pg_restore` into AlloyDB over its public IP `104.155.166.86` with `sslmode=require`. AlloyDB gets an `admin`/`admin123` role so every DSN only swaps host. Backend drops the Cloud SQL socket connector and connects by public IP. Pipeline code is unchanged — only `worker.env` host changes. Cloud SQL is deleted ONLY after full verification.

**Tech Stack:** GCP AlloyDB, Cloud SQL, Cloud Run, Secret Manager, `gcloud`, PostgreSQL client (run via `postgres:18` Docker image so no local install is needed), Temporal pipeline (dbt + psycopg2).

**Reference spec:** `docs/superpowers/specs/2026-05-31-cloudsql-to-alloydb-migration-design.md`

**Constants:**
- Project: `cobalt-bond-494609-a6`  ·  Region: `us-central1`
- Cloud SQL (source): instance `free-trial-first-project`, PG18, public IP `34.66.189.61`, DB `car_recsys`, user `admin`/`admin123`
- AlloyDB (target): cluster `free-trial-cluster`, instance `primary`, PG17, **public IP `104.155.166.86`**
- Backend image (for redeploy): `us-central1-docker.pkg.dev/cobalt-bond-494609-a6/car-recsys/backend:latest`
- VM: `temporal-worker` (zone `us-central1-a`), pipeline-worker container reads `worker.env`

**Execution note:** This environment has NO `psql`/`pg_dump` and gcloud-write may be restricted, so the USER runs every command on their machine (same pattern as the Cloud Run deploy). The controller provides exact blocks and reacts to pasted output. Postgres client comes from the `postgres:18` Docker image to avoid a local install and to match the PG18 source (an 18 client safely dumps an 18 server and restores plain data into a 17 server).

**HARD GATES:**
- Do NOT repoint any consumer (Task 4+) until the AlloyDB restore is verified (Task 3).
- Do NOT delete Cloud SQL (Task 7) until backend AND a pipeline run are green on AlloyDB (Tasks 5–6).

---

## Task 1: Prepare AlloyDB (postgres password, network, admin role, DB)

**Files:** none (gcloud + psql).

- [ ] **Step 1: Set the `postgres` password on AlloyDB**

The built-in `postgres` user's password is currently unknown. Set it:
```bash
P=cobalt-bond-494609-a6
read -s -p "Choose a postgres password: " PG_PW; echo
gcloud alloydb users set-password postgres \
  --cluster=free-trial-cluster --region=us-central1 --project=$P \
  --password="$PG_PW"
```
Expected: `Updated user [postgres]`.

- [ ] **Step 2: Open AlloyDB to the internet (SSL still required)**

Per the spec's free-trial tradeoff, authorize `0.0.0.0/0` (SSL enforced by the DSN):
```bash
P=cobalt-bond-494609-a6
gcloud alloydb instances update primary \
  --cluster=free-trial-cluster --region=us-central1 --project=$P \
  --authorized-external-networks=0.0.0.0/0 \
  --assign-inbound-public-ip=ASSIGN_IPV4
```
Expected: operation completes; `gcloud alloydb instances describe primary --cluster=free-trial-cluster --region=us-central1 --project=$P --format='value(publicIpAddress,networkConfig.authorizedExternalNetworks)'` shows `104.155.166.86` and `0.0.0.0/0`.
> If `--authorized-external-networks` is rejected on your gcloud version, the equivalent flag is `--authorized-network` (singular) or set it in console under the instance's Connectivity → Authorized external networks. The goal: `0.0.0.0/0` authorized + public IP on.

- [ ] **Step 3: Create the `admin` role + `car_recsys` DB on AlloyDB**

Use a throwaway `postgres:18` container as the psql client (no local install):
```bash
PG_PW='<the postgres password you set in Step 1>'
docker run --rm -e PGPASSWORD="$PG_PW" postgres:18 \
  psql "host=104.155.166.86 port=5432 dbname=postgres user=postgres sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -c "CREATE ROLE admin LOGIN PASSWORD 'admin123';" \
  -c "CREATE DATABASE car_recsys OWNER admin;"
```
Expected: `CREATE ROLE` then `CREATE DATABASE`. (If `admin` already exists, drop the CREATE ROLE line and just create the DB.)

- [ ] **Step 4: Verify AlloyDB connectivity as admin**

```bash
docker run --rm -e PGPASSWORD='admin123' postgres:18 \
  psql "host=104.155.166.86 port=5432 dbname=car_recsys user=admin sslmode=require" \
  -c "select current_user, version();"
```
Expected: prints `admin` and a PostgreSQL 17.x banner. (No commit — infra only.)

---

## Task 2: Dump data from Cloud SQL (PG18)

**Files:** none (gcloud + pg_dump).

- [ ] **Step 1: Start the source instance (it is STOPPED)**

```bash
P=cobalt-bond-494609-a6
gcloud sql instances patch free-trial-first-project --project=$P --activation-policy=ALWAYS
```
Expected: instance state → `RUNNABLE` (wait ~1 min: `gcloud sql instances describe free-trial-first-project --project=$P --format='value(state)'` → RUNNABLE).

- [ ] **Step 2: Authorize your machine on Cloud SQL**

```bash
P=cobalt-bond-494609-a6
MYIP=$(curl -s ifconfig.me)
echo "my IP = $MYIP"
gcloud sql instances patch free-trial-first-project --project=$P \
  --authorized-networks="$MYIP/32"
```
Expected: patch applies. (This overwrites Cloud SQL authorized networks — fine, we're about to delete it anyway.)

- [ ] **Step 3: Dump `car_recsys` to a custom-format file**

```bash
mkdir -p /tmp/alloydb-migrate
docker run --rm -e PGPASSWORD='admin123' -v /tmp/alloydb-migrate:/out postgres:18 \
  pg_dump "host=34.66.189.61 port=5432 dbname=car_recsys user=admin sslmode=require" \
  --no-owner --no-privileges -Fc -f /out/car_recsys.dump
ls -lh /tmp/alloydb-migrate/car_recsys.dump
```
Expected: a `car_recsys.dump` file of non-trivial size (megabytes). `--no-owner --no-privileges` because AlloyDB ownership differs; `-Fc` is the custom format `pg_restore` consumes.
> If pg_dump errors on a PG18-only feature, paste the error — we resolve per-object before restoring.

---

## Task 3: Restore into AlloyDB + re-own (HARD GATE before repointing)

**Files:** none (pg_restore + psql).

- [ ] **Step 1: Restore the dump into AlloyDB**

```bash
docker run --rm -e PGPASSWORD='admin123' -v /tmp/alloydb-migrate:/out postgres:18 \
  pg_restore --no-owner --no-privileges --role=admin --exit-on-error \
  -d "host=104.155.166.86 port=5432 dbname=car_recsys user=admin sslmode=require" \
  /out/car_recsys.dump
```
Expected: completes with no error. (If a few non-fatal errors appear — e.g. an extension already present — drop `--exit-on-error`, re-run, and paste the remaining errors to assess. Plain-data/DDL should restore clean.)

- [ ] **Step 2: Re-own all bronze/silver/gold objects to `admin`**

So `ensure_partition` (CREATE TABLE PARTITION OF, run as admin) works. This is the same block the init SQL uses — run it as `postgres` (the AlloyDB superuser-ish role) so it can reassign:
```bash
PG_PW='<the postgres password from Task 1>'
docker run --rm -e PGPASSWORD="$PG_PW" postgres:18 \
  psql "host=104.155.166.86 port=5432 dbname=car_recsys user=postgres sslmode=require" \
  -v ON_ERROR_STOP=1 -c "GRANT admin TO postgres;" -c "
DO \$reown\$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    FOR r IN SELECT schemaname, tablename FROM pg_tables
             WHERE schemaname IN ('bronze','silver','gold') LOOP
      EXECUTE format('ALTER TABLE %I.%I OWNER TO admin', r.schemaname, r.tablename);
    END LOOP;
    FOR r IN SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
             FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname IN ('bronze','silver','gold') LOOP
      EXECUTE format('ALTER FUNCTION %I.%I(%s) OWNER TO admin', r.nspname, r.proname, r.args);
    END LOOP;
  END IF;
END
\$reown\$;"
```
Expected: `GRANT ROLE` then `DO`. Also re-own the schemas themselves so dbt can manage them:
```bash
PG_PW='<postgres password>'
docker run --rm -e PGPASSWORD="$PG_PW" postgres:18 \
  psql "host=104.155.166.86 port=5432 dbname=car_recsys user=postgres sslmode=require" \
  -c "ALTER SCHEMA bronze OWNER TO admin;" \
  -c "ALTER SCHEMA silver OWNER TO admin;" \
  -c "ALTER SCHEMA gold OWNER TO admin;"
```
Expected: three `ALTER SCHEMA`. (If a schema doesn't exist, that one errors harmlessly — silver/gold are dbt-built and may be absent until the first dbt run; bronze/gold from the dump should exist.)

- [ ] **Step 3: VERIFY the restore (HARD GATE)**

```bash
docker run --rm -e PGPASSWORD='admin123' postgres:18 \
  psql "host=104.155.166.86 port=5432 dbname=car_recsys user=admin sslmode=require" \
  -c "\dn" \
  -c "SELECT count(*) AS vehicles FROM gold.vehicles;" \
  -c "SELECT count(*) AS bronze_rows FROM bronze.raw_listings;"
```
Expected: schemas list includes `bronze` and `gold` (and `silver` if it was dumped); `vehicles` ≈ **5318**; `bronze_rows` > 0. **Do not proceed to Task 4 unless the vehicle count matches the source.**

---

## Task 4: Repoint LOCAL `.env.cloud` (lowest-risk consumer first)

**Files:**
- Modify: `car-recsys-system/backend/.env.cloud` (or wherever `.env.cloud` lives — verify path)

- [ ] **Step 1: Find the .env.cloud file**

```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot
find . -name ".env.cloud" -not -path "*/node_modules/*"
```
Expected: prints the path (e.g. `./car-recsys-system/backend/.env.cloud`). It is gitignored.

- [ ] **Step 2: Point its DATABASE_URL at AlloyDB**

In that file, change the host in `DATABASE_URL` from `34.66.189.61` to `104.155.166.86` and ensure `?sslmode=require`. Example target line:
```
DATABASE_URL=postgresql://admin:admin123@104.155.166.86:5432/car_recsys?sslmode=require
```
(No commit — `.env.cloud` is gitignored and holds secrets.)

---

## Task 5: Repoint BACKEND (Cloud Run) to AlloyDB

**Files:** none (Secret Manager + gcloud run).

- [ ] **Step 1: Update the `database-url` secret to the AlloyDB DSN**

```bash
P=cobalt-bond-494609-a6
printf '%s' "postgresql+psycopg2://admin:admin123@104.155.166.86:5432/car_recsys?sslmode=require" \
  | gcloud secrets versions add database-url --data-file=- --project=$P
```
Expected: `Created version [N] of the secret [database-url].`

- [ ] **Step 2: Redeploy backend WITHOUT the Cloud SQL socket connector**

Redeploy the same image but drop the socket attachment (clears `--add-cloudsql-instances`):
```bash
P=cobalt-bond-494609-a6
REG=us-central1-docker.pkg.dev/$P/car-recsys
gcloud run deploy car-backend \
  --image=$REG/backend:latest \
  --region=us-central1 --project=$P --platform=managed \
  --allow-unauthenticated \
  --clear-cloudsql-instances \
  --set-env-vars=QDRANT_URL=https://ace7f34a-eb29-4ae5-9454-707191cc9612.us-east4-0.gcp.cloud.qdrant.io:6333,QDRANT_COLLECTION=car_chatbot_vectors \
  --set-secrets=DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,QDRANT_API_KEY=qdrant-api-key:latest \
  --memory=1Gi --cpu=1 --min-instances=0 --max-instances=2
```
Expected: a new revision deploys and serves 100% traffic. (`--clear-cloudsql-instances` removes the old socket mount; the DSN now uses the AlloyDB public IP.)

- [ ] **Step 3: VERIFY backend on AlloyDB**

```bash
BACKEND_URL=https://car-backend-vtinskoecq-uc.a.run.app
curl -s -o /dev/null -w "health:%{http_code}\n" "$BACKEND_URL/health"
curl -s "$BACKEND_URL/api/v1/listings?limit=3" | head -c 300; echo
curl -s "$BACKEND_URL/api/v1/listing/$(curl -s "$BACKEND_URL/api/v1/listings?limit=1" | grep -oE '"vehicle_id":"[^"]+"' | head -1 | cut -d'"' -f4)" | head -c 200; echo
```
Expected: `health:200`; listings returns vehicle JSON from AlloyDB; detail returns a vehicle. If listings 500s, read logs:
`gcloud run services logs read car-backend --region=us-central1 --project=cobalt-bond-494609-a6 --limit=30` (likely SSL or authorized-network — confirm `0.0.0.0/0` + `sslmode=require`).

---

## Task 6: Repoint VM WORKER + prove the pipeline transforms run

**Files:** none (edit `worker.env` on the VM, recreate container, trigger a workflow).

- [ ] **Step 1: Update `worker.env` on the VM**

SSH in and edit the host in both the warehouse DSN and the dbt host:
```bash
P=cobalt-bond-494609-a6
gcloud compute ssh temporal-worker --zone=us-central1-a --project=$P --command='
  sed -i "s#34\.66\.189\.61#104.155.166.86#g" worker.env
  grep -E "WAREHOUSE_DSN|DBT_PG_HOST|DBT_PG_SSLMODE" worker.env
'
```
Expected: `WAREHOUSE_DSN` now points at `104.155.166.86` and includes `?sslmode=require`; `DBT_PG_HOST=104.155.166.86`. If `DBT_PG_SSLMODE` is missing, add `DBT_PG_SSLMODE=require`.
> NOTE: the sed above has a deliberate guard — verify the printed lines actually show `104.155.166.86` and `sslmode=require`. If `WAREHOUSE_DSN` lacks `?sslmode=require`, append it:
> `gcloud compute ssh temporal-worker --zone=us-central1-a --project=$P --command="sed -i 's#\(WAREHOUSE_DSN=.*car_recsys\)\$#\1?sslmode=require#' worker.env; grep WAREHOUSE_DSN worker.env"`

- [ ] **Step 2: Recreate the worker container with the new env**

```bash
P=cobalt-bond-494609-a6
gcloud compute ssh temporal-worker --zone=us-central1-a --project=$P --command='
  IMG=us-central1-docker.pkg.dev/cobalt-bond-494609-a6/car-recsys/pipeline-worker:latest
  docker rm -f pipeline-worker
  docker run -d --name pipeline-worker --restart unless-stopped --env-file worker.env "$IMG"
  sleep 4 && docker logs --tail 12 pipeline-worker
'
```
Expected: logs show `Connected. Pipeline worker on task queue car-pipeline-tq`.

- [ ] **Step 3: Trigger ONE `transform` workflow against AlloyDB (the real test)**

From local, pointing at Temporal Cloud (same env you used before):
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot/crawler
TEMPORAL_ADDRESS=car-recsys.islko.tmprl.cloud:7233 \
TEMPORAL_NAMESPACE=car-recsys.islko \
TEMPORAL_API_KEY=<tmprl_... key> \
  PYTHONPATH=. .venv/bin/python -m temporal_app.scripts.trigger_once transform
```
Expected: the workflow runs and completes. Watch it on Temporal Cloud UI (or `docker logs -f pipeline-worker` on the VM). The transform must finish: `load_bronze` → `dbt_build` → `ensure_partition` → `refresh_matviews`, all against AlloyDB. **This proves the transform scripts work unchanged on the new datasource** (the user's core concern).
> If `ensure_partition` fails with "must be owner": re-run Task 3 Step 2 (ownership) — a dbt rebuild may have created new tables owned by admin already, but partitioned parents must be admin-owned.

---

## Task 7: Delete Cloud SQL + update docs (only after Tasks 5 & 6 green)

**Files:**
- Create: `docs/alloydb.md`
- (optional) Remove/redirect: `docs/cloud-sql.md`

- [ ] **Step 1: Final gate check**

Confirm, in one place, that ALL of these are true before deleting:
- Task 3 vehicle count matched (≈5318).
- Task 5: backend `/health` + `/api/v1/listings` + detail all 200 from AlloyDB.
- Task 6: a `transform` workflow completed green on AlloyDB.
If any is not true, STOP — do not delete Cloud SQL.

- [ ] **Step 2: Delete the Cloud SQL instance**

```bash
P=cobalt-bond-494609-a6
gcloud sql instances delete free-trial-first-project --project=$P
```
Expected: prompts for confirmation, then deletes. (Irreversible — that's why the gate above is mandatory.)

- [ ] **Step 3: Write `docs/alloydb.md`**

Create `docs/alloydb.md` documenting: AlloyDB cluster/instance, public IP `104.155.166.86`, `0.0.0.0/0`+SSL tradeoff, the `admin`/`car_recsys` setup, the DSN form for backend (secret `database-url`) + worker (`worker.env` host + `sslmode=require`) + local (`.env.cloud`), the re-own gotcha for `ensure_partition`, and the **AlloyDB free-trial expiry (~1 month) cost note**. Keep secrets OUT (placeholders only), mirroring `docs/cloud-sql.md` style.

- [ ] **Step 4: Update references + commit**

Update `CLAUDE.md`'s "Cloud (GCP)" section and `docs/vm-worker.md` to say AlloyDB `104.155.166.86` instead of Cloud SQL `34.66.189.61`. Then:
```bash
cd /home/duc-nguyen16/car-recsys-consultant-chatbot
grep -rn "34.66.189.61\|free-trial-first-project\|add-cloudsql-instances" docs/ CLAUDE.md || echo "no stale Cloud SQL refs"
git add docs/alloydb.md docs/cloud-sql.md docs/vm-worker.md CLAUDE.md
git commit -m "docs: migrate Cloud SQL -> AlloyDB (connection + runbook)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Expected: no stale `34.66.189.61` references remain in docs; commit succeeds.

---

## Self-Review Notes

- **Spec coverage:** STEP 0 → Task 1 (postgres pw, 0.0.0.0/0, admin role, car_recsys). STEP 1 → Task 2 (start + dump). STEP 2 → Task 3 (restore + re-own + verify gate). STEP 3 → Tasks 4 (local), 5 (backend, drop socket), 6 (worker + pipeline proof). STEP 4 → Task 7 (delete after verify + docs). All spec steps + the verification list mapped.
- **Placeholder scan:** The only `<...>` are user secrets (postgres password, Temporal API key) and the discovered `.env.cloud` path (Task 4 finds it) — unavoidable. Every gcloud/psql/pg_dump command is concrete with expected output.
- **Consistency:** Host `104.155.166.86`, DB `car_recsys`, user `admin`/`admin123`, DSN `postgresql+psycopg2://...?sslmode=require` used identically across backend secret, worker.env, and local. The `database-url` secret name matches the existing Cloud Run secret. The reown block matches `02-create-schema.sql:225-246`.
- **Gate discipline:** Task 3 (verify restore) blocks Task 4+; Tasks 5 & 6 (green backend + pipeline) block Task 7 (delete). Matches the user's "delete only if it doesn't affect the new flow."
- **sed safety:** Task 6 Step 1 uses a single global `sed 's#34\.66\.189\.61#104.155.166.86#g'` (one source IP → one target IP), then greps to confirm. The engineer MUST verify the printed `WAREHOUSE_DSN`/`DBT_PG_HOST` show `104.155.166.86` and that `WAREHOUSE_DSN` carries `?sslmode=require` (append it via the follow-up command if missing).
