"""Init DAG — one-shot full crawl of cars.com.

Manually triggered. Use this once (or after a full reset) to build the
historical raw_data corpus. The daily DAG keeps it fresh thereafter.

Trigger from the UI with custom params, or from the CLI:

    airflow dags trigger car_crawler_init_full_history \\
        --conf '{"start_page": 1, "end_page": 200, "http_workers": 16}'
"""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow.decorators import dag, task
from airflow.models.param import Param

from _crawler_common import make_settings


@dag(
    dag_id="car_crawler_init_full_history",
    description="One-shot historical crawl of cars.com. Manual trigger only.",
    schedule=None,                          # manual only
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,                      # never run two full crawls in parallel
    tags=["crawler", "init", "backfill"],
    default_args={
        "owner": "data-platform",
        "retries": 1,
        "retry_delay": timedelta(minutes=10),
    },
    params={
        "start_page": Param(1, type="integer", minimum=1),
        "end_page": Param(200, type="integer", minimum=1),
        "http_workers": Param(16, type="integer", minimum=1, maximum=64),
        "selenium_workers": Param(2, type="integer", minimum=1, maximum=8),
    },
)
def car_crawler_init_full_history():
    @task(execution_timeout=timedelta(hours=2))
    def discover(**context) -> int:
        """Walk search-result pages and write one ``page_<n>.txt`` per page."""
        from crawler import discover_listing_urls

        params = context["params"]
        settings = make_settings(
            start_page=int(params["start_page"]),
            end_page=int(params["end_page"]),
            resume=True,                    # safe to resume across retries
        )
        result = discover_listing_urls(settings)
        return sum(len(v) for v in result.values())

    @task(execution_timeout=timedelta(hours=8))
    def scrape(discovered_count: int, **context) -> None:
        """Fetch detail/seller/review HTML and write JSON per car."""
        from crawler import scrape_listings

        params = context["params"]
        settings = make_settings(
            start_page=int(params["start_page"]),
            end_page=int(params["end_page"]),
            http_workers=int(params["http_workers"]),
            selenium_workers=int(params["selenium_workers"]),
            resume=True,
        )
        scrape_listings(settings)

    scrape(discover())


car_crawler_init_full_history()
