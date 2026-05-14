"""
Integrate country-level oil proved reserves into oil_country_supply.json.

Default source: scripts/data/reserves_ei_2023.csv
  — Curated EI Statistical Review 2024 (covering 2023 figures) for all 43 countries
    in the production dataset. EI/BP figures represent the industry-standard proved
    reserves estimates, including OPEC self-reported numbers.

Optional source: OWID (--source owid)
  — Downloads https://ourworldindata.org/grapher/oil-proved-reserves.csv
  — METHODOLOGY WARNING: OWID uses EIA's more conservative independent estimates
    (~40 Bbbl for Saudi Arabia vs 267 Bbbl in EI/BP).  Different methodology from
    the default seed. Enable only if you explicitly want EIA-methodology reserves.

Join strategy:
  1. Exact (iso3, year) match → use directly
  2. Nearest year within ±YEAR_TOLERANCE → use with note appended to data_year_note
  3. No match within tolerance → keep null

Run:
    python scripts/ingest.py reserves              # seed (default)
    python scripts/ingest.py reserves --source owid  # OWID download

Output: frontend/src/data/oil/live/oil_country_supply.json  (updated in-place)
"""
from __future__ import annotations

import csv
import io
import json
import sys
from pathlib import Path
from typing import Any, Optional

from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from . import config
from .schema import OilCountrySupplyRecord
from .status import update_status

console = Console()

# ── Constants ─────────────────────────────────────────────────────────────────

SEED_PATH = Path(__file__).parent.parent / "data" / "reserves_ei_2023.csv"
OWID_URL  = "https://ourworldindata.org/grapher/oil-proved-reserves.csv"

# Accept reserves from a year within this window of the production record year.
# Proved reserves change slowly; ±5 years is reasonable for annual data.
YEAR_TOLERANCE = 5

SUPPLY_PATH = config.OUT_DIR / "oil_country_supply.json"


# ── Source: curated EI seed CSV ───────────────────────────────────────────────

def _load_seed() -> dict[str, dict[int, tuple[float, str]]]:
    """
    Read reserves_ei_2023.csv → { iso3: { year: (bbbl, notes) } }
    """
    if not SEED_PATH.exists():
        raise FileNotFoundError(
            f"Seed file not found: {SEED_PATH}\n"
            "It should be committed to the repository."
        )

    data: dict[str, dict[int, tuple[float, str]]] = {}
    with SEED_PATH.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            iso3  = row["iso3"].strip()
            year  = int(row["year"])
            bbbl  = float(row["reserves_bbbl"])
            notes = row.get("notes", "").strip()
            data.setdefault(iso3, {})[year] = (bbbl, notes)

    console.print(
        f"  Seed: [bold]{len(data)}[/] countries · "
        f"source: EI Statistical Review 2024"
    )
    return data


# ── Source: OWID download ─────────────────────────────────────────────────────

