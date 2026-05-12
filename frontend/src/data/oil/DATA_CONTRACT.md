# Oil Intelligence MVP — Data Contract

This document defines the fields, units, sources, and known limitations for all oil data used in the MVP.
It is the shared reference between Developer AI (Claude) and Researcher AI (Gemini).
Any change to field names, units, null conventions, or source assumptions must be reflected here first.

---

## Gemini Standards (confirmed 2026-05-11)

These standards are locked. All data, types, and ingestion scripts must conform.

| Standard | Rule |
|----------|------|
| Production / trade units | **kb/d** (thousand barrels per day) |
| Reserves units | **Bbbl** (billion barrels) |
| Geography key | **ISO3 only** (alpha-3, e.g. `"SAU"`) — no ISO2, no name-only records |
| Date format | **ISO 8601** — monthly: `"YYYY-MM"`, daily: `"YYYY-MM-DD"`, annual: integer |
| Missing values | **null** — never use `0` for missing data; never omit a field |
| Source precedence | **EIA > EnergyInstitute > WorldBank > OPEC > manual** |

---

## Taxonomy (Gemini-confirmed)

### Crude Benchmarks
`Brent` · `WTI` · `Dubai` · `OPEC basket`

### Event Types (for oil_events — Step 5)
`conflict` · `sanction` · `opec` · `infrastructure` · `trade` · `weather` · `accident`

### Geopolitical Groups
`OPEC` · `OPEC+` · `G7` · `NATO` · `SCO` · `GCC` · `Arab League`

### Supply Chain Categories
`upstream` · `midstream` · `downstream` · `shipping` · `refining`

---

## Table 1: oil_price

Stores crude oil spot prices by date and crude type.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | ISO 8601 — `"YYYY-MM"` monthly, `"YYYY-MM-DD"` daily |
| `crude_type` | string | yes | `"Brent"` · `"WTI"` · `"Dubai"` |
| `price_usd` | number | yes | USD per barrel. Omit record entirely if price unknown — do not use null |
| `unit` | string | yes | Always `"dollars per barrel"` |
| `frequency` | string | yes | `"daily"` or `"monthly"` |
| `source` | string | yes | `"EIA"` or `"WorldBank"` |
| `source_id` | string | no | EIA series ID or World Bank indicator code |
| `source_url` | string | no | Direct URL to dataset |

### Source Mapping

| Crude | Source | Series / Indicator | Frequency |
|-------|--------|--------------------|-----------|
| Brent | EIA Open Data API v2 | `PET.RBRTE.M` | Monthly |
| WTI | EIA Open Data API v2 | `PET.RWTC.M` | Monthly |
| Dubai | World Bank Pink Sheet | `POILAPSPUSDM` | Monthly only |

### Date Format Convention

- Monthly data: `"YYYY-MM"` — not `"YYYY-MM-01"`, not `"2024-1"`
- Daily data: `"YYYY-MM-DD"`
- Chart components must handle both formats without normalization

### Known Limitations

- Dubai is monthly only. Do not attempt to merge Dubai with daily Brent/WTI data.
- Dubai lags 4–6 weeks. World Bank Pink Sheet publishes 1–2 months after period end.
- EIA requires a free API key. Register at https://www.eia.gov/opendata/ — pass as `?api_key=`. Store in `.env` as `VITE_EIA_API_KEY`. Never commit.
- Brent and WTI are ICE/NYMEX front-month futures settlement prices, not physical delivery.
- Historical coverage: EIA Brent/WTI from 1986-05. World Bank Dubai from 1980-01.
- Sample data values in `oil_price_sample.json` are approximate 2024 monthly averages. Replace before release.

---

## Table 2: oil_country_supply

