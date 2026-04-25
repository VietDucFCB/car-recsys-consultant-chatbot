"""Shared helpers for the cars.com crawler DAGs.

DAG files import this module to keep their bodies focused on orchestration
rather than boilerplate. Only DAG-internal use; not a public API.
"""

from __future__ import annotations

import os
from pathlib import Path

# /opt/airflow/data inside the container; overridable via env for tests.
DATA_ROOT = Path(os.environ.get("CRAWLER_DATA_ROOT", "/opt/airflow/data"))


def make_settings(
    *,
    start_page: int,
    end_page: int,
    link_dir: Path | None = None,
    output_dir: Path | None = None,
    cache_dir: Path | None = None,
    http_workers: int = 16,
    selenium_workers: int = 2,
    parser_workers: int = 8,
    resume: bool = True,
):
    """Build a CrawlerSettings, defaulting paths under ``DATA_ROOT``.

    Imported lazily so DAG-parse stays light when the crawler package is absent.
    """
    from crawler import CrawlerSettings  # noqa: PLC0415  (intentional lazy import)

    return CrawlerSettings(
        link_dir=link_dir or DATA_ROOT / "car_links",
        output_dir=output_dir or DATA_ROOT / "raw_data",
        html_cache_dir=cache_dir or DATA_ROOT / "html_cache",
        start_page=start_page,
        end_page=end_page,
        http_workers=http_workers,
        selenium_workers=selenium_workers,
        parser_workers=parser_workers,
        resume=resume,
    )
