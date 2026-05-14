import { create } from 'zustand'
import type { Country } from '../types/country'
import type { OilLayerMetric, EventType } from '../types/oil'
import type { HubCoordinateQuality } from '../types/hub'

export type { OilLayerMetric }

// ─── Hub event filter state ───────────────────────────────────────────────────
// Centralised so the filter bar and the marker layer share the same state.
// Filters apply only to hub event markers (OilEventMarkerLayer), not to the
// OilEventTimeline which uses the legacy OilEventRecord[] data source.

export interface HubEventFilters {
  severityMin:   number                      // 1–5; 1 = show all
  eventType:     string | null               // null = all hub event types
  hormuzOnly:    boolean                     // only is_hormuz_related events
  supplyOnly:    boolean                     // only is_supply_disruption events
  qualityFilter: HubCoordinateQuality | null // null = all coordinate qualities
}

export const DEFAULT_HUB_FILTERS: HubEventFilters = {
  severityMin:   1,
  eventType:     null,
  hormuzOnly:    false,
  supplyOnly:    false,
  qualityFilter: null,
}

interface MapStore {
  // Country selection
  selectedCountryId: string | null
  countryData: Country | null
  loading: boolean
  error: string | null
  selectCountry: (id: string) => Promise<void>
  clearSelection: () => void

  // Comparison (second country)
  compareCountryId: string | null
  compareData: Country | null
  compareLoading: boolean
  setCompare: (id: string) => Promise<void>
  clearCompare: () => void

  // Oil choropleth — which metric to display on the map
  oilMetric: OilLayerMetric
  setOilMetric: (metric: OilLayerMetric) => void

  // Active event — focused event shared between marker layer, chart, and timeline
  activeEventId: string | null
  setActiveEventId: (id: string | null) => void

  // Legacy OilEventTimeline filters (OilEventRecord schema)
  filterYear: number | null
  setFilterYear: (year: number | null) => void
  filterEventType: EventType | null
  setFilterEventType: (type: EventType | null) => void

  // Hub event marker filters (HubOilEvent schema — separate from timeline filters)
  hubEventFilters: HubEventFilters
  setHubEventFilters: (patch: Partial<HubEventFilters>) => void
  resetHubEventFilters: () => void

  // Extensible layer visibility — keyed by layer ID
  layerVisibility: Record<string, boolean>
  setLayerVisible: (id: string, visible: boolean) => void
  toggleLayerById: (id: string) => void
  isLayerVisible: (id: string) => boolean

  // Intelligence panel
  showIntelligence: boolean
  toggleIntelligence: () => void

  // Event marker layer (hub geocoordinated events on map)
  showEventMarkers: boolean
  toggleEventMarkers: () => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedCountryId: null,
  countryData: null,
  loading: false,
  error: null,

  selectCountry: async (id: string) => {
    set({ selectedCountryId: id, loading: true, error: null, countryData: null })
    try {
      const module = await import(`../data/countries/${id}.json`)
      set({ countryData: module.default as Country, loading: false })
    } catch {
      set({ error: 'No data available for this country yet.', loading: false })
    }
  },

  clearSelection: () => set({ selectedCountryId: null, countryData: null, error: null }),

  compareCountryId: null,
  compareData: null,
  compareLoading: false,

  setCompare: async (id: string) => {
    set({ compareCountryId: id, compareLoading: true, compareData: null })
    try {
      const module = await import(`../data/countries/${id}.json`)
      set({ compareData: module.default as Country, compareLoading: false })
    } catch {
      set({ compareLoading: false })
    }
  },

  clearCompare: () => set({ compareCountryId: null, compareData: null }),

  oilMetric: 'production',
  setOilMetric: (metric) => set({ oilMetric: metric }),

  activeEventId: null,
  setActiveEventId: (id) => set({ activeEventId: id }),

  filterYear: null,
  setFilterYear: (year) => set({ filterYear: year }),
  filterEventType: null,
  setFilterEventType: (type) => set({ filterEventType: type }),

  // Hub event marker filters
  hubEventFilters: { ...DEFAULT_HUB_FILTERS },
  setHubEventFilters: (patch) =>
    set(s => ({ hubEventFilters: { ...s.hubEventFilters, ...patch } })),
  resetHubEventFilters: () => set({ hubEventFilters: { ...DEFAULT_HUB_FILTERS } }),

  layerVisibility: { oil: true },
  setLayerVisible: (id, visible) =>
    set(s => ({ layerVisibility: { ...s.layerVisibility, [id]: visible } })),
  toggleLayerById: (id) =>
    set(s => ({ layerVisibility: { ...s.layerVisibility, [id]: !s.layerVisibility[id] } })),
  isLayerVisible: (id: string): boolean => {
    return useMapStore.getState().layerVisibility[id] ?? false
  },

  showIntelligence: false,
  toggleIntelligence: () => set(s => ({ showIntelligence: !s.showIntelligence })),

  showEventMarkers: true,
  toggleEventMarkers: () => set(s => ({ showEventMarkers: !s.showEventMarkers })),
}))
