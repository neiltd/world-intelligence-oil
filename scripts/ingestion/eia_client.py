"""
EIA Open Data API v2 client.

- Validates API key on first call.
- Retries on transient errors (429, 5xx) with exponential backoff.
- Paginates automatically: fetches all pages when total > page_size.
- Raises clearly on configuration or API errors.
"""
from __future__ import annotations

from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from . import config

# ── Session factory ───────────────────────────────────────────────────────────

_PAGE_SIZE = 5_000  # EIA v2 max records per request


def _make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1.0,            # 1s, 2s, 4s
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    return session


_SESSION = _make_session()


# ── Core GET ──────────────────────────────────────────────────────────────────

def get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """
    Single GET to EIA API v2.  Returns the parsed JSON body.
    Raises RuntimeError on any failure so callers don't have to inspect HTTP status.
    """
    if not config.EIA_API_KEY:
        raise RuntimeError(
            "EIA_API_KEY is not set.\n"
            "Copy scripts/.env.example to scripts/.env and add your key.\n"
            "Get a free key at https://www.eia.gov/opendata/"
        )

    url = f"{config.EIA_BASE_URL}/{path.lstrip('/')}"
    full_params = {"api_key": config.EIA_API_KEY, **params}

    try:
        resp = _SESSION.get(url, params=full_params, timeout=30)
    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError(f"Network error reaching EIA API: {exc}") from exc
    except requests.exceptions.Timeout:
        raise RuntimeError("EIA API request timed out after 30 s")

    if not resp.ok:
        raise RuntimeError(
            f"EIA API returned HTTP {resp.status_code} for {resp.url}\n"
            f"Body: {resp.text[:400]}"
        )

    body: dict[str, Any] = resp.json()
    if "error" in body:
        raise RuntimeError(f"EIA API error response: {body['error']}")

    return body


# ── Paginated GET ─────────────────────────────────────────────────────────────

def get_all(path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Fetches all pages for an EIA v2 data endpoint and returns the combined
    list of data records.

    EIA v2 uses offset-based pagination:
      ?offset=0&length=5000  → first page
      ?offset=5000&length=5000 → second page
      ... until offset >= total
    """
    all_records: list[dict[str, Any]] = []
    offset = 0

    while True:
        body = get(path, {**params, "offset": offset, "length": _PAGE_SIZE})
        response = body.get("response", {})
        records = response.get("data", [])
        total = int(response.get("total", 0))

        all_records.extend(records)
        offset += len(records)

        if offset >= total or not records:
            break

    return all_records
