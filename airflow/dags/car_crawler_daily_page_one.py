"""Daily DAG — incremental crawl of page 1 only.

New listings on cars.com appear at the top of the search results, so a
single page-1 sweep is enough to catch most fresh inventory each day. Each
run writes into a date-partitioned subtree:

    data/car_links/daily/<ds>/page_1.txt
    data/raw_data/daily/<ds>/1/<idx>.json
    data/html_cache/daily/<ds>/...

That keeps the historical corpus from `car_crawler_init_full_history`
untouched and gives a clean "what was new on day X" view downstream.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow.decorators import dag, task

from _crawler_common import DATA_ROOT, make_settings


@dag(
    dag_id="car_crawler_daily_page_one",
    description="Daily incremental crawl of page 1 to capture new listings.",
    schedule="@daily",
    start_date=datetime(2026, 4, 1),
    catchup=False,
    max_active_runs=1,
    tags=["crawler", "daily", "incremental"],
    default_args={
        "owner": "data-platform",
        "retries": 2,
        "retry_delay": timedelta(minutes=5),
    },
)
def car_crawler_daily_page_one():
    @task(execution_timeout=timedelta(minutes=15))
    def discover(ds: str) -> int:
        """Refresh page-1 URL list for the run date."""
        from crawler import discover_listing_urls

        settings = make_settings(
            start_page=1,
            end_page=1,
            link_dir=DATA_ROOT / "car_links" / "daily" / ds,
            output_dir=DATA_ROOT / "raw_data" / "daily" / ds,
            cache_dir=DATA_ROOT / "html_cache" / "daily" / ds,
            resume=False,                   # always refetch the list — page 1 is volatile
        )
        result = discover_listing_urls(settings)
        return sum(len(v) for v in result.values())

    @task(execution_timeout=timedelta(minutes=45))
    def scrape(discovered_count: int, ds: str) -> None:
        """Fetch and persist details/seller/reviews for the day's URLs."""
        from crawler import scrape_listings

        settings = make_settings(
            start_page=1,
            end_page=1,
            link_dir=DATA_ROOT / "car_links" / "daily" / ds,
            output_dir=DATA_ROOT / "raw_data" / "daily" / ds,
            cache_dir=DATA_ROOT / "html_cache" / "daily" / ds,
            http_workers=8,                 # gentler than the init crawl
            selenium_workers=1,
            resume=True,                    # within a day's folder, skip cars already saved
        )
        scrape_listings(settings)

    scrape(discover())


car_crawler_daily_page_one()
