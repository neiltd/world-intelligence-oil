"""
Fetch country-level oil production from EIA International Data API v2.

Output: frontend/src/data/oil/live/oil_country_supply.json

Run standalone:
    python scripts/ingestion/ingest_supply.py

EIA endpoint: /international/data/
Product ID 53: Total petroleum and other liquids (EIA's standard international metric)
Activity ID 1: Production

IMPORTANT — RESERVES NOT AVAILABLE VIA EIA API:
    International proved reserves are published by EIA as static annual reports,
    not as a queryable API endpoint. The /petroleum/crd/pres/ route is US-only.
    Reserves fields will be written as null for all records.
    To add reserves data, use one of these alternative sources:
      - Our World in Data (OWID) energy CSV  — free, covers 1900-present
      - Energy Institute Statistical Review  — annual, most authoritative
      - BP Statistical Review                — same data, alternate format
    Add a second ingestion script (ingest_reserves_owid.py) to populate reserves
    by joining on (iso3, year).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Optional

from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from . import config, eia_client
from .status import update_status
from .normalise import (
    DATA_QUALITY_NOTES,
    EIA_NAME_TO_ISO3,
    OPEC_MEMBERS,
    eia_name_to_iso3,
    to_bbbl,
    to_kbd,
)
from .schema import OilCountrySupplyRecord

console = Console()

# EIA uses '--' to indicate redacted, withheld, or not-available data.
# This is distinct from 0 (confirmed zero) and must be treated as null.
_EIA_NULL_SENTINELS: frozenset[str] = frozenset({"--", "NA", "N/A", "nan", ""})


    # (Activity ID discovery removed — EIA facets endpoint returns empty list for
    #  international/data/. Activity IDs are confirmed constants: Production=1.)


# ── EIA data fetch ────────────────────────────────────────────────────────────

def _fetch_activity(activity_id: str, label: str) -> list[dict[str, Any]]:
    """
    Fetch all records for one activity across all countries and years.
    Returns raw EIA data rows.
    """
    console.print(f"  Fetching [bold]{label}[/] (activityId={activity_id})…", end=" ")

    rows = eia_client.get_all(
        "international/data/",
        {
            "frequency":             "annual",
            "data[0]":               "value",
            "facets[activityId][]":  activity_id,
            "facets[productId][]":   config.EIA_PRODUCT_CRUDE,
            "start":                 str(config.START_YEAR),
            "end":                   str(config.END_YEAR),
            "sort[0][column]":       "period",
            "sort[0][direction]":    "asc",
        },
    )
    console.print(f"[dim]{len(rows)} rows[/]")
    return rows


# ── Row normalisation ─────────────────────────────────────────────────────────

def _is_null(raw: Any) -> bool:
    """True if the raw EIA value should be treated as null (not zero, not valid)."""
    if raw is None:
        return True
    return str(raw).strip() in _EIA_NULL_SENTINELS


def _parse_production_row(row: dict[str, Any]) -> Optional[tuple[str, int, float]]:
    """
    Parse a production row → (iso3, year, value_kbd).
    Returns None if the row cannot be usefully normalised.
    """
    name = row.get("countryRegionName", "")
    code = row.get("countryRegionId", "")
    iso3 = eia_name_to_iso3(name, code)
    if not iso3:
        return None

    raw_value = row.get("value")
    if _is_null(raw_value):
        return None   # EIA null sentinel — skip, don't store as 0

    unit = row.get("unit", "")
    try:
        kbd = to_kbd(float(str(raw_value)), unit)
    except (ValueError, TypeError):
        return None

    if kbd is None:
        console.print(f"    [yellow]⚠[/] Unrecognised production unit for {name}: {unit!r}")
        return None

    if kbd == 0:
        return None   # 0 kb/d is valid but extremely rare; skip unless verified

    return iso3, int(row["period"]), kbd


def _parse_reserves_row(row: dict[str, Any]) -> Optional[tuple[str, int, float]]:
    """
    Parse a reserves row → (iso3, year, value_bbbl).
    Returns None if the row cannot be usefully normalised.
    """
    name = row.get("countryRegionName", "")
    code = row.get("countryRegionId", "")
    iso3 = eia_name_to_iso3(name, code)
    if not iso3:
        return None

    raw_value = row.get("value")
    if _is_null(raw_value):
        return None

    unit = row.get("unit", "")
    try:
        bbbl = to_bbbl(float(str(raw_value)), unit)
    except (ValueError, TypeError):
        return None

    if bbbl is None:
        console.print(f"    [yellow]⚠[/] Unrecognised reserves unit for {name}: {unit!r}")
        return None

    if bbbl == 0:
        return None

    return iso3, int(row["period"]), bbbl


# ── Merge production + reserves ───────────────────────────────────────────────

def _merge(
    prod_rows:     list[dict[str, Any]],
    reserves_rows: list[dict[str, Any]],
) -> tuple[list[OilCountrySupplyRecord], list[str]]:
    """
    Join production and reserves data on (iso3, year) and build supply records.
    Returns (valid_records, error_messages).
    """
    prod_map:     dict[tuple[str, int], float] = {}
    reserves_map: dict[tuple[str, int], float] = {}
    unmapped: set[str] = set()

    for row in prod_rows:
        parsed = _parse_production_row(row)
        if parsed:
            prod_map[(parsed[0], parsed[1])] = parsed[2]
        else:
            name = row.get("countryRegionName", "")
            if name and name not in EIA_NAME_TO_ISO3 and not _is_null(row.get("value")):
                unmapped.add(name)

    for row in reserves_rows:
        parsed = _parse_reserves_row(row)
        if parsed:
            reserves_map[(parsed[0], parsed[1])] = parsed[2]

    if unmapped:
        console.print(
            f"\n  [dim]Skipped {len(unmapped)} unmapped country names. "
            f"Add to normalise.EIA_NAME_TO_ISO3 to include them.[/]"
        )

    all_keys = set(prod_map.keys()) | set(reserves_map.keys())
    records: list[OilCountrySupplyRecord] = []
    errors:  list[str] = []

    for iso3, year in sorted(all_keys):
        country_name = next(
            (k for k, v in EIA_NAME_TO_ISO3.items() if v == iso3), iso3
        )
        production = prod_map.get((iso3, year))        # None = unknown (Gemini null rule)
        reserves   = reserves_map.get((iso3, year))    # None = unknown

        try:
            record = OilCountrySupplyRecord(
                country=country_name,
                iso3=iso3,
                year=year,
                reserves=reserves,
                unit_reserves="billion barrels",
                production=production,
                unit_production="thousand barrels per day",
                exports=None,
                imports=None,
                opec_member=(iso3 in OPEC_MEMBERS),
                source="EIA",
                source_id=f"INTL.57-{{1,3}}-{iso3}-TBPD.A",
                source_url=config.EIA_SUPPLY_SOURCE_URL,
                data_year_note=DATA_QUALITY_NOTES.get(iso3),
            )
            records.append(record)
        except ValidationError as exc:
            errors.append(f"{iso3}/{year}: {exc}")

    return records, errors


# ── Write ─────────────────────────────────────────────────────────────────────

def _write(records: list[OilCountrySupplyRecord]) -> Path:
    config.OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = config.OUT_DIR / "oil_country_supply.json"
    tmp_path = out_path.with_suffix(".json.tmp")

    payload = [r.model_dump() for r in records]
    tmp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp_path.rename(out_path)
    return out_path


# ── Summary ───────────────────────────────────────────────────────────────────

def _print_summary(
    records: list[OilCountrySupplyRecord],
    errors:  list[str],
    out_path: Path,
    reserves_rows: int,
) -> None:
    countries = sorted({r.iso3 for r in records})
    years     = sorted({r.year for r in records})

    table = Table(title="Oil Supply Ingestion Summary", show_header=True)
    table.add_column("Stat")
    table.add_column("Value", justify="right")
    table.add_row("Countries",          str(len(countries)))
    table.add_row("Year range",         f"{years[0]} → {years[-1]}" if years else "—")
    table.add_row("Total records",      str(len(records)))
    table.add_row("With production",    str(sum(1 for r in records if r.production is not None)))
    table.add_row("With reserves",      str(sum(1 for r in records if r.reserves   is not None)))
    table.add_row("Reserves rows raw",  str(reserves_rows))
    table.add_row("Validation errors",  str(len(errors)))

    console.print(table)
    console.print(f"[green]✓[/] Written → [bold]{out_path}[/]")

    if errors:
        console.print(f"\n[yellow]Validation errors ({len(errors)}):[/]")
        for e in errors[:10]:
            console.print(f"  [red]•[/] {e}")
        if len(errors) > 10:
            console.print(f"  … and {len(errors) - 10} more")


# ── Entry point ───────────────────────────────────────────────────────────────

def run() -> int:
    console.rule("[bold]EIA Oil Supply — Production[/]")
    console.print(
        f"Range: [cyan]{config.START_YEAR}[/] → [cyan]{config.END_YEAR}[/]  "
        f"(annual, all available countries)"
    )
    console.print(
        "  [dim]Metric: Total petroleum and other liquids (productId=53, activityId=1)[/]"
    )
    console.print(
        "  [dim]Reserves: not available via EIA API — written as null. "
        "See script docstring for alternative sources.[/]"
    )

    try:
        prod_rows = _fetch_activity(config.EIA_ACTIVITY_PRODUCTION, "Production")
    except RuntimeError as exc:
        console.print(f"[red]✗ Fatal error fetching EIA data: {exc}[/]")
        return 1

    if not prod_rows:
        console.print("[red]✗ No production rows fetched — nothing written.[/]")
        return 1

    # Reserves not available from EIA API — pass empty list, all reserves → null
    records, errors = _merge(prod_rows, [])

    if not records:
        console.print("[red]✗ No records produced — nothing written.[/]")
        return 1

    out_path = _write(records)
    _print_summary(records, errors, out_path, reserves_rows=0)

    # Write metadata for frontend DataStatus badge
    if records:
        years = sorted({r.year for r in records})
        update_status("supply", {
            "source": "EIA Open Data API v2",
            "metric": "Total petroleum and other liquids (kb/d)",
            "record_count": len(records),
            "country_count": len({r.iso3 for r in records}),
            "year_range": [years[0], years[-1]],
            "reserves_available": False,
            "error_count": len(errors),
        })

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(run())
