/**
 * Hub-specific types for datasets delivered exclusively by world-intelligence-data-hub.
 *
 * These types extend the base oil.ts types with richer geo and infrastructure
 * context that the hub enriches via ACLED, GDELT, and manual geocoding pipelines.
 *
 * This project NEVER constructs these records locally.
 * They arrive as validated JSON exports from the hub.
 */

import type { DataSource, ConfidenceLevel, CrudeType, GeoCoordinate } from './oil'

// ─── Chokepoints ──────────────────────────────────────────────────────────────
// Strategic maritime passages monitored by the hub.

export type Chokepoint =
  | 'Hormuz'            // Strait of Hormuz — 20% of global oil
  | 'Suez'              // Suez Canal — Europe-Asia shortcut
  | 'Malacca'           // Strait of Malacca — SE Asia gateway
  | 'Panama'            // Panama Canal — Americas link
  | 'Bab_el_Mandeb'    // Red Sea entry — Suez approach
  | 'Bosphorus'         // Black Sea — Turkey straits
  | 'Cape_of_Good_Hope' // Africa bypass — Suez alternative
  | 'Dover'             // English Channel — NW Europe
  | 'Danish_Straits'    // North Sea — Baltic access

export type DisruptionType = 'conflict' | 'weather' | 'accident' | 'political' | 'sanctions'
export type SeverityLevel  = 'critical' | 'high' | 'moderate' | 'low'
export type OutageType     =
  | 'conflict'
  | 'fire'
  | 'mechanical'
  | 'planned_maintenance'
  | 'weather'
  | 'sanctions'
  | 'other'

export type SupplyRiskCategory =
  | 'sanctions'
  | 'conflict'
  | 'political_instability'
  | 'policy_change'
  | 'natural_disaster'

// ─── Shipping Disruptions ─────────────────────────────────────────────────────
// Hub monitors chokepoints via IMF PortWatch, Lloyd's, AIS vessel tracking.
// Delivered via: data/imports/shipping-disruptions.json

export interface ShippingDisruption {
  disruption_id:          string
  date:                   string              // ISO 8601 YYYY-MM-DD (disruption start)
  date_resolved:          string | null       // null = still active
  chokepoint:             Chokepoint
  disruption_type:        DisruptionType
  severity:               SeverityLevel
  affected_routes:        string[]            // e.g. ["Asia-Europe", "Gulf-Asia"]
  estimated_volume_kbd:   number | null       // kb/d of flow affected
  title:                  string
  summary:                string
  source:                 DataSource
  source_url:             string | null
  confidence_level:       ConfidenceLevel
  active:                 boolean
  geo:                    GeoCoordinate | null
}

// ─── Refinery Outages ─────────────────────────────────────────────────────────
// Hub tracks refinery disruptions via EIA STEO, ACLED, Reuters.
// Delivered via: data/imports/refinery-outages.json

export interface RefineryOutage {
  outage_id:              string
  date_start:             string              // ISO 8601 YYYY-MM-DD
  date_end:               string | null       // null = still active
  facility_name:          string
  operator:               string | null
  country:                string
  iso3:                   string
  outage_type:            OutageType
  crude_type_affected:    CrudeType | null
  capacity_kbd:           number | null       // total rated capacity
  capacity_offline_kbd:   number | null       // portion currently offline
  status:                 'active' | 'resolved' | 'partial'
  title:                  string
  summary:                string
  source:                 DataSource
  source_url:             string | null
  confidence_level:       ConfidenceLevel
  geo:                    GeoCoordinate | null
}

// ─── Geopolitical Supply Risk Events ─────────────────────────────────────────
// High-level risk signals scored by the hub's intelligence pipeline.
// Combines ACLED conflict data, OFAC sanctions, and GDELT political signals.
// Delivered via: data/imports/geopolitical-supply-risk-events.json

export type AffectedAsset = 'oil' | 'gas' | 'refining' | 'shipping' | 'pipeline'

export interface GeopoliticalSupplyRiskEvent {
  risk_event_id:                string
  date:                         string          // ISO 8601 YYYY-MM-DD
  country:                      string
  iso3:                         string
  risk_category:                SupplyRiskCategory
  risk_level:                   'critical' | 'high' | 'elevated' | 'low'
  title:                        string
  summary:                      string
  affected_assets:              AffectedAsset[]
  estimated_supply_impact_kbd:  number | null   // kb/d at risk
  duration_estimate_days:       number | null   // hub model estimate, null = unknown
  source:                       DataSource
  source_url:                   string | null
  confidence_level:             ConfidenceLevel
  geo:                          GeoCoordinate | null
}
