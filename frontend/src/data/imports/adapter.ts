/**
 * Shared Data Hub Adapter
 *
 * This module is the single point of contact between the frontend and the
 * shared intelligence hub's exported JSON files. Components never import hub
 * files directly — they go through this adapter.
 *
 * Hub files land in:   data/imports/          (repo root, hub writes here)
 * Frontend symlink to: frontend/src/data/imports/  (Vite bundler picks up)
 *
 * Current status: stub implementation. Components fall back to local live/
 * data until the hub delivers populated files.
 *
 * Hub contract is defined in:  data/imports/manifest.json
 * Field-level documentation:   frontend/src/data/oil/DATA_CONTRACT.md
 */

import type { OilPriceRecord, OilCountrySupplyRecord, OilEventRecord } from '../../types/oil'

// ── Hub file imports ──────────────────────────────────────────────────────────
// These are the canonical hub-supplied files. They start as empty arrays and
// become populated when the hub begins exporting to this project.

import hubPrices   from './price-series.json'
import hubSupply   from './energy-indicators.json'
import hubEvents   from './events.json'
import manifest    from './manifest.json'

// ── Fallback: local EIA ingestion outputs ─────────────────────────────────────
// Used when hub files are empty (i.e. hub not yet connected).
// Remove once the hub reliably delivers all three datasets.

import localPrices from '../oil/live/oil_price.json'
import localSupply from '../oil/live/oil_country_supply.json'
import localEvents from '../oil/oil_events_sample.json'

// ── Manifest type ─────────────────────────────────────────────────────────────

interface DatasetStatus {
  file:   string
  status: 'live' | 'pending' | 'planned'
}

interface Manifest {
  schema_version: string
  generated_by:   string
  generated_at:   string | null
  datasets: Record<string, DatasetStatus>
}

// ── Adapter functions ─────────────────────────────────────────────────────────
// Each function returns hub data when available, local data otherwise.
// "Available" = the hub array is non-empty.

export function getPrices(): OilPriceRecord[] {
  const hub = hubPrices as unknown as OilPriceRecord[]
  return hub.length > 0 ? hub : localPrices as unknown as OilPriceRecord[]
}

export function getSupply(): OilCountrySupplyRecord[] {
  const hub = hubSupply as unknown as OilCountrySupplyRecord[]
  return hub.length > 0 ? hub : localSupply as unknown as OilCountrySupplyRecord[]
}

export function getEvents(): OilEventRecord[] {
  const hub = hubEvents as unknown as OilEventRecord[]
  return hub.length > 0 ? hub : localEvents as unknown as OilEventRecord[]
}

// ── Hub connection status ─────────────────────────────────────────────────────

export interface HubStatus {
  connected:    boolean          // true when hub has delivered at least one dataset
  generatedAt:  string | null    // ISO timestamp from hub manifest
  datasets: {
    prices:  boolean
    supply:  boolean
    events:  boolean
  }
}

export function getHubStatus(): HubStatus {
  const m = manifest as unknown as Manifest
  const pricesLive  = (hubPrices  as unknown[]).length > 0
  const supplyLive  = (hubSupply  as unknown[]).length > 0
  const eventsLive  = (hubEvents  as unknown[]).length > 0
  return {
    connected:   pricesLive || supplyLive || eventsLive,
    generatedAt: m.generated_at ?? null,
    datasets: { prices: pricesLive, supply: supplyLive, events: eventsLive },
  }
}
