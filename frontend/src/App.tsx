import { AnimatePresence, motion } from 'framer-motion'
import { useMapStore } from './store/useMapStore'
import WorldMap from './components/Map/WorldMap'
import CountryPanel from './components/Panel/CountryPanel'
import SearchBar from './components/UI/SearchBar'
import OilPriceChart from './components/Oil/OilPriceChart'

const METRIC_LABELS = { reserves: 'Reserves', production: 'Production' } as const

export default function App() {
  const {
    selectedCountryId,
    oilMetric, setOilMetric,
    isLayerVisible, toggleLayerById,
  } = useMapStore()

  const showPanel    = !!selectedCountryId
  const oilLayerOn   = isLayerVisible('oil')

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
            <p className="text-xs leading-none mt-0.5" style={{ color: '#334155' }}>Phase 1 MVP</p>
          </div>
        </div>

        <div className="w-px h-5 mx-1 hidden sm:block" style={{ background: '#1E2D4A' }} />

        <SearchBar />

        <div className="w-px h-5 mx-1 hidden md:block" style={{ background: '#1E2D4A' }} />

        {/* Oil layer controls — toggle on/off + metric switch */}
        <div className="hidden md:flex items-center gap-1.5">
          {/* Layer on/off */}
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

          {/* Metric selector — only meaningful when layer is on */}
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

      {/* ── Map + country panel ─────────────────────────────────────────────── */}
      <div className="flex overflow-hidden" style={{ flex: '1 1 0', minHeight: 0 }}>

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

      {/* ── Oil price chart ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0" style={{ height: 240 }}>
        <OilPriceChart />
      </div>
    </div>
  )
}
