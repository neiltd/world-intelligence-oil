import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMapStore, DEFAULT_HUB_FILTERS } from './store/useMapStore'
import WorldMap from './components/Map/WorldMap'
import CountryPanel from './components/Panel/CountryPanel'
import SearchBar from './components/UI/SearchBar'
import OilPriceChart from './components/Oil/OilPriceChart'
import OilEventTimeline from './components/Oil/OilEventTimeline'
import DataStatus from './components/UI/DataStatus'
import OilIntelligencePanel from './components/Intelligence/OilIntelligencePanel'
import type { OilEventRecord } from './types/oil'
import eventsRaw from './data/oil/oil_events_sample.json'

// ─── Static data ──────────────────────────────────────────────────────────────
// allEvents is the complete unfiltered dataset. Filtering is computed below based
// on store state. When live ingestion lands, replace this import with a hook.

const allEvents = eventsRaw as OilEventRecord[]

// Available years derived once from the full dataset — passed to the timeline so
// the year filter dropdown reflects the complete dataset, not the filtered slice.
const availableYears = [...new Set(allEvents.map(e => parseInt(e.date.slice(0, 4), 10)))]
  .sort((a, b) => b - a)

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_LABELS = { reserves: 'Reserves', production: 'Production' } as const

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const {
    selectedCountryId,
    oilMetric, setOilMetric,
    isLayerVisible, toggleLayerById,
    filterYear, filterEventType,
    selectCountry,
    showIntelligence, toggleIntelligence,
    showEventMarkers, toggleEventMarkers,
    hubEventFilters,
  } = useMapStore()

  // Count active hub event filters for the badge on the Event markers button
  const activeFilterCount = [
    hubEventFilters.severityMin > DEFAULT_HUB_FILTERS.severityMin,
    hubEventFilters.eventType !== null,
    hubEventFilters.hormuzOnly,
    hubEventFilters.supplyOnly,
    hubEventFilters.qualityFilter !== null,
  ].filter(Boolean).length

  const showPanel  = !!selectedCountryId
  const oilLayerOn = isLayerVisible('oil')

  // ── Event filtering ─────────────────────────────────────────────────────────
  // All filter logic lives here so OilEventTimeline stays stateless w.r.t. data.
  // selectedCountryId doubles as the country filter — no separate filterCountry field.

  const filteredEvents = useMemo(() => allEvents.filter(e => {
    if (selectedCountryId && e.iso3 !== selectedCountryId) return false
    if (filterYear !== null && parseInt(e.date.slice(0, 4), 10) !== filterYear) return false
    if (filterEventType !== null && e.event_type !== filterEventType) return false
    return true
  }), [selectedCountryId, filterYear, filterEventType])

  // ── Interaction handler ─────────────────────────────────────────────────────
  // Called when "View on map" is clicked in an event card.
  // Selects the country, which opens the panel and highlights the map.
  // Note: for countries without a JSON file (e.g. PAN), the panel will show an
  // error state but the country WILL be highlighted on the map (fixed in WorldMap).

  function handleEventSelect(event: OilEventRecord) {
    if (event.iso3) selectCountry(event.iso3)
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#070B14' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0 z-[100]"
        style={{ background: '#0A0F1E', borderBottom: '1px solid #1E2D4A' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-lg">🛢️</span>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white leading-none">Oil Intelligence</p>
          </div>
        </div>

        <div className="w-px h-5 mx-1 hidden sm:block" style={{ background: '#1E2D4A' }} />

        <SearchBar />

        <div className="w-px h-5 mx-1 hidden md:block" style={{ background: '#1E2D4A' }} />

        {/* Oil layer controls */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => toggleLayerById('oil')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
            style={{
              background: oilLayerOn ? '#F59E0B22' : '#0E1525',
              border: `1px solid ${oilLayerOn ? '#F59E0B' : '#1E2D4A'}`,
              color: oilLayerOn ? '#F59E0B' : '#475569',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: oilLayerOn ? '#F59E0B' : '#475569' }}
            />
            Oil map
          </button>

          {oilLayerOn && (
            <>
              {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map(key => (
                <button
                  key={key}
                  onClick={() => setOilMetric(key)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
                  style={{
                    background: oilMetric === key ? '#1E2D4A' : 'transparent',
                    border: `1px solid ${oilMetric === key ? '#334155' : 'transparent'}`,
                    color: oilMetric === key ? '#CBD5E1' : '#475569',
                  }}
                >
                  {METRIC_LABELS[key]}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Event markers toggle */}
        <button
          onClick={toggleEventMarkers}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
          style={{
            background: showEventMarkers ? '#EF444422' : '#0E1525',
            border:     `1px solid ${showEventMarkers ? '#EF4444' : '#1E2D4A'}`,
            color:      showEventMarkers ? '#EF4444' : '#475569',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: showEventMarkers ? '#EF4444' : '#475569' }} />
          Event markers
          {activeFilterCount > 0 && (
            <span
              className="ml-0.5 px-1 rounded-full font-bold"
              style={{ background: '#EF444444', color: '#EF4444', fontSize: 9 }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Intelligence toggle */}
        <button
          onClick={toggleIntelligence}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
          style={{
            background:   showIntelligence ? '#F59E0B22' : '#0E1525',
            border:       `1px solid ${showIntelligence ? '#F59E0B' : '#1E2D4A'}`,
            color:        showIntelligence ? '#F59E0B' : '#475569',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: showIntelligence ? '#F59E0B' : '#475569' }} />
          Intelligence
        </button>

        <DataStatus />

        <div className="w-px h-5 mx-1 hidden sm:block" style={{ background: '#1E2D4A' }} />

        <a
          href="https://github.com/neiltd/world-intelligence-oil"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs transition-colors hidden sm:block hover:text-slate-300"
          style={{ color: '#334155' }}
        >
          GitHub ↗
        </a>
      </header>

      {/* ── Map + panels ───────────────────────────────────────────────────── */}
      <div className="flex overflow-hidden" style={{ flex: '1 1 0', minHeight: 0 }}>

        {/* Intelligence left panel */}
        <AnimatePresence>
          {showIntelligence && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-[360px] xl:w-[400px] min-w-[320px] flex-shrink-0 flex flex-col overflow-hidden"
              style={{ background: '#0A0F1E', borderRight: '1px solid #1E2D4A' }}
            >
              <OilIntelligencePanel onClose={toggleIntelligence} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 relative">
          <WorldMap />
        </div>

        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-[400px] xl:w-[460px] min-w-[360px] flex-shrink-0 flex flex-col overflow-hidden"
              style={{ background: '#0A0F1E', borderLeft: '1px solid #1E2D4A' }}
            >
              <CountryPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom row: price chart + event timeline ────────────────────────── */}
      <div className="flex flex-shrink-0 overflow-hidden" style={{ height: 'clamp(200px, 25vh, 280px)' }}>

        <div className="flex-1 min-w-0">
          <OilPriceChart events={filteredEvents} />
        </div>

        <div className="flex-shrink-0" style={{ width: 300, borderLeft: '1px solid #1E2D4A' }}>
          <OilEventTimeline
            events={filteredEvents}
            availableYears={availableYears}
            onEventSelect={handleEventSelect}
          />
        </div>

      </div>
    </div>
  )
}
