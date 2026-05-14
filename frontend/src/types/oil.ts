// ─── Enums ────────────────────────────────────────────────────────────────────

export type CrudeType = 'Brent' | 'WTI' | 'Dubai'
export type DataFrequency = 'daily' | 'monthly' | 'annual'

// Which supply metric the map choropleth displays
export type OilLayerMetric = 'reserves' | 'production'

// Source precedence: EIA > EnergyInstitute > WorldBank > OPEC > manual
// Hub sources (ACLED, GDELT, OFAC, IMFPortWatch) are set by the data hub only.
// This project never calls these APIs directly.
export type DataSource =
  | 'EIA'
  | 'EnergyInstitute'
  | 'WorldBank'
  | 'OPEC'
  | 'OFAC'
  | 'ACLED'
  | 'GDELT'
  | 'IMFPortWatch'
  | 'NewsAPI'
  | 'manual'

// Gemini-confirmed full taxonomy (event source research)
export type EventType =
  | 'conflict'
  | 'sanction'
  | 'opec'
  | 'infrastructure'
  | 'trade'
  | 'economic'
  | 'weather'
  | 'accident'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

// ─── Unit types (Gemini-aligned abbreviations) ────────────────────────────────
// Reserves:         Bbbl  (billion barrels)
// Production/trade: kb/d  (thousand barrels per day)
// Price:            USD/bbl
export type PriceUnit      = 'dollars per barrel'
export type ReservesUnit   = 'billion barrels'
export type ProductionUnit = 'thousand barrels per day'
export type TradeUnit      = 'thousand barrels per day'

// ─── Null convention ──────────────────────────────────────────────────────────
// null  = data exists but is unknown, not reported, or not applicable
// 0     = confirmed zero — never use 0 as a proxy for missing
// Field omitted (undefined) is NOT used — all fields must be explicit in JSON

// ─── Geocoordinate ────────────────────────────────────────────────────────────
// Provided by the world-intelligence-data-hub for events with known locations.
// Sources: ACLED (exact GPS), GDELT ActionGeo (city/country), manual geocoding.
// null geo = event has no meaningful geographic point (e.g. global OPEC decision).

export type CoordinateQuality =
  | 'exact'              // GPS-level (ACLED conflict events)
  | 'city'               // City centroid (GDELT ActionGeo level 3–4)
  | 'country_centroid'   // Country centroid fallback — no finer location available
  | 'regional'           // Maritime or regional area (e.g. Red Sea, Hormuz zone)

export type LocationType =
  | 'chokepoint'         // Strait, canal, critical maritime passage
  | 'port'               // Seaport / terminal
  | 'pipeline'           // Pipeline route point
  | 'refinery'           // Refinery or processing facility
  | 'oilfield'           // Upstream production site
  | 'city'               // General city / populated place
  | 'country'            // Country-level (paired with country_centroid quality)
  | 'region'             // Broad maritime or terrestrial region

export interface GeoCoordinate {
  latitude:           number             // WGS84 decimal degrees
  longitude:          number             // WGS84 decimal degrees
  coordinate_quality: CoordinateQuality
  location_type:      LocationType
  confidence:         number             // 0.0–1.0
  source:             'ACLED' | 'GDELT' | 'manual' | 'geocoded'
  place_name?:        string | null      // Human-readable label, e.g. "Strait of Hormuz"
}

// ─── Oil Price ─────────────────────────────────────────────────────────────────
// Hub provides this; local EIA fallback used until hub is connected.
// Date format (ISO 8601):
//   monthly → "YYYY-MM"    e.g. "2024-01"
//   daily   → "YYYY-MM-DD" e.g. "2024-01-15"

export interface OilPriceRecord {
  date:       string
  crude_type: CrudeType
  price_usd:  number
  unit:       PriceUnit
  frequency:  DataFrequency
  source:     DataSource
  source_id?: string
  source_url?: string
}

// ─── Country Oil Supply ────────────────────────────────────────────────────────
// Hub provides reserves + production + trade flows once connected.
// Geography: ISO3 only. Missing values: null (never 0).

export interface OilCountrySupplyRecord {
  country:          string
  iso3:             string
  year:             number
  reserves:         number | null
  unit_reserves:    ReservesUnit
  production:       number | null
  unit_production:  ProductionUnit
  exports:          number | null
  imports:          number | null
  opec_member:      boolean
  source:           DataSource
  source_id?:       string
  source_url?:      string
  data_year_note:   string | null
}

// ─── Oil Events ───────────────────────────────────────────────────────────────
// Geocoordinated events are delivered by the hub via oil-events.json.
// The geo field is null for events with no meaningful point location
// (e.g. global OPEC quota decisions, US-wide sanctions).
//
// Supply chain taxonomy: upstream | midstream | downstream | shipping | refining
// Geopolitical groups:   OPEC | OPEC+ | G7 | NATO | SCO | GCC | Arab League

export interface OilEventRecord {
  event_id:         string
  date:             string            // ISO 8601 "YYYY-MM-DD"
  country:          string | null
  iso3:             string | null
  event_type:       EventType
  title:            string
  summary:          string
  source:           DataSource
  source_url:       string | null
  confidence_level: ConfidenceLevel
  related_asset:    'oil'
  geo:              GeoCoordinate | null  // null = no point geometry; use iso3 for country-level
}
