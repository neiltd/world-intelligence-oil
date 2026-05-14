"""
Fetch Brent and WTI monthly spot prices from EIA Open Data API v2.

Output: frontend/src/data/oil/live/oil_price.json

Run standalone:
    python scripts/ingestion/ingest_prices.py

EIA endpoint: /petroleum/pri/spt/data/
Series:
    RBRTE — Europe Brent Spot Price FOB (dollars per barrel)
    RWTC  — West Texas Intermediate - Cushing (dollars per barrel)
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from . import config, eia_client
from .schema import OilPriceRecord
from .status import update_status

console = Console()


# ── EIA response → OilPriceRecord ────────────────────────────────────────────

def _raw_to_record(raw: dict[str, Any], crude_type: str) -> OilPriceRecord:
    """
    Map a single EIA data row to a validated OilPriceRecord.
    Raises ValidationError if the record fails schema checks.
    """
    value = raw.get("value")
    if value is None or value == "":
        raise ValueError(f"Missing value in EIA row: {raw}")

    return OilPriceRecord(
        date=raw["period"],                   # EIA monthly format: "YYYY-MM"
        crude_type=crude_type,                # type: ignore[arg-type]
        price_usd=float(value),
        unit="dollars per barrel",
        frequency="monthly",
        source="EIA",
        source_id=f"PET.{raw.get('series', '')}.M",
        source_url=config.EIA_PRICE_SOURCE_URL,
    )


# ── Fetch one series ──────────────────────────────────────────────────────────

def _fetch_series(crude_type: str, series_id: str) -> tuple[list[OilPriceRecord], list[str]]:
    """
    Fetch all monthly records for one crude type.
    Returns (valid_records, error_messages).
    """
    console.print(f"  Fetching [bold]{crude_type}[/] (series: {series_id})…", end=" ")

    raw_rows = eia_client.get_all(
        "petroleum/pri/spt/data/",
        {
            "frequency":         "monthly",
            "data[0]":           "value",
            f"facets[series][]": series_id,
            "start":             f"{config.START_YEAR}-01",
            "end":               f"{config.END_YEAR}-12",
            "sort[0][column]":   "period",
            "sort[0][direction]":"asc",
        },
    )

    console.print(f"[dim]{len(raw_rows)} rows[/]")

    records: list[OilPriceRecord] = []
    errors:  list[str] = []

    for row in raw_rows:
        try:
            records.append(_raw_to_record(row, crude_type))
        except (ValidationError, ValueError, KeyError) as exc:
            errors.append(f"{row.get('period', '?')}: {exc}")

    return records, errors


# ── Write output ──────────────────────────────────────────────────────────────

def _write(records: list[OilPriceRecord]) -> Path:
    """Atomic write to oil_price.json inside live/."""
    config.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = config.OUT_DIR / "oil_price.json"
    tmp_path = out_path.with_suffix(".json.tmp")

    payload = [r.model_dump(exclude_none=False) for r in records]
    # Explicitly set None fields (not excluded) so frontend TypeScript gets null
    # rather than missing keys, matching Gemini's null convention.

    tmp_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    tmp_path.rename(out_path)   # atomic on POSIX; near-atomic on Windows
    return out_path


# ── Summary table ─────────────────────────────────────────────────────────────

def _print_summary(records: list[OilPriceRecord], errors: list[str], out_path: Path) -> None:
    table = Table(title="Oil Price Ingestion Summary", show_header=True)
    table.add_column("Crude type")
    table.add_column("Records", justify="right")
    table.add_column("Date range")

    for ctype in ("Brent", "WTI"):
        subset = [r for r in records if r.crude_type == ctype]
        if subset:
            table.add_row(
                ctype,
                str(len(subset)),
                f"{subset[0].date} → {subset[-1].date}",
            )

    console.print(table)
    console.print(f"[green]✓[/] Written → [bold]{out_path}[/]")
    console.print(f"  Total: {len(records)} records | Errors: {len(errors)}")

    if errors:
        console.print(f"\n[yellow]Validation errors ({len(errors)}):[/]")
        for e in errors[:10]:
            console.print(f"  [red]•[/] {e}")
        if len(errors) > 10:
            console.print(f"  … and {len(errors) - 10} more")


# ── Entry point ───────────────────────────────────────────────────────────────

def run() -> int:
    """Fetch and write all price series. Returns 0 on success, 1 on total failure."""
    console.rule("[bold]EIA Oil Prices[/]")
    console.print(
        f"Range: [cyan]{config.START_YEAR}-01[/] → [cyan]{config.END_YEAR}-12[/]  "
        f"(monthly Brent + WTI)"
    )

    all_records: list[OilPriceRecord] = []
    all_errors:  list[str] = []

    for crude_type, series_id in config.EIA_PRICE_SERIES.items():
        try:
            records, errors = _fetch_series(crude_type, series_id)
            all_records.extend(records)
            all_errors.extend([f"{crude_type} {e}" for e in errors])
        except RuntimeError as exc:
            console.print(f"[red]✗ Fatal error fetching {crude_type}: {exc}[/]")
            return 1

    if not all_records:
        console.print("[red]✗ No records fetched — nothing written.[/]")
        return 1

    # Sort: date asc, then crude type for stable output
    all_records.sort(key=lambda r: (r.date, r.crude_type))

    out_path = _write(all_records)
    _print_summary(all_records, all_errors, out_path)

    # Write metadata for frontend DataStatus badge
    if all_records:
        update_status("price", {
            "source": "EIA Open Data API v2",
            "series": list(config.EIA_PRICE_SERIES.keys()),
            "record_count": len(all_records),
            "date_range": [all_records[0].date, all_records[-1].date],
            "frequency": "monthly",
            "error_count": len(all_errors),
        })

    return 0 if not all_errors else 1


if __name__ == "__main__":
    sys.exit(run())