def _load_owid() -> dict[str, dict[int, tuple[float, str]]]:
    """
    Download OWID oil-proved-reserves CSV.
    Values are in barrels; divide by 1e9 to get Bbbl.

    METHODOLOGY NOTE: OWID uses EIA independent estimates (~40 Bbbl for Saudi
    Arabia) rather than EI/BP self-reported figures (267 Bbbl).  Values will
    differ significantly from the seed.
    """
    import requests  # only imported when actually needed

    console.print(
        "  [yellow]⚠ OWID source: EIA methodology differs from EI/BP standard.[/]"
    )
    console.print(f"  Downloading {OWID_URL}…", end=" ")

    resp = requests.get(OWID_URL, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    console.print("[dim]done[/]")

    data: dict[str, dict[int, tuple[float, str]]] = {}
    reader = csv.DictReader(io.StringIO(resp.text))
    col = reader.fieldnames[-1] if reader.fieldnames else "Oil proved reserves"

    for row in reader:
        code = row.get("Code", "").strip()
        # Skip OWID aggregate regions (e.g. OWID_WRL, OWID_AFR)
        if not (len(code) == 3 and code.isalpha() and code.isupper()):
            continue
        raw = row.get(col, "").strip()
        if not raw:
            continue
        try:
            bbbl = float(raw) / 1e9   # barrels → Bbbl
        except ValueError:
            continue
        year = int(row["Year"])
        note = "OWID / EIA methodology (EIA independent estimate — differs from EI/BP)"
        data.setdefault(code, {})[year] = (bbbl, note)

    console.print(f"  OWID: [bold]{len(data)}[/] countries · latest year: {max(y for d in data.values() for y in d)}")
    return data


# ── Join logic ────────────────────────────────────────────────────────────────

def _find_reserves(
    reserves_data: dict[str, dict[int, tuple[float, str]]],
    iso3: str,
    year: int,
) -> Optional[tuple[float, str, int]]:
    """
    Find the best reserves match for (iso3, year).
    Returns (bbbl, note, matched_year) or None.
    """
    country_data = reserves_data.get(iso3)
    if not country_data:
        return None

    # Exact match
    if year in country_data:
        bbbl, note = country_data[year]
        return bbbl, note, year

    # Nearest year within tolerance
    candidates = [
        (abs(y - year), y, v)
        for y, v in country_data.items()
        if abs(y - year) <= YEAR_TOLERANCE
    ]
    if not candidates:
        return None

    _, nearest_year, (bbbl, base_note) = min(candidates)
    note = f"Reserves from {nearest_year} (nearest available)"
    if base_note:
        note = f"{base_note} · {note}"
    return bbbl, note, nearest_year


def _join(
    supply: list[dict[str, Any]],
    reserves_data: dict[str, dict[int, tuple[float, str]]],
) -> tuple[list[OilCountrySupplyRecord], list[str], dict[str, int]]:
    """
    For each supply record, look up and attach reserves.
    Returns (validated_records, errors, stats).
    """
    records: list[OilCountrySupplyRecord] = []
    errors:  list[str] = []
    stats = {"exact": 0, "nearest": 0, "no_match": 0, "validation_error": 0}

    for raw in supply:
        iso3 = raw["iso3"]
        year = raw["year"]

        match = _find_reserves(reserves_data, iso3, year)
        if match is None:
            stats["no_match"] += 1
            reserves_val = None
            note_update  = raw.get("data_year_note")
        else:
            bbbl, res_note, matched_year = match
            reserves_val = bbbl
            if matched_year == year:
                stats["exact"] += 1
            else:
                stats["nearest"] += 1

            # Merge notes: keep production note, append reserves provenance
            existing_note = raw.get("data_year_note") or ""
            res_tag = f"Reserves: {res_note}"
            note_update = f"{existing_note} · {res_tag}".lstrip(" · ") if existing_note else res_tag

        try:
            rec = OilCountrySupplyRecord(
                country          = raw["country"],
                iso3             = iso3,
                year             = year,
                reserves         = reserves_val,
                unit_reserves    = "billion barrels",
                production       = raw.get("production"),
                unit_production  = "thousand barrels per day",
                exports          = raw.get("exports"),
                imports          = raw.get("imports"),
                opec_member      = raw["opec_member"],
                source           = raw.get("source", "EIA"),     # type: ignore[arg-type]
                source_id        = raw.get("source_id"),
                source_url       = raw.get("source_url"),
                data_year_note   = note_update or None,
            )
            records.append(rec)
        except ValidationError as exc:
            stats["validation_error"] += 1
            errors.append(f"{iso3}/{year}: {exc}")
            # Keep the original record (without reserves) rather than dropping it
            try:
                fallback = OilCountrySupplyRecord(**{**raw, "reserves": None})
                records.append(fallback)
            except ValidationError:
                pass

    return records, errors, stats


# ── Write ─────────────────────────────────────────────────────────────────────

def _write(records: list[OilCountrySupplyRecord]) -> Path:
    payload = [r.model_dump() for r in records]
    tmp = SUPPLY_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.rename(SUPPLY_PATH)
    return SUPPLY_PATH


# ── Summary ───────────────────────────────────────────────────────────────────

def _print_summary(
    records: list[OilCountrySupplyRecord],
    errors:  list[str],
    stats:   dict[str, int],
    out_path: Path,
    source_label: str,
) -> None:
    table = Table(title=f"Reserves Join Summary — {source_label}", show_header=True)
    table.add_column("Stat")
    table.add_column("Value", justify="right")

    all_countries   = {r.iso3 for r in records}
    countries_with  = {r.iso3 for r in records if r.reserves is not None}
    # Countries with zero reserves across ALL their years (truly missing)
    countries_never = all_countries - countries_with
    years = sorted({r.year for r in records})

    table.add_row("Records processed",            str(len(records)))
    table.add_row("Records with reserves",        str(sum(1 for r in records if r.reserves is not None)))
    table.add_row("Records without (early years)",str(stats.get("no_match", 0)))
    table.add_row("Exact year match",             str(stats.get("exact",    0)))
    table.add_row("Nearest year match",           str(stats.get("nearest",  0)))
    table.add_row("Countries with any reserves",  str(len(countries_with)))
    table.add_row("Countries with no reserves",   str(len(countries_never)))
    table.add_row("Validation errors",            str(len(errors)))

    console.print(table)
    console.print(f"[green]✓[/] Written → [bold]{out_path}[/]")

    if countries_never:
        console.print(
            f"\n  [dim]Countries with no reserves data at all: "
            f"{', '.join(sorted(countries_never))}[/]"
        )
    if errors:
        console.print(f"\n[yellow]Validation errors ({len(errors)}):[/]")
        for e in errors[:10]:
            console.print(f"  [red]•[/] {e}")


# ── Entry point ───────────────────────────────────────────────────────────────

def run(source: str = "seed") -> int:
    console.rule("[bold]Oil Reserves Integration[/]")

    # Load supply
    if not SUPPLY_PATH.exists():
        console.print(
            f"[red]✗ Supply file not found: {SUPPLY_PATH}[/]\n"
            "  Run: python scripts/ingest.py supply"
        )
        return 1

    supply = json.loads(SUPPLY_PATH.read_text(encoding="utf-8"))
    console.print(f"  Loaded {len(supply)} supply records from {SUPPLY_PATH.name}")

    # Load reserves
    console.print(f"  Source: [bold]{source}[/]")
    try:
        if source == "owid":
            reserves_data = _load_owid()
        else:
            reserves_data = _load_seed()
    except (FileNotFoundError, RuntimeError) as exc:
        console.print(f"[red]✗ {exc}[/]")
        return 1

    # Join + validate
    records, errors, stats = _join(supply, reserves_data)

    if not records:
        console.print("[red]✗ No records produced.[/]")
        return 1

    source_label = "EI Statistical Review 2024" if source == "seed" else "OWID/EIA"
    out_path = _write(records)
    _print_summary(records, errors, stats, out_path, source_label)

    # Update data_status.json
    countries_with_reserves = sorted({r.iso3 for r in records if r.reserves is not None})
    years = sorted({r.year for r in records if r.reserves is not None})

    update_status("reserves", {
        "source": "EI Statistical Review 2024 (curated seed)" if source == "seed"
                  else "Our World in Data / EIA (downloaded)",
        "methodology": "EI/BP self-reported proved reserves" if source == "seed"
                       else "EIA independent estimates (conservative)",
        "seed_file": str(SEED_PATH.name),
        "country_count": len(countries_with_reserves),
        "year_range": [years[0], years[-1]] if years else [None, None],
        "exact_matches": stats.get("exact", 0),
        "nearest_matches": stats.get("nearest", 0),
        "year_tolerance": YEAR_TOLERANCE,
        "error_count": len(errors),
    })

    # Flip reserves_available in the supply section
    from .status import _STATUS_PATH
    if _STATUS_PATH.exists():
        existing = json.loads(_STATUS_PATH.read_text(encoding="utf-8"))
        if "supply" in existing.get("datasets", {}):
            existing["datasets"]["supply"]["reserves_available"] = True
            existing["datasets"]["supply"]["reserves_source"] = source_label
            tmp = _STATUS_PATH.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
            tmp.rename(_STATUS_PATH)

    return 0 if not errors else 1


if __name__ == "__main__":
    src = "owid" if "--source" in sys.argv and "owid" in sys.argv else "seed"
    sys.exit(run(source=src))
