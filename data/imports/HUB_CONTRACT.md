# World Intelligence Hub — Data Import Contract
# world-intelligence-oil consumer spec · schema_version: 1.1

This directory (`data/imports/`) is the handoff boundary between **world-intelligence-data-hub** and **world-intelligence-oil**.

The hub writes here. This project reads. Nothing else crosses this boundary.

---

## Ecosystem Rule

```
world-intelligence-data-hub
  owns: EIA, ACLED, GDELT, OFAC, OPEC, IMFPortWatch, NewsAPI credentials
  owns: ingestion, normalization, deduplication, geocoding, caching
  writes: data/imports/*.json

world-intelligence-oil
  owns: oil intelligence UX
  reads: data/imports/*.json via src/data/imports/adapter.ts
  NEVER calls external APIs
  NEVER stores credentials
```

---

## Hub Delivery Protocol

1. Hub pipeline runs (scheduled or triggered)
2. Hub validates all output through its Pydantic/schema layer
3. Hub writes to `data/imports/` atomically (`.tmp` → rename)
4. Hub updates `manifest.json` with `generated_at` and per-dataset `status: "live"`
5. Next Vite build or HMR picks up the new JSON files
6. `adapter.ts` switches to hub data automatically (non-empty array = hub active)

**Write format:** Each file is a JSON array `[]` (even if empty). Never partial files.

---

## Global Standards

| Standard | Value |
|----------|-------|
| Geography key | ISO3 (alpha-3) — never ISO2, never name-only |
| Date format | ISO 8601 — `"YYYY-MM-DD"` events, `"YYYY-MM"` monthly prices, `int` for annual |
| Missing values | `null` — never `0` for unknown data |
| Coordinates | WGS84 decimal degrees |
| Units | kb/d (production/trade), Bbbl (reserves), USD/bbl (price) |
| Source precedence | EIA > EnergyInstitute > WorldBank > OPEC > ACLED > GDELT > manual |

---

## GeoCoordinate Object (shared by all geocoordinated datasets)

```json
{
  "latitude":           26.5,
  "longitude":          56.2,
  "coordinate_quality": "exact",
  "location_type":      "chokepoint",
  "confidence":         0.97,
  "source":             "ACLED",
  "place_name":         "Strait of Hormuz"
}
```

| Field | Type | Values |
|-------|------|--------|
| `latitude` | `number` | WGS84 decimal degrees |
| `longitude` | `number` | WGS84 decimal degrees |
| `coordinate_quality` | `string` | `"exact"` (GPS) · `"city"` (GDELT L3–4) · `"country_centroid"` (fallback) · `"regional"` (maritime zone) |
| `location_type` | `string` | `"chokepoint"` · `"port"` · `"pipeline"` · `"refinery"` · `"oilfield"` · `"city"` · `"country"` · `"region"` |
| `confidence` | `number` | 0.0 – 1.0 |
| `source` | `string` | `"ACLED"` · `"GDELT"` · `"manual"` · `"geocoded"` |
| `place_name` | `string \| null` | Human-readable label, optional |

**When `geo` is `null`:** the event has no meaningful point geometry (e.g. global OPEC quota decision). Use `iso3` for country-level map highlighting.

---

## Dataset 1: `price-series.json`

**TypeScript type:** `OilPriceRecord[]` (see `frontend/src/types/oil.ts`)

```json
[
  {
    "date":        "2024-01",
    "crude_type":  "Brent",
    "price_usd":   78.01,
    "unit":        "dollars per barrel",
    "frequency":   "monthly",
    "source":      "EIA",
    "source_id":   "PET.RBRTE.M",
    "source_url":  "https://api.eia.gov/v2/petroleum/pri/spt/data/"
  }
]
```

| Field | Constraint |
|-------|-----------|
| `crude_type` | `"Brent" \| "WTI" \| "Dubai"` |
| `frequency` | `"daily" \| "monthly"` (Dubai is monthly only) |
| `date` | `"YYYY-MM"` monthly, `"YYYY-MM-DD"` daily |
| `price_usd` | Positive float — omit record if unknown (do not use null) |

---

## Dataset 2: `energy-indicators.json`

