# Shared Intelligence Hub — Data Import Contract

This directory is the boundary between the shared intelligence hub and this project.

The hub writes to `data/imports/`. This project reads from `frontend/src/data/imports/` (which mirrors the same files). Components access data only through the adapter at `frontend/src/data/imports/adapter.ts` — never by importing hub files directly.

---

## Architecture Rule

```
Shared Hub (external project)
  │  writes
  ▼
data/imports/*.json          ← hub deposit point (repo root)
  │
  │  copied / symlinked into
  ▼
frontend/src/data/imports/   ← Vite bundler sees these
  │
  │  imported by
  ▼
frontend/src/data/imports/adapter.ts
  │
  │  called by
  ▼
OilPriceChart, OilMapLayer, CountryPanel, OilEventTimeline, App.tsx
```

**This project does NOT call external APIs.** EIA, ACLED, OPEC, GDELT, World Bank, OFAC — all are the hub's responsibility. API keys live in the hub project, not here.

---

## Files

| File | Schema | Status | Hub Source |
|------|--------|--------|-----------|
| `manifest.json` | see below | required | hub metadata |
| `price-series.json` | `OilPriceRecord[]` | pending | EIA spot prices (Brent, WTI, Dubai) |
| `energy-indicators.json` | `OilCountrySupplyRecord[]` | pending | EIA + EI reserves |
| `events.json` | `OilEventRecord[]` | pending | OPEC, OFAC, ACLED, IMFPortWatch |
| `macro-indicators.json` | `MacroIndicatorRecord[]` | planned | World Bank, IMF |

---

## Schema: `manifest.json`

```json
{
  "schema_version": "1.0",
  "generated_by": "world-intelligence-hub",
  "generated_at": "2026-05-12T10:00:00Z",
  "hub_version": "0.1.0",
  "datasets": {
    "energy-indicators": { "file": "energy-indicators.json", "status": "live" },
    "price-series":      { "file": "price-series.json",      "status": "live" },
    "events":            { "file": "events.json",            "status": "live" },
    "macro-indicators":  { "file": "macro-indicators.json",  "status": "pending" }
  }
}
```

When `status = "live"`, the corresponding file must be non-empty and schema-valid.

---

## Schema: `price-series.json`

Array of `OilPriceRecord`. TypeScript type: `frontend/src/types/oil.ts`.

```json
[
  {
    "date":       "2024-01",
    "crude_type": "Brent",
    "price_usd":  78.01,
    "unit":       "dollars per barrel",
    "frequency":  "monthly",
    "source":     "EIA",
    "source_id":  "PET.RBRTE.M",
    "source_url": "https://api.eia.gov/v2/petroleum/pri/spt/data/"
  }
]
```

**Constraints:**
- `crude_type`: `"Brent" | "WTI" | "Dubai"`
- `frequency`: `"daily" | "monthly"` (Dubai is monthly only)
- `source`: `"EIA" | "WorldBank"` for price data
- `date`: ISO 8601 — `"YYYY-MM"` monthly, `"YYYY-MM-DD"` daily
- `price_usd`: positive float, must not be null (omit the record if unknown)

---

## Schema: `energy-indicators.json`

Array of `OilCountrySupplyRecord`.

```json
[
  {
    "country":         "Saudi Arabia",
    "iso3":            "SAU",
    "year":            2023,
    "reserves":        267.0,
    "unit_reserves":   "billion barrels",
    "production":      11413.0,
    "unit_production": "thousand barrels per day",
    "exports":         null,
    "imports":         null,
    "opec_member":     true,
    "source":          "EIA",
    "source_id":       "INTL.57-1-SAU-TBPD.A",
    "source_url":      "https://api.eia.gov/v2/international/data/",
    "data_year_note":  null
  }
]
```

**Constraints:**
- `iso3`: ISO 3166-1 alpha-3, 3 uppercase letters
- `year`: integer 1960–2030
- `reserves` / `production` / `exports` / `imports`: `number | null` — use `null` for unknown, never `0`
- `unit_reserves`: always `"billion barrels"` (Bbbl)
- `unit_production`: always `"thousand barrels per day"` (kb/d)
- Multiple records per country (one per year) — the adapter picks the most recent

---

## Schema: `events.json`

Array of `OilEventRecord`.

```json
[
  {
    "event_id":        "e58d2b02-1234-4567-890a-1234567890ab",
    "date":            "2024-06-02",
    "country":         "Saudi Arabia",
    "iso3":            "SAU",
    "event_type":      "opec",
    "title":           "OPEC+ Extends Production Cuts Through 2024",
    "summary":         "OPEC+ agreed to extend voluntary cuts of 2.2 mb/d...",
    "source":          "OPEC",
    "source_url":      "https://www.opec.org/...",
    "confidence_level":"high",
    "related_asset":   "oil"
  }
]
```

**Constraints:**
- `event_type`: `"conflict" | "sanction" | "opec" | "infrastructure" | "trade" | "economic" | "weather" | "accident"`
- `confidence_level`: `"high" | "medium" | "low"`
- `iso3`: nullable — some events are global (e.g. OPEC+ announcements)
- `date`: ISO 8601 `"YYYY-MM-DD"`
- `related_asset`: always `"oil"` in this project
- **Deduplication key**: `(date, iso3, event_type)` — hub must deduplicate before export

---

## Fallback Behavior

When a hub file is empty (`[]`), the adapter falls back to locally-ingested data:

| Hub file | Fallback |
|----------|---------|
| `price-series.json` | `frontend/src/data/oil/live/oil_price.json` |
| `energy-indicators.json` | `frontend/src/data/oil/live/oil_country_supply.json` |
| `events.json` | `frontend/src/data/oil/oil_events_sample.json` |

This means the application always renders. The `DataStatus` badge shows whether hub data or local data is active.

---

## Hub Delivery Protocol

1. Hub runs its ingestion pipeline
2. Hub validates output against these schemas (Pydantic or equivalent)
3. Hub writes to `data/imports/*.json` (this directory)
4. Hub updates `manifest.json` with `generated_at` and `status: "live"` for each delivered dataset
5. Vite HMR or CI rebuild picks up the new files
6. `DataStatus` badge reflects hub connection status

**Do not write partial files.** Write to a `.tmp` file, then rename. This prevents the frontend from reading a file mid-write.

---

## Adding a New Dataset

1. Add an entry to `manifest.json`
2. Create the stub file (`[]` or `{}`)
3. Add the import and adapter function to `frontend/src/data/imports/adapter.ts`
4. Add the TypeScript type to `frontend/src/types/`
5. Update this document
