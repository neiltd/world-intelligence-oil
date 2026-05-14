/**
 * Shared Data Hub Adapter — world-intelligence-oil
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ARCHITECTURAL RULE                                                  ║
 * ║  This is the ONLY file in this project that touches hub data.        ║
 * ║  Components import from this adapter — never directly from hub files.║
 * ║  This project does NOT call any external APIs (EIA, ACLED, GDELT,    ║
 * ║  OPEC, OFAC, IMFPortWatch, NewsAPI, World Bank).                     ║
 * ║  All ingestion, normalization, and geocoding live in:                 ║
 * ║    world-intelligence-data-hub                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Data priority (for every dataset):
 *   1. Hub export (data/imports/*.json) — populated by the hub pipeline
 *   2. Local EIA fallback (src/data/oil/live/*.json) — built by scripts/ingest.py
 *      (scripts/ingest.py is a LOCAL FALLBACK ONLY — not primary production)
 *
 * Hub files land in:        data/imports/        (repo root, hub writes here)
 * Vite-visible copies at:   src/data/imports/    (identical content)
 * Contract:                 data/imports/HUB_CONTRACT.md
 * Type definitions:         src/types/oil.ts (base), src/types/hub.ts (extended)
 */

import type {
  OilPriceRecord,
  OilCountrySupplyRecord,
  OilEventRecord,
} from '../../types/oil'

import type {
  ShippingDisruption,
  RefineryOutage,
  GeopoliticalSupplyRiskEvent,
} from '../../types/hub'

// ── Hub imports (canonical — hub writes these) ────────────────────────────────

import hubPrices       from './price-series.json'
import hubSupply       from './energy-indicators.json'
import hubOilEvents    from './oil-events.json'          // geocoordinated — primary events
import hubShipping     from './shipping-disruptions.json'
import hubOutages      from './refinery-outages.json'
import hubSupplyRisk   from './geopolitical-supply-risk-events.json'
import manifest        from './manifest.json'

// ── Local fallback (EIA ingestion — used while hub is not yet connected) ──────
// These are built by scripts/ingest.py which is a LOCAL FALLBACK tool.
// Once the hub delivers populated files above, these are superseded automatically.

import localPrices from '../oil/live/oil_price.json'
import localSupply from '../oil/live/oil_country_supply.json'
import localEvents from '../oil/oil_events_sample.json'  // no geo coordinates

// ─────────────────────────────────────────────────────────────────────────────
// Helper: is this hub array populated?
// Empty array [] = hub not yet delivering this dataset → use fallback.
// ─────────────────────────────────────────────────────────────────────────────

function hubLive(arr: unknown[]): boolean {
  return arr.length > 0
}

// ── Prices ────────────────────────────────────────────────────────────────────

export function getPrices(): OilPriceRecord[] {
  const hub = hubPrices as unknown as OilPriceRecord[]
  return hubLive(hub) ? hub : localPrices as unknown as OilPriceRecord[]
}

// ── Country supply (reserves + production) ────────────────────────────────────

export function getSupply(): OilCountrySupplyRecord[] {
  const hub = hubSupply as unknown as OilCountrySupplyRecord[]
  return hubLive(hub) ? hub : localSupply as unknown as OilCountrySupplyRecord[]
}

// ── Oil events (geocoordinated) ───────────────────────────────────────────────
// Hub delivers oil-events.json with GeoCoordinate on each event.
// Fallback to local sample (no geo) while hub is not connected.

export function getOilEvents(): OilEventRecord[] {
  const hub = hubOilEvents as unknown as OilEventRecord[]
  return hubLive(hub) ? hub : localEvents as unknown as OilEventRecord[]
}

// ── Shipping disruptions (hub only — no local fallback) ───────────────────────

export function getShippingDisruptions(): ShippingDisruption[] {
  return hubShipping as unknown as ShippingDisruption[]
}

// ── Refinery outages (hub only — no local fallback) ───────────────────────────

export function getRefineryOutages(): RefineryOutage[] {
  return hubOutages as unknown as RefineryOutage[]
}

// ── Geopolitical supply risk events (hub only — no local fallback) ────────────

export function getGeopoliticalSupplyRisk(): GeopoliticalSupplyRiskEvent[] {
  return hubSupplyRisk as unknown as GeopoliticalSupplyRiskEvent[]
}

// ── Hub connection status ─────────────────────────────────────────────────────

export interface HubStatus {
  connected:    boolean
  generatedAt:  string | null
  datasets: {
    prices:         boolean
    supply:         boolean
    oilEvents:      boolean
    shipping:       boolean
    outages:        boolean
    supplyRisk:     boolean
  }
}

export function getHubStatus(): HubStatus {
  return {
    connected:   hubLive(hubOilEvents as unknown[]) || hubLive(hubPrices as unknown[]) || hubLive(hubSupply as unknown[]),
    generatedAt: (manifest as { generated_at: string | null }).generated_at,
    datasets: {
      prices:     hubLive(hubPrices    as unknown[]),
      supply:     hubLive(hubSupply    as unknown[]),
      oilEvents:  hubLive(hubOilEvents as unknown[]),
      shipping:   hubLive(hubShipping  as unknown[]),
      outages:    hubLive(hubOutages   as unknown[]),
      supplyRisk: hubLive(hubSupplyRisk as unknown[]),
    },
  }
}
