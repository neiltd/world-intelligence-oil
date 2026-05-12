# Oil Data Standardization & Taxonomy Specification

This document defines the canonical standards for the World Intelligence Oil MVP to ensure data integrity, consistency, and interoperability across all sources.

## 1. Canonical Units & Conversions

To ensure comparative analysis, all data must be converted to these canonical units before storage.

| Metric | Canonical Unit | Abbreviation | Notes |
| :--- | :--- | :--- | :--- |
| **Crude Prices** | US Dollars per Barrel | USD/bbl | |
| **Oil Production** | Thousand Barrels per Day | kb/d | EIA Standard |
| **Oil Reserves** | Billion Barrels | Bbbl | Proved reserves only |
| **Imports/Exports**| Thousand Barrels per Day | kb/d | |

### Conversion Factors
If sources provide data in non-canonical units, the following multipliers must be used:
- **Tonnes to Barrels:** 1 metric tonne ≈ 7.33 barrels (Global average for crude).
- **Million Barrels per Year to kb/d:** (Value * 1000) / 365.
- **Barrels to Billion Barrels:** Value / 1,000,000,000.

## 2. Temporal & Frequency Rules

- **Price Data:** Primary frequency is **Daily**. Monthly averages should be derived from daily data where possible.
- **Supply Data:** Primary frequency is **Annual**. Monthly data (from EIA/JODI) should be used for the current year only, then superseded by final annual reports.
- **Date Format:** All dates must follow ISO 8601 (`YYYY-MM-DD`).

## 3. Source Precedence & Validation

When data exists in multiple sources, use the following hierarchy:
1. **EIA (International API):** Primary for Production, Reserves, and Prices.
2. **EI Statistical Review:** Secondary for "Ground Truth" annual validation and Trade Matrix.
3. **World Bank Pink Sheet:** Primary for Dubai Crude and long-term historical price series.
4. **OPEC Annual Statistical Bulletin:** Supplemental for OPEC member-specific production and reserves.

## 4. Geography & Naming Conventions

- **Country Codes:** Strictly follow **ISO 3166-1 alpha-3 (ISO3)**.
- **Country Names:** Use the English short name from the ISO standard.
- **OPEC Classification:**
    - `opec_member`: Boolean (True for current members).
    - `opec_plus`: Boolean (True for members of the Declaration of Cooperation, e.g., Russia, Kazakhstan).

## 5. Missing & Disputed Data Handling

- **Missing Values:** Represent as `null` in JSON. Do not use `0` as it skews averages.
- **Interpolation:** Linear interpolation is permitted for annual supply data missing a single year between two data points.
- **Disputed Data:** Where "Official" figures and "Secondary Sources" (e.g., OPEC vs. IEA) differ by >10%, flag the record with `disputed: true`.

## 6. Crude Type Taxonomy

- **Benchmarks:** `Brent`, `WTI`, `Dubai`.
- **Grade Categories:** `Light Sweet`, `Medium Sour`, `Heavy Sour`.

## 7. Event Taxonomy (Future-Ready)

Events must be categorized into one of the following primary types:
- `opec`: Meetings, quota changes, press releases.
- `conflict`: War, attacks on infrastructure, piracy.
- `sanction`: Diplomatic/economic restrictions on trade.
- `infrastructure`: Pipeline leaks, refinery shutdowns, shipping delays (Suez/Panama).
- `trade`: New trade deals, major state-level contracts.
- `economic`: GDP growth, inflation data, central bank rate changes affecting oil demand.

---

*Last Updated: 2026-05-11*
