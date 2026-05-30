"""One-off: load the INITIAL Colab crawl (gs://bronze-car-recsys/raw_data/) into
bronze.raw_listings on whatever WAREHOUSE_DSN points to (here: Cloud SQL).

Scans the WHOLE bucket (crawl_date=''), stamps source='initial'. Idempotent via
file_hash, so re-running is safe. Does NOT run dbt — run dbt build separately
after this (so you can inspect bronze first).

Usage:
    set -a; . car-recsys-system/.env.cloud; set +a
    GCS_BUCKET=bronze-car-recsys \
      crawler/.venv/bin/python -m temporal_app.scripts.backfill_initial
"""
from __future__ import annotations

import logging
import os
import sys

from temporal_app.pipeline import BronzeLoaderConfig, load_bronze

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("backfill-initial")


def main() -> None:
    dsn = os.environ.get("WAREHOUSE_DSN")
    if not dsn:
        sys.exit("Missing WAREHOUSE_DSN (did you source .env.cloud?)")

    bucket = os.environ.get("GCS_BUCKET", "bronze-car-recsys")
    log.info("Backfilling INITIAL data from gs://%s/ → %s",
             bucket, dsn.split("@")[-1])

    cfg = BronzeLoaderConfig(
        bucket=bucket,
        crawl_date="",                 # "" = scan the whole bucket (raw_data/...)
        warehouse_dsn=dsn,
        source="initial",
        gcp_project=os.environ.get("GCP_PROJECT_ID"),
    )
    result = load_bronze(cfg, run_id="backfill-initial")
    log.info("DONE: %s", result)


if __name__ == "__main__":
    main()
