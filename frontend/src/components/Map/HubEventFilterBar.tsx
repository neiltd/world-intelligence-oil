/**
 * HubEventFilterBar
 *
 * Compact filter overlay for the hub event marker layer.
 * Rendered as a bottom-right absolute overlay inside the WorldMap container.
 * Reads/writes hubEventFilters from the store.
 */
import { useState } from 'react'
import { useMapStore, DEFAULT_HUB_FILTERS } from '../../store/useMapStore'
import { HUB_EVENT_COLOR, HUB_EVENT_LABEL } from './OilEventMarkerLayer'

// Event types that have enough events to be worth filtering on (≥2 events)
const FILTERABLE_TYPES = [
  'supply_disruption',
  'energy_infrastructure',
  'armed_conflict',
  'sanctions',
  'opec_decision',
  'trade_dispute',
  'other',
]

const PILL: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid',
  transition: 'all 0.1s ease',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}

export default function HubEventFilterBar() {
  const { hubEventFilters, setHubEventFilters, resetHubEventFilters } = useMapStore()
  const [open, setOpen] = useState(false)

  const f = hubEventFilters

  // Count active filters (excluding defaults)
  const activeCount = [
    f.severityMin > DEFAULT_HUB_FILTERS.severityMin,
    f.eventType   !== null,
    f.hormuzOnly,
    f.supplyOnly,
    f.qualityFilter !== null,
  ].filter(Boolean).length

  const headerBg = open ? '#0D1829' : '#0A0F1ECC'

  return (
    <div
      className="absolute z-10 rounded-lg border"
      style={{ bottom: 24, right: 12, background: headerBg, borderColor: '#1E2D4A', backdropFilter: 'blur(4px)', minWidth: 140 }}
    >
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-medium"
        style={{ color: activeCount > 0 ? '#F59E0B' : '#475569' }}
      >
        <span className="flex items-center gap-1.5">
          <span style={{ fontSize: 11 }}>⚙</span>
          Filter events
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#F59E0B33', color: '#F59E0B', fontSize: 9 }}>
              {activeCount}
            </span>
          )}
        </span>
        <span style={{ fontSize: 10, color: '#334155' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded filter panel */}
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2.5" style={{ borderTop: '1px solid #1E2D4A' }}>

          {/* Quick toggles */}
          <div className="pt-2 flex flex-wrap gap-1">
            <button
              style={{
                ...PILL,
                background: f.hormuzOnly ? '#43140733' : 'transparent',
                borderColor: f.hormuzOnly ? '#F97316' : '#1E2D4A',
                color: f.hormuzOnly ? '#F97316' : '#475569',
              }}
              onClick={() => setHubEventFilters({ hormuzOnly: !f.hormuzOnly, supplyOnly: f.hormuzOnly ? f.supplyOnly : false })}
            >
              🟠 Hormuz
            </button>
            <button
              style={{
                ...PILL,
                background: f.supplyOnly ? '#45090A33' : 'transparent',
                borderColor: f.supplyOnly ? '#EF4444' : '#1E2D4A',
                color: f.supplyOnly ? '#EF4444' : '#475569',
              }}
              onClick={() => setHubEventFilters({ supplyOnly: !f.supplyOnly, hormuzOnly: f.supplyOnly ? f.hormuzOnly : false })}
            >
              ⛽ Supply
            </button>
          </div>

          {/* Severity threshold */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#334155' }}>
              Min severity
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setHubEventFilters({ severityMin: f.severityMin === n ? 1 : n })}
                  style={{
                    ...PILL,
                    padding: '2px 6px',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    background: f.severityMin === n ? '#1E2D4A' : 'transparent',
                    borderColor: f.severityMin <= n ? (n >= 4 ? '#EF4444' : n >= 3 ? '#F59E0B' : '#475569') : '#1E2D4A',
                    color: f.severityMin <= n ? (n >= 4 ? '#EF4444' : n >= 3 ? '#F59E0B' : '#475569') : '#334155',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Event type */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#334155' }}>
              Event type
            </p>
            <select
              value={f.eventType ?? ''}
              onChange={e => setHubEventFilters({ eventType: e.target.value || null })}
              style={{
                width: '100%',
                background: '#0E1525',
                border: '1px solid #1E2D4A',
                color: f.eventType ? (HUB_EVENT_COLOR[f.eventType] ?? '#94A3B8') : '#94A3B8',
                borderRadius: 4,
                fontSize: 10,
                padding: '3px 6px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All types</option>
              {FILTERABLE_TYPES.map(t => (
                <option key={t} value={t}>{HUB_EVENT_LABEL[t] ?? t}</option>
              ))}
            </select>
          </div>

          {/* Coordinate quality */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#334155' }}>
              Location precision
            </p>
            <div className="flex flex-wrap gap-1">
              {([
                ['source_exact',     'GPS exact'],
                ['source_approx',    'Approx'],
                ['country_centroid', 'Country'],
              ] as [string, string][]).map(([q, lbl]) => (
                <button
                  key={q}
                  onClick={() => setHubEventFilters({ qualityFilter: f.qualityFilter === q ? null : q as never })}
                  style={{
                    ...PILL,
                    background: f.qualityFilter === q ? '#1E2D4A' : 'transparent',
                    borderColor: f.qualityFilter === q ? '#60A5FA' : '#1E2D4A',
                    color: f.qualityFilter === q ? '#60A5FA' : '#475569',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Clear */}
          {activeCount > 0 && (
            <button
              onClick={resetHubEventFilters}
              className="text-[9px] text-left hover:text-slate-400 transition-colors"
              style={{ color: '#334155' }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