**TypeScript type:** `OilCountrySupplyRecord[]`

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
    "source_url":      "https://api.eia.gov/v2/international/data/",
    "data_year_note":  null
  }
]
```

Multiple records per country (one per year). Adapter selects most recent by year.

---

## Dataset 3: `oil-events.json` ← PRIMARY EVENTS (supersedes `events.json`)

**TypeScript type:** `OilEventRecord[]` — includes `GeoCoordinate`

```json
[
  {
    "event_id":        "e58d2b02-1234-4567-890a-1234567890ab",
    "date":            "2024-01-25",
    "country":         "Russia",
    "iso3":            "RUS",
    "event_type":      "conflict",
    "title":           "Drone Strike Hits Tuapse Refinery",
    "summary":         "Ukrainian drone strike targeted the Rosneft refinery in Tuapse, forcing a temporary shutdown.",
    "source":          "ACLED",
    "source_url":      "https://acleddata.com/curated-data-files/",
    "confidence_level":"high",
    "related_asset":   "oil",
    "geo": {
      "latitude":           44.1,
      "longitude":          39.1,
      "coordinate_quality": "exact",
      "location_type":      "refinery",
      "confidence":         0.95,
      "source":             "ACLED",
      "place_name":         "Tuapse Refinery, Krasnodar Krai"
    }
  },
  {
    "event_id":        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "date":            "2024-06-02",
    "country":         null,
    "iso3":            null,
    "event_type":      "opec",
    "title":           "OPEC+ Extends Production Cuts Through 2024",
    "summary":         "OPEC+ agreed to extend voluntary cuts of 2.2 mb/d.",
    "source":          "OPEC",
    "source_url":      "https://www.opec.org/...",
    "confidence_level":"high",
    "related_asset":   "oil",
    "geo":             null
  }
]
```

**Deduplication key:** `(date, iso3, event_type)` — hub deduplicates before export.

**`geo = null`** for events with no geographic point (global announcements, multi-country sanctions).

**Event type taxonomy:**
`conflict` · `sanction` · `opec` · `infrastructure` · `trade` · `economic` · `weather` · `accident`

---

## Dataset 4: `shipping-disruptions.json`

**TypeScript type:** `ShippingDisruption[]` (see `frontend/src/types/hub.ts`)

```json
[
  {
    "disruption_id":        "d1a2b3c4-5678-90ab-cdef-1234567890ab",
    "date":                 "2024-01-10",
    "date_resolved":        null,
    "chokepoint":           "Bab_el_Mandeb",
    "disruption_type":      "conflict",
    "severity":             "high",
    "affected_routes":      ["Asia-Europe", "Gulf-Europe"],
    "estimated_volume_kbd": 3800,
    "title":                "Houthi Attacks Disrupt Red Sea Shipping",
    "summary":              "Houthi missile and drone attacks force major carriers to reroute via Cape of Good Hope.",
    "source":               "IMFPortWatch",
    "source_url":           "https://portwatch.imf.org/",
    "confidence_level":     "high",
    "active":               true,
    "geo": {
      "latitude":           12.6,
      "longitude":          43.3,
      "coordinate_quality": "regional",
      "location_type":      "chokepoint",
      "confidence":         0.9,
      "source":             "manual",
      "place_name":         "Bab-el-Mandeb Strait"
    }
  }
]
```

**Chokepoints monitored:**
`Hormuz` · `Suez` · `Malacca` · `Panama` · `Bab_el_Mandeb` · `Bosphorus` · `Cape_of_Good_Hope` · `Dover` · `Danish_Straits`

---

## Dataset 5: `refinery-outages.json`

**TypeScript type:** `RefineryOutage[]`

```json
[
  {
    "outage_id":             "r1a2b3c4-5678-90ab-cdef-1234567890ab",
    "date_start":            "2024-01-25",
    "date_end":              null,
    "facility_name":         "Tuapse Refinery",
    "operator":              "Rosneft",
    "country":               "Russia",
    "iso3":                  "RUS",
    "outage_type":           "conflict",
    "crude_type_affected":   null,
    "capacity_kbd":          240,
    "capacity_offline_kbd":  240,
    "status":                "active",
    "title":                 "Tuapse Refinery — Drone Strike Shutdown",
    "summary":               "Ukrainian drone strike caused fire and forced full shutdown of 240 kb/d facility.",
    "source":                "ACLED",
    "source_url":            "https://acleddata.com/",
    "confidence_level":      "high",
    "geo": {
      "latitude":           44.1,
      "longitude":          39.1,
      "coordinate_quality": "exact",
      "location_type":      "refinery",
      "confidence":         0.95,
      "source":             "ACLED",
      "place_name":         "Tuapse Refinery"
    }
  }
]
```

---

## Dataset 6: `geopolitical-supply-risk-events.json`

**TypeScript type:** `GeopoliticalSupplyRiskEvent[]`

```json
[
  {
    "risk_event_id":               "g1a2b3c4-5678-90ab-cdef-1234567890ab",
    "date":                        "2024-02-15",
    "country":                     "United States",
    "iso3":                        "USA",
    "risk_category":               "sanctions",
    "risk_level":                  "high",
    "title":                       "OFAC Expands Russia Oil Sanctions — Tanker Blacklist",
    "summary":                     "US Treasury sanctions additional tankers carrying Russian crude above the $60 price cap.",
    "affected_assets":             ["oil", "shipping"],
    "estimated_supply_impact_kbd": 400,
    "duration_estimate_days":      null,
    "source":                      "OFAC",
    "source_url":                  "https://home.treasury.gov/policy-issues/financial-sanctions",
    "confidence_level":            "high",
    "geo": {
      "latitude":           38.9,
      "longitude":          -77.0,
      "coordinate_quality": "city",
      "location_type":      "city",
      "confidence":         0.8,
      "source":             "geocoded",
      "place_name":         "Washington D.C."
    }
  }
]
```

**Risk categories:** `sanctions` · `conflict` · `political_instability` · `policy_change` · `natural_disaster`

**Affected assets:** `oil` · `gas` · `refining` · `shipping` · `pipeline`

---

## Deprecated

| File | Status | Replacement |
|------|--------|-------------|
| `events.json` | **Deprecated** | Use `oil-events.json` (includes geo coordinates) |

`events.json` remains as a stub for backward compatibility. Hub should stop writing to it once `oil-events.json` is live.

---

## Adapter Behavior Summary

```
Hub file populated?  →  YES: return hub data
                     →  NO:  return local EIA fallback (pre-hub bootstrap only)

New geo-only datasets (shipping, outages, supply-risk):
  →  No local fallback — returns [] when hub is not connected
  →  UI components must handle empty array gracefully
```

---

## Adding a New Dataset

1. Add JSON schema to this document
2. Create stub file `data/imports/<name>.json` → `[]`
3. Copy to `frontend/src/data/imports/<name>.json`
4. Add TypeScript type to `frontend/src/types/hub.ts`
5. Add getter to `frontend/src/data/imports/adapter.ts`
6. Update `manifest.json` with new entry
7. Update this document
