"""
Writes and merges the data_status.json file consumed by the frontend DataStatus badge.

Each ingestion script calls update_status(section, payload) to update its own
section without overwriting sections owned by other scripts.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from . import config

_STATUS_PATH = config.OUT_DIR / "data_status.json"   # exported for external use


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def update_status(section: str, payload: dict[str, Any]) -> None:
    """
    Merge `payload` into the `datasets.<section>` key of data_status.json.
    Creates the file if it doesn't exist.  Atomic write.
    """
    config.OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Read existing state
    existing: dict[str, Any] = {}
    if _STATUS_PATH.exists():
        try:
            existing = json.loads(_STATUS_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = {}

    datasets: dict[str, Any] = existing.get("datasets", {})
    datasets[section] = payload

    status = {
        "generated_at": _now_iso(),
        "datasets": datasets,
    }

    tmp = _STATUS_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(status, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.rename(_STATUS_PATH)