Stores proven reserves and production by country and year.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `country` | string | yes | Full English name — display only, not a key |
| `iso3` | string | yes | ISO 3166-1 alpha-3 — **primary geography key for map** |
| `year` | number | yes | Integer year, e.g. `2023` |
| `reserves` | number \| null | yes | Proven reserves · unit: **Bbbl** · null = unknown |
| `unit_reserves` | string | yes | Always `"billion barrels"` |
| `production` | number \| null | yes | Production · unit: **kb/d** · null = unknown |
| `unit_production` | string | yes | Always `"thousand barrels per day"` |
| `exports` | number \| null | yes | Out of scope MVP — always `null` in v1 |
| `imports` | number \| null | yes | Out of scope MVP — always `null` in v1 |
| `opec_member` | boolean | yes | True if current OPEC member |
| `source` | string | yes | `"EIA"` for all MVP records |
| `source_id` | string | no | EIA international series ID |
| `source_url` | string | no | Direct URL to dataset |
| `data_year_note` | string \| null | yes | Data quality caveat — `null` if clean |

### Null vs Zero

| Value | Meaning |
|-------|---------|
| `null` | Data is unknown, unreported, or not applicable |
| `0` | Confirmed zero production/reserves — rare, must be explicitly verified |
| field omitted | Not allowed — all fields must be present in every record |

### ISO3 Alignment

ISO3 codes must match the `NUM_TO_ISO3` lookup in `WorldMap.tsx`. Any country record whose ISO3 is not in that map will be ignored by the choropleth layer. When Gemini delivers new country data, validate ISO3 codes against that map before ingestion.

### Source Mapping

| Data | Source | Notes |
|------|--------|-------|
| Proven reserves | EIA International Energy Statistics | Annual. Self-reported by many OPEC members — figures accepted by EIA but not independently audited. |
| Production | EIA International Energy Statistics | Annual and monthly available. MVP uses annual. |
| Exports / imports | Out of scope v1 | Phase 2 candidate: Energy Institute Statistical Review or UN Comtrade |

### Known Limitations — by Country

| Country | Limitation |
|---------|-----------|
| SAU, KWT, IRQ, ARE, VEN | Reserves are self-reported. OPEC members revised upward in the 1980s without independent audits. |
| VEN | Proven reserves (~303 Bbbl) are extra-heavy oil. Technically recoverable at cost; production has collapsed due to sanctions and underinvestment. |
| RUS | Post-2022 production data has elevated uncertainty. EIA estimates based on secondary sources (Kpler, tanker tracking). |
| IRN | Production estimates are approximate. Active US sanctions limit independent data reporting. |
| CAN | Reserves include oil sands (recoverable bitumen). Conventional reserves are much lower. |

---

## Table 3: oil_events

Out of scope for Steps 2–4. Type definition locked in `src/types/oil.ts`. Will be populated in Step 5 after Gemini delivers the event research dataset.

Confirmed event type taxonomy (from Gemini):
`conflict` · `sanction` · `opec` · `infrastructure` · `trade` · `weather` · `accident`

---

## EIA API Reference

Base URL: `https://api.eia.gov/v2/`

| Data Need | Endpoint |
|-----------|----------|
| Brent monthly | `/petroleum/pri/spt/data/?frequency=monthly&data[0]=value&facets[series][]=RBRTE&api_key=KEY` |
| WTI monthly | `/petroleum/pri/spt/data/?frequency=monthly&data[0]=value&facets[series][]=RWTC&api_key=KEY` |
| Country production | `/international/data/?frequency=annual&data[0]=value&facets[activityId][]=1&facets[productId][]=53&api_key=KEY` |
| Country reserves | `/international/data/?frequency=annual&data[0]=value&facets[activityId][]=3&facets[productId][]=53&api_key=KEY` |

EIA series format for international supply: `INTL.57-{activityId}-{ISO3}-TBPD.A`

---

## World Bank Pink Sheet Reference

- URL: https://www.worldbank.org/en/research/commodity-markets
- File: `CMO-Historical-Data-Monthly.xlsx` · Sheet: `Monthly Prices`
- Column: `"Oil, Dubai"` (USD/bbl) · Indicator: `POILAPSPUSDM`
- Update lag: ~4–6 weeks after period end

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-05-11 | Initial contract — MVP scope defined | Claude / Head of Operation |
| 2026-05-11 | Gemini standards applied — null convention, source precedence, taxonomy, ISO3 rule, unit abbreviations | Claude / Gemini |
