// ─── Enums ────────────────────────────────────────────────────────────────────

export type CrudeType = 'Brent' | 'WTI' | 'Dubai'
export type DataFrequency = 'daily' | 'monthly' | 'annual'

// Which supply metric the map choropleth displays
export type OilLayerMetric = 'reserves' | 'production'

// Source precedence (Gemini standard): EIA > EnergyInstitute > WorldBank > OPEC > manual
export type DataSource = 'EIA' | 'EnergyInstitute' | 'WorldBank' | 'OPEC' | 'manual'

// Gemini-confirmed full taxonomy (event source research)
export type EventType = 'conflict' | 'sanction' | 'opec' | 'infrastructure' | 'trade' | 'economic' | 'weather' | 'accident'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

// ─── Unit types (Gemini-aligned abbreviations) ────────────────────────────────
// Reserves:         Bbbl  (billion barrels)
// Production/trade: kb/d  (thousand barrels per day)
// Price:            USD/bbl
export type PriceUnit      = 'dollars per barrel'     // display abbrev: USD/bbl
export type ReservesUnit   = 'billion barrels'         // display abbrev: Bbbl
export type ProductionUnit = 'thousand barrels per day' // display abbrev: kb/d
export type TradeUnit      = 'thousand barrels per day' // display abbrev: kb/d

// ─── Null convention (Gemini standard) ────────────────────────────────────────
// null  = data exists but is unknown, not reported, or not applicable
// 0     = confirmed zero — never use 0 as a proxy for missing
// Field omitted (undefined) is NOT used — all fields must be explicit in JSON

// ─── Oil Price ─────────────────────────────────────────────────────────────────
// Source mapping:
//   Brent → EIA Open Data API v2  · series PET.RBRTE.M (monthly)
//   WTI   → EIA Open Data API v2  · series PET.RWTC.M  (monthly)
//   Dubai → World Bank Pink Sheet · indicator POILAPSPUSDM (monthly only)
//
// Date format (ISO 8601):
//   monthly → "YYYY-MM"    e.g. "2024-01"
//   daily   → "YYYY-MM-DD" e.g. "2024-01-15"

export interface OilPriceRecord {
  date: string             // ISO 8601 — "YYYY-MM" monthly, "YYYY-MM-DD" daily
  crude_type: CrudeType
  price_usd: number        // null is not valid here — price must be a number or record omitted
  unit: PriceUnit          // always "dollars per barrel"
  frequency: DataFrequency // Dubai is "monthly" only
  source: DataSource
  source_id?: string       // EIA series ID or World Bank indicator code
  source_url?: string
}

// ─── Country Oil Supply ────────────────────────────────────────────────────────
// Source precedence: EIA > EnergyInstitute > WorldBank
// Geography: ISO3 (alpha-3) only — no ISO2, no country name alone
// Dates: ISO 8601 — annual data uses integer year, not a date string
// Missing values: null (not 0, not omitted)

export interface OilCountrySupplyRecord {
  country: string                  // full English name — for display only
  iso3: string                     // ISO 3166-1 alpha-3 — primary geography key
  year: number                     // e.g. 2023
  reserves: number | null          // proven reserves · unit: Bbbl · null = unknown
  unit_reserves: ReservesUnit      // always "billion barrels"
  production: number | null        // production · unit: kb/d · null = unknown
  unit_production: ProductionUnit  // always "thousand barrels per day"
  exports: number | null           // out of scope MVP — always null in v1
  imports: number | null           // out of scope MVP — always null in v1
  opec_member: boolean
  source: DataSource               // EIA for all MVP records
  source_id?: string
  source_url?: string
  data_year_note: string | null    // data quality caveat — null if clean
}

// ─── Oil Events ───────────────────────────────────────────────────────────────
// Taxonomy (Gemini):
//   Crude benchmarks:   Brent | WTI | Dubai | OPEC basket
//   Event types:        conflict | sanction | opec | infrastructure | trade | weather | accident
//   Geopolitical groups: OPEC | OPEC+ | G7 | NATO | SCO | GCC | Arab League
//   Supply chain:       upstream | midstream | downstream | shipping | refining
//
// Out of scope for Step 3. Type definition preserved for Step 5.

export interface OilEventRecord {
  event_id: string
  date: string              // ISO 8601 "YYYY-MM-DD"
  country: string | null
  iso3: string | null
  event_type: EventType
  title: string
  summary: string
  source: DataSource
  source_url: string | null
  confidence_level: ConfidenceLevel
  related_asset: 'oil'
}
