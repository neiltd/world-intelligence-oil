"""
Normalisation utilities: unit conversion, ISO3 mapping, data quality notes.

Gemini standardisation rules applied here:
  - All production values → kb/d (thousand barrels per day)
  - All reserves values  → Bbbl (billion barrels)
  - All country codes    → ISO3 (alpha-3)
  - Missing values       → None (never 0)
"""
from __future__ import annotations

from typing import Optional


# ── EIA country name → ISO3 ───────────────────────────────────────────────────
# EIA uses English country names in their international data API.
# This mapping covers all major oil producers and is the single source of truth
# for country resolution in the ingestion pipeline.

EIA_NAME_TO_ISO3: dict[str, str] = {
    # Americas
    "United States":             "USA",
    "Canada":                    "CAN",
    "Mexico":                    "MEX",
    "Brazil":                    "BRA",
    "Venezuela":                 "VEN",
    "Colombia":                  "COL",
    "Ecuador":                   "ECU",
    "Argentina":                 "ARG",
    "Trinidad and Tobago":       "TTO",
    # Middle East
    "Saudi Arabia":              "SAU",
    "Iraq":                      "IRQ",
    "Iran":                      "IRN",
    "United Arab Emirates":      "ARE",
    "Kuwait":                    "KWT",
    "Qatar":                     "QAT",
    "Oman":                      "OMN",
    "Bahrain":                   "BHR",
    "Yemen":                     "YEM",
    # Europe / Eurasia
    "Russia":                    "RUS",
    "Russian Federation":        "RUS",
    "Norway":                    "NOR",
    "Kazakhstan":                "KAZ",
    "Azerbaijan":                "AZE",
    "United Kingdom":            "GBR",
    "Denmark":                   "DNK",
    # Africa
    "Nigeria":                   "NGA",
    "Libya":                     "LBY",
    "Algeria":                   "DZA",
    "Angola":                    "AGO",
    "Gabon":                     "GAB",
    "Congo":                     "COG",
    "Congo-Brazzaville":         "COG",   # EIA alternate name
    "Equatorial Guinea":         "GNQ",
    "Ghana":                     "GHA",
    "Sudan":                     "SDN",
    "South Sudan":               "SSD",
    # Asia Pacific
    "China":                     "CHN",
    "India":                     "IND",
    "Indonesia":                 "IDN",
    "Malaysia":                  "MYS",
    "Australia":                 "AUS",
    "Vietnam":                   "VNM",
    "Brunei":                    "BRN",
    "Papua New Guinea":          "PNG",
    # Other
    "Timor-Leste":               "TLS",
}

# Countries whose EIA codes may already be ISO3 (EIA countryRegionId field)
# — used as a fallback when the name lookup fails.
_LIKELY_ISO3: set[str] = set(EIA_NAME_TO_ISO3.values())


def eia_name_to_iso3(name: str, code: str = "") -> Optional[str]:
    """
    Resolve an EIA country name (and optionally code) to ISO3.
    Returns None if unmapped — the caller decides whether to skip or warn.
    """
    # Try exact name match first
    if name in EIA_NAME_TO_ISO3:
        return EIA_NAME_TO_ISO3[name]
    # Some EIA country codes are already ISO3 (3 uppercase letters)
    if code and len(code) == 3 and code.isupper() and code in _LIKELY_ISO3:
        return code
    return None


# ── OPEC membership ───────────────────────────────────────────────────────────
# As of 2024. Ecuador suspended membership; Gabon was suspended in 2023.
# Update this set when membership changes.

OPEC_MEMBERS: set[str] = {
    "SAU", "IRQ", "IRN", "KWT", "ARE", "LBY", "DZA",
    "NGA", "GAB", "COG", "GNQ", "VEN",
}

# Countries where EIA data quality is known to be limited.
# The data_year_note field in output records will include these.
DATA_QUALITY_NOTES: dict[str, str] = {
    "RUS": "Production estimates uncertain post-2022 due to sanctions — based on secondary sources",
    "IRN": "Production affected by active US sanctions — EIA estimate based on secondary sources",
    "CAN": "Reserves include oil sands (recoverable bitumen); conventional reserves are much lower",
    "VEN": "Largest proven reserves globally (extra-heavy oil); production constrained by sanctions and underinvestment",
}


# ── Unit conversion ───────────────────────────────────────────────────────────

def to_kbd(value: float, unit: str) -> Optional[float]:
    """
    Normalise a production or trade value to kb/d (thousand barrels per day).
    Returns None if the unit is unrecognised rather than silently emitting wrong data.

    EIA abbreviations observed in the wild:
        'TBPD'  — Thousand Barrels Per Day  (EIA international API)
        'MBPD'  — Million Barrels Per Day
        'BBPD'  — Billion Barrels Per Day   (rare)
    """
    u = unit.lower().strip()
    # EIA abbreviations (checked first — fast path for international data)
    if u == "tbpd":                                        # Thousand Barrels Per Day
        return round(value, 2)
    if u == "mbpd":                                        # Million Barrels Per Day
        return round(value * 1_000, 2)
    # Full strings
    if "thousand barrels per day" in u or "kb/d" in u:
        return round(value, 2)
    if "million barrels per day" in u or "mb/d" in u:
        return round(value * 1_000, 2)
    if "barrels per day" in u:                             # bare "barrels per day" → bpd
        return round(value / 1_000, 2)
    # Annual volume → daily rate (approximate)
    if "million barrels" in u and "year" in u:
        return round((value * 1_000) / 365, 2)
    if "thousand barrels" in u and "year" in u:
        return round(value / 365, 2)
    return None  # unrecognised — caller logs and skips


def to_bbbl(value: float, unit: str) -> Optional[float]:
    """
    Normalise a reserves value to Bbbl (billion barrels).
    Returns None if unit is unrecognised.

    EIA abbreviations observed in the wild:
        'BBLS'   — Billion Barrels
        'MMBBLS' — Million Barrels
    """
    u = unit.lower().strip()
    # EIA abbreviations
    if u == "bbls":                                        # EIA: Billion Barrels
        return round(value, 3)
    if u in ("mmbbls", "mmbbl"):                           # EIA: Million Barrels
        return round(value / 1_000, 3)
    # Full strings
    if "billion barrels" in u or "bbbl" in u:
        return round(value, 3)
    if "million barrels" in u:
        return round(value / 1_000, 3)
    if "trillion barrels" in u:
        return round(value * 1_000, 3)
    return None
