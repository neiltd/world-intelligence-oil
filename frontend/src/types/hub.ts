/**
 * Types for hub-delivered datasets.
 * These match the exact schema produced by world-intelligence-data-hub.
 * This project NEVER constructs or mutates these records.
 *
 * Key schema notes (from integration testing 2026-05-14):
 *   - coordinateQuality is camelCase (matches hub exactly)
 *   - Events are wrapped: { events: HubOilEvent[] } not a plain array
 *   - energy-indicators wrapped: { indicators: HubEnergyIndicator[] }
 *   - HubOilEvent.event_type uses hub taxonomy (supply_disruption, etc.)
 *   - No confidence_level string field — only confidence float (0.0–1.0)
 */

// ─── Coordinate types (hub-canonical values) ──────────────────────────────────

export type HubCoordinateQuality =
  | 'source_exact'      // GPS / precise address from source (ACLED field report)
  | 'source_approx'     // AI-geocoded city/district centroid
  | 'country_centroid'  // No sub-national location — country centroid fallback
  | 'missing'           // No coordinates available — omit from map

export type HubCoordinateSource =
  | 'ai-extracted'
  | 'country-centroid'
  | 'acled-field'

export type HubLocationType =
  | 'point'
  | 'city'
  | 'region'
  | 'country'
  | 'chokepoint'
  | 'infrastructure'
  | 'offshore'
  | 'unknown'

// ─── Hub event taxonomy ───────────────────────────────────────────────────────
// Hub uses different event_type values than the oil project's internal taxonomy.
// DO NOT map these to OilEventRecord.event_type on the frontend.

export type HubEventType =
  | 'supply_disruption'
  | 'energy_infrastructure'
  | 'diplomatic_incident'
  | 'armed_conflict'
  | 'opec_decision'
  | 'sanctions'
  | 'economic_data_release'
  | 'trade_dispute'
  | 'other'

export type HubRelatedAsset = 'oil' | 'gas' | 'chokepoint' | 'infrastructure'

// ─── Hub Oil Event ────────────────────────────────────────────────────────────
// Delivered via: data/imports/oil-events.json → { events: HubOilEvent[] }

export interface HubOilEvent {
  event_id:             string
  date:                 string              // ISO 8601 YYYY-MM-DD
  title:                string
  summary:              string
  iso3:                 string | null       // primary country ISO3
  // Coordinate fields — always check coordinateQuality before rendering
  lat?:                 number              // absent only when coordinateQuality = 'missing'
  lng?:                 number
  coordinateQuality?:   HubCoordinateQuality
  coordinateSource?:    HubCoordinateSource | string
  locationType?:        HubLocationType
  // Intelligence fields
  event_type:           HubEventType | string
  severity:             number              // 1–5 (5 = critical, global market impact)
  confidence:           number              // 0.0–1.0 (< 0.6 treat as unverified)
  source_count:         number              // number of RSS sources confirming
  source:               string              // e.g. "bloomberg-markets"
  escalation_potential: number              // 0.0–1.0 (7-day escalation probability)
  market_relevance:     number              // 0.0–1.0 (oil price impact signal)
  is_supply_disruption: boolean
  is_hormuz_related:    boolean
  related_asset:        HubRelatedAsset | string
}

// ─── Hub Oil Events export envelope ──────────────────────────────────────────

export interface HubOilEventsExport {
  schema_version:     string
  export_type:        string
  generated_at:       string
  date:               string
  extraction_version: string
  event_count:        number
  note:               string
  events:             HubOilEvent[]
}

// ─── Hub Energy Indicators ────────────────────────────────────────────────────
// Delivered via: data/imports/energy-indicators.json → { indicators: [...] }
// NOTE: This schema is entirely different from OilCountrySupplyRecord.
//       It is a time-series format for named metrics, not per-country supply data.

export interface HubEnergyPoint {
  period: string    // ISO 8601 YYYY-MM-DD (daily) or YYYY-MM-01 (monthly/annual)
  value:  number
}

export interface HubEnergyIndicator {
  indicator_key:  string            // e.g. "brent_crude_usd_bbl" — stable across versions
  indicator_name: string
  unit:           string            // e.g. "USD/barrel", "million barrels per day"
  source:         string            // e.g. "eia", "opec-monthly", "bp-statistical-review"
  series:         HubEnergyPoint[]  // most recent first
}

export interface HubEnergyExport {
  schema_version: string
  export_type:    string
  generated_at:   string
  as_of:          string
  note:           string
  indicators:     HubEnergyIndicator[]
}

// ─── Shipping / Refinery / Risk types (planned — hub not yet delivering) ──────
// These types were defined speculatively. Hub will confirm schema when delivering.

export type Chokepoint =
  | 'Hormuz' | 'Suez' | 'Malacca' | 'Panama'
  | 'Bab_el_Mandeb' | 'Bosphorus' | 'Cape_of_Good_Hope'
  | 'Dover' | 'Danish_Straits'

export interface ShippingDisruption {
  disruption_id:          string
  date:                   string
  date_resolved:          string | null
  chokepoint:             Chokepoint
  disruption_type:        string
  severity:               string
  affected_routes:        string[]
  estimated_volume_kbd:   number | null
  title:                  string
  summary:                string
  source:                 string
  source_url:             string | null
  confidence_level:       string
  active:                 boolean
  lat?:                   number
  lng?:                   number
  coordinateQuality?:     HubCoordinateQuality
  locationType?:          HubLocationType
}

export interface RefineryOutage {
  outage_id:              string
  date_start:             string
  date_end:               string | null
  facility_name:          string
  operator:               string | null
  country:                string
  iso3:                   string
  outage_type:            string
  capacity_kbd:           number | null
  capacity_offline_kbd:   number | null
  status:                 'active' | 'resolved' | 'partial'
  title:                  string
  summary:                string
  source:                 string
  source_url:             string | null
  confidence_level:       string
  lat?:                   number
  lng?:                   number
  coordinateQuality?:     HubCoordinateQuality
  locationType?:          HubLocationType
}

export interface GeopoliticalSupplyRiskEvent {
  risk_event_id:                string
  date:                         string
  country:                      string
  iso3:                         string
  risk_category:                string
  risk_level:                   string
  title:                        string
  summary:                      string
  affected_assets:              string[]
  estimated_supply_impact_kbd:  number | null
  duration_estimate_days:       number | null
  source:                       string
  source_url:                   string | null
  confidence_level:             string
  lat?:                         number
  lng?:                         number
  coordinateQuality?:           HubCoordinateQuality
  locationType?:                HubLocationType
}
