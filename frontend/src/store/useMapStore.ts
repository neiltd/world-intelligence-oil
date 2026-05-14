import { create } from 'zustand'
import type { Country } from '../types/country'
import type { OilLayerMetric, EventType } from '../types/oil'

export type { OilLayerMetric }

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

  // Active event — the event currently expanded/focused in the timeline.
  // Shared so OilPriceChart can highlight the corresponding reference line.
  // null = no event active.
  activeEventId: string | null
  setActiveEventId: (id: string | null) => void

  // Event filters — centralized so any component can read or set them
  // null = no filter active (show all)
  filterYear: number | null
  setFilterYear: (year: number | null) => void
  filterEventType: EventType | null
  setFilterEventType: (type: EventType | null) => void

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

  // Oil layer — production by default (reserves=null in live EIA data)
  oilMetric: 'production',
  setOilMetric: (metric) => set({ oilMetric: metric }),

  // Active event — none on load
  activeEventId: null,
  setActiveEventId: (id) => set({ activeEventId: id }),

  // Event filters — all unset by default
  filterYear: null,
  setFilterYear: (year) => set({ filterYear: year }),
  filterEventType: null,
  setFilterEventType: (type) => set({ filterEventType: type }),

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

  showEventMarkers: true,   // on by default — hub has 38 geocoordinated events
  toggleEventMarkers: () => set(s => ({ showEventMarkers: !s.showEventMarkers })),
}))
