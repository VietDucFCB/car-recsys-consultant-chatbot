# airflow/

Apache Airflow **3.2.1** deployment that runs the cars.com crawler on a
schedule. Local Docker Compose for now; designed to migrate cleanly to a
Kubernetes / Helm chart deployment later.

## Layout

```
airflow/
├── Dockerfile                # Airflow 3.2.1 + Chrome + crawler deps
├── docker-compose.yaml       # postgres + 4 Airflow services (LocalExecutor)
├── requirements.txt          # crawler runtime + FAB auth provider
├── .env.example              # copy to .env before `docker compose up`
└── dags/
    ├── _crawler_common.py    # shared helpers (DATA_ROOT, make_settings)
    ├── car_crawler_init_full_history.py    # one-shot full crawl (manual)
    └── car_crawler_daily_page_one.py       # @daily incremental (page 1)
```

The `crawler/` package at the repo root is mounted **read-only** into each
container at `/opt/airflow/include/crawler`, so DAGs can `import crawler`
without packaging it into the image. (For prod / K8s, bake it into the image
instead of mounting.)

## Quick start

```bash
cd airflow
cp .env.example .env

# Generate a Fernet key (encrypts connection passwords in the metadata DB).
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Paste the result into AIRFLOW_FERNET_KEY in .env

# On Linux, set AIRFLOW_UID to your host UID so logs/data are owned by you:
echo "AIRFLOW_UID=$(id -u)" >> .env

docker compose up -d --build
```

The first build takes ~5 min (Chrome install + dependency wheels). Subsequent
restarts take seconds.

UI: <http://localhost:8080> — login `admin / admin` (set in `.env`).

## DAGs

### `car_crawler_init_full_history`

One-shot full crawl. **Manual trigger only** (`schedule=None`).

| Param              | Default | Notes                            |
|--------------------|---------|----------------------------------|
| `start_page`       | 1       | First search-result page         |
| `end_page`         | 200     | Last search-result page          |
| `http_workers`     | 16      | Parallel httpx requests          |
| `selenium_workers` | 2       | Selenium fallback pool size      |

Two tasks: `discover` → `scrape`. Output:
- `data/car_links/page_<n>.txt` — listing URLs per page
- `data/raw_data/<page>/<idx>.json` — one JSON per car

Trigger from the UI ("Trigger DAG w/ config") or CLI:

```bash
docker compose exec airflow-scheduler \
    airflow dags trigger car_crawler_init_full_history \
    --conf '{"start_page": 1, "end_page": 50, "http_workers": 16}'
```

### `car_crawler_daily_page_one`

Runs `@daily` (00:00 UTC). Crawls page 1 only — captures new listings.

Output is **date-partitioned** so it doesn't collide with the historical corpus:
- `data/car_links/daily/<ds>/page_1.txt`
- `data/raw_data/daily/<ds>/1/<idx>.json`

(`<ds>` is Airflow's logical date string, e.g. `2026-04-26`.)

`max_active_runs=1` and `catchup=False` — missed days do not back-fill, since
yesterday's "new listings" are no longer relevant.

## Operations

```bash
# View logs
docker compose logs -f airflow-scheduler
docker compose logs -f airflow-dag-processor

# Restart a single service after changing requirements.txt or Dockerfile
docker compose up -d --build airflow-scheduler airflow-apiserver \
    airflow-dag-processor airflow-triggerer

# Run a one-off Airflow CLI command
docker compose exec airflow-scheduler airflow dags list
docker compose exec airflow-scheduler airflow tasks list car_crawler_daily_page_one

# Tear everything down (data volumes preserved)
docker compose down

# Tear down + delete metadata DB
docker compose down -v
```

## Adding new DAGs

Drop a `*.py` file into `dags/`. The `airflow-dag-processor` service rescans
the folder; new DAGs appear in the UI within ~30 seconds. No restart needed.

## Future: Kubernetes migration

The Compose layout maps directly onto the Apache Airflow Helm chart:

| Compose service          | Helm equivalent                                 |
|--------------------------|-------------------------------------------------|
| `postgres`               | `postgresql.enabled: true` or external RDS     |
| `airflow-apiserver`      | `apiServer.*`                                  |
| `airflow-scheduler`      | `scheduler.*`                                  |
| `airflow-dag-processor`  | `dagProcessor.enabled: true`                   |
| `airflow-triggerer`      | `triggerer.*`                                  |
| `./dags` mount           | `dags.gitSync.enabled: true` (this repo)       |
| `./data` mount           | PVC + `extraVolumeMounts` on workers           |
| `../crawler` mount       | bake into image; remove the read-only mount    |

Switch to `executor: KubernetesExecutor` so each task gets its own pod —
Selenium can be heavy, and per-task isolation is worth it on a real cluster.
The DAGs themselves need no changes; they already use only `CRAWLER_DATA_ROOT`
and `make_settings()`, so they read whatever path the K8s volume provides.

## Troubleshooting

**`Permission denied` on `./logs` or `./data` (Linux).** You skipped setting
`AIRFLOW_UID` in `.env`. Fix:
```bash
echo "AIRFLOW_UID=$(id -u)" >> .env
sudo chown -R $(id -u):0 logs data
docker compose up -d
```

**DAG fails with `ModuleNotFoundError: crawler`.** Verify the read-only mount:
```bash
docker compose exec airflow-scheduler ls /opt/airflow/include/crawler
```
Should list `parsers.py`, `pipeline.py`, etc. If empty, you ran `docker
compose` from the wrong directory — must be from inside `airflow/`.

**Selenium task hangs on startup.** Chrome is missing or a sandbox flag is
blocking the launch. Confirm the image was rebuilt after the Dockerfile
change:
```bash
docker compose exec airflow-scheduler google-chrome --version
```

**`api-server` healthcheck fails.** Airflow 3 uses `/api/v2/monitor/health`
(not `/health`). The compose file already targets the correct path; if you
copied an Airflow 2 healthcheck from old docs, update it.
