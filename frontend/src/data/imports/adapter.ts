/**
 * Shared Data Hub Adapter — world-intelligence-oil
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ARCHITECTURAL RULE                                                  ║
 * ║  This is the ONLY file in this project that touches hub data.        ║
 * ║  Components never import hub files directly — only through here.     ║
 * ║  This project does NOT call any external APIs.                       ║
 * ║  All ingestion lives in: world-intelligence-data-hub                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Priority for every dataset:
 *   1. Hub export (data/imports/*.json) — set by hub pipeline
 *   2. Local EIA fallback (src/data/oil/live/*.json) — pre-hub bootstrap only
 *
 * Schema notes confirmed during integration testing (2026-05-14):
 *   - oil-events.json is wrapped: { events: HubOilEvent[] } — not a plain array
 *   - energy-indicators.json is wrapped: { indicators: HubEnergyIndicator[] }
 *   - coordinateQuality is camelCase (hub schema)
 *   - HubOilEvent.event_type uses hub taxonomy (supply_disruption, etc.)
 *   - getOilEvents() returns legacy OilEventRecord[] for timeline backward compat
 *   - getHubOilEvents() returns HubOilEvent[] for the event marker layer
 */

import type {
  OilPriceRecord,
  OilCountrySupplyRecord,
  OilEventRecord,
} from '../../types/oil'

import type {
  HubOilEvent,
  HubOilEventsExport,
  HubEnergyIndicator,
  HubEnergyExport,
  ShippingDisruption,
  RefineryOutage,
  GeopoliticalSupplyRiskEvent,
} from '../../types/hub'

// ── Hub imports ───────────────────────────────────────────────────────────────

import hubOilEventsRaw from './oil-events.json'
import hubEnergyRaw    from './energy-indicators.json'
import hubShipping     from './shipping-disruptions.json'
import hubOutages      from './refinery-outages.json'
import hubSupplyRisk   from './geopolitical-supply-risk-events.json'
import manifest        from './manifest.json'

// Legacy price-series stub (hub will supersede eventually)
import hubPricesRaw    from './price-series.json'

// ── Local fallback (EIA bootstrap — not primary production) ──────────────────

import localPrices from '../oil/live/oil_price.json'
import localSupply from '../oil/live/oil_country_supply.json'
import localEvents from '../oil/oil_events_sample.json'

// ─────────────────────────────────────────────────────────────────────────────
// Hub file parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

function hubLive(arr: unknown[]): boolean {
  return arr.length > 0
}

/** Extract events from the hub's wrapped envelope { events: [...] } */
function extractHubEvents(): HubOilEvent[] {
  const raw = hubOilEventsRaw as unknown as HubOilEventsExport
  if (raw && Array.isArray(raw.events) && raw.events.length > 0) {
    return raw.events as HubOilEvent[]
  }
  return []
}

/** Extract indicators from the hub's wrapped envelope { indicators: [...] } */
function extractHubIndicators(): HubEnergyIndicator[] {
  const raw = hubEnergyRaw as unknown as HubEnergyExport
  if (raw && Array.isArray(raw.indicators) && raw.indicators.length > 0) {
    return raw.indicators as HubEnergyIndicator[]
  }
  return []
}

// Pre-extracted at module level (called once on import)
const _hubOilEvents    = extractHubEvents()
const _hubIndicators   = extractHubIndicators()

// ── Prices ────────────────────────────────────────────────────────────────────
// Hub price-series.json is currently empty (different schema in development).
// Falls back to local EIA data.

export function getPrices(): OilPriceRecord[] {
  const hub = hubPricesRaw as unknown as OilPriceRecord[]
  return hubLive(hub) ? hub : localPrices as unknown as OilPriceRecord[]
}

// ── Country supply (reserves + production) ────────────────────────────────────
// Hub energy-indicators.json uses a time-series schema (HubEnergyIndicator[]),
// not OilCountrySupplyRecord[]. Falls back to local EIA data for map/panel.

export function getSupply(): OilCountrySupplyRecord[] {
  return localSupply as unknown as OilCountrySupplyRecord[]
}

// ── Hub oil events (geocoordinated, hub taxonomy) ─────────────────────────────
// Returns HubOilEvent[] — the full hub schema with coordinateQuality, lat/lng.
// Used by OilEventMarkerLayer for map rendering.

export function getHubOilEvents(): HubOilEvent[] {
  return _hubOilEvents
}

// ── Legacy oil events (OilEventRecord[] — for OilEventTimeline backward compat)
// Falls back to sample data. When hub delivers OilEventRecord-compatible events,
// this can switch to hub data.

export function getOilEvents(): OilEventRecord[] {
  return localEvents as unknown as OilEventRecord[]
}

// ── Energy indicators (hub time-series format) ────────────────────────────────
// Returns HubEnergyIndicator[] — named indicators with YYYY-MM-DD time series.
// Used by future indicator chart components.

export function getEnergyIndicators(): HubEnergyIndicator[] {
  return _hubIndicators
}

// ── Shipping disruptions (hub only — no local fallback) ───────────────────────

export function getShippingDisruptions(): ShippingDisruption[] {
  return hubShipping as unknown as ShippingDisruption[]
}

// ── Refinery outages (hub only) ───────────────────────────────────────────────

export function getRefineryOutages(): RefineryOutage[] {
  return hubOutages as unknown as RefineryOutage[]
}

// ── Geopolitical supply risk events (hub only) ────────────────────────────────

export function getGeopoliticalSupplyRisk(): GeopoliticalSupplyRiskEvent[] {
  return hubSupplyRisk as unknown as GeopoliticalSupplyRiskEvent[]
}

// ── Hub connection status ─────────────────────────────────────────────────────

export interface HubStatus {
  connected:    boolean
  generatedAt:  string | null
  eventCount:   number
  indicatorCount: number
  datasets: {
    oilEvents:  boolean
    indicators: boolean
    shipping:   boolean
    outages:    boolean
    supplyRisk: boolean
  }
}

export function getHubStatus(): HubStatus {
  return {
    connected:      _hubOilEvents.length > 0 || _hubIndicators.length > 0,
    generatedAt:    (manifest as { generated_at?: string }).generated_at ?? null,
    eventCount:     _hubOilEvents.length,
    indicatorCount: _hubIndicators.length,
    datasets: {
      oilEvents:  _hubOilEvents.length > 0,
      indicators: _hubIndicators.length > 0,
      shipping:   hubLive(hubShipping  as unknown[]),
      outages:    hubLive(hubOutages   as unknown[]),
      supplyRisk: hubLive(hubSupplyRisk as unknown[]),
    },
  }
}
