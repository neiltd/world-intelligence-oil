import { useMemo } from 'react'
import type { OilEventRecord, EventType } from '../../types/oil'
import { useMapStore } from '../../store/useMapStore'
import { EVENT_CONFIG } from '../../utils/oilEventConfig'

// ─── Shared config re-exported so callers can avoid importing utils directly ──
export { EVENT_CONFIG }

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   '#22C55E',
  medium: '#F59E0B',
  low:    '#EF4444',
}

const SELECT_STYLE: React.CSSProperties = {
  background: '#0E1525',
  border: '1px solid #1E2D4A',
  color: '#94A3B8',
  borderRadius: 4,
  fontSize: 10,
  padding: '2px 4px',
  outline: 'none',
  cursor: 'pointer',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Single event card ────────────────────────────────────────────────────────

interface EventCardProps {
  event: OilEventRecord
  expanded: boolean
  onToggle: () => void
  onViewOnMap?: (event: OilEventRecord) => void
}

function EventCard({ event, expanded, onToggle, onViewOnMap }: EventCardProps) {
  const cfg = EVENT_CONFIG[event.event_type] ?? { color: '#475569', label: event.event_type }
  const confColor = event.confidence_level ? CONFIDENCE_COLOR[event.confidence_level] : '#475569'

  return (
    <button
      onClick={onToggle}
      className="w-full text-left transition-colors"
      style={{
        borderBottom: '1px solid #0D1829',
        borderLeft: `3px solid ${cfg.color}`,
        background: expanded ? '#0D1829' : 'transparent',
        padding: '8px 10px',
      }}
    >
      {/* Date + type badge + confidence dot */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] tabular-nums font-mono" style={{ color: '#475569' }}>
          {fmtDate(event.date)}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {event.confidence_level && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: confColor }}
              title={`Confidence: ${event.confidence_level}`}
            />
          )}
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
            style={{ background: `${cfg.color}22`, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Title */}
      <p
        className="text-[11px] font-medium leading-snug"
        style={{
          color: '#CBD5E1',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? undefined : 2,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
        }}
      >
        {event.title}
      </p>

      {/* Country */}
      {event.country && (
        <p className="text-[10px] mt-0.5" style={{ color: '#334155' }}>
          {event.country}
        </p>
      )}

      {/* Expanded — summary, source, map link, AI slot */}
      {expanded && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid #1E2D4A' }}>
          <p className="text-[11px] leading-[1.6]" style={{ color: '#94A3B8' }}>
            {event.summary}
          </p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] hover:text-blue-300 transition-colors"
                style={{ color: '#1D4ED8' }}
              >
                {event.source} ↗
              </a>
            )}
            {event.iso3 && onViewOnMap && (
              <button
                onClick={e => { e.stopPropagation(); onViewOnMap(event) }}
                className="text-[10px] px-2 py-0.5 rounded transition-colors hover:border-blue-500"
                style={{ background: '#0E1525', border: '1px solid #1E2D4A', color: '#60A5FA' }}
              >
                View {event.country ?? event.iso3} on map →
              </button>
            )}
          </div>

          {/*
            AI_EXPLANATION_SLOT
            When LLM analysis is enabled, render here.
            Expected shape: { loading: boolean; text: string | null; model: string }
            Example: <AiExplanation eventId={event.event_id} />
          */}
        </div>
      )}
    </button>
  )
}

// ─── Timeline component ───────────────────────────────────────────────────────
// activeEventId lives in the store (not local state) so OilPriceChart can read
// it to highlight the corresponding reference line on the chart.

interface OilEventTimelineProps {
  events: OilEventRecord[]
  availableYears: number[]
  onEventSelect?: (event: OilEventRecord) => void
}

export default function OilEventTimeline({
  events,
  availableYears,
  onEventSelect,
}: OilEventTimelineProps) {
  const {
    activeEventId, setActiveEventId,
    filterYear, setFilterYear,
    filterEventType, setFilterEventType,
    selectedCountryId, countryData,
    clearSelection,
  } = useMapStore()

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  )

  function toggle(id: string) {
    setActiveEventId(activeEventId === id ? null : id)
  }

  const countryLabel = countryData?.name ?? selectedCountryId
  const hasActiveFilter = selectedCountryId || filterYear !== null || filterEventType !== null

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0F1E' }}>

      {/* Header */}
      <div className="flex-shrink-0" style={{ borderBottom: '1px solid #1E2D4A' }}>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white">Oil Events</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium tabular-nums"
              style={{ background: '#1E2D4A', color: '#475569' }}
            >
              {sorted.length}
            </span>
          </div>
          <span className="text-[9px]" style={{ color: '#1E3A5F' }}>
            OPEC · OFAC · EIA · Sample
          </span>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
          {selectedCountryId && (
            <span
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: '#1E3A5F', color: '#60A5FA', border: '1px solid #1D4ED8' }}
            >
              {countryLabel}
              <button onClick={clearSelection} className="hover:text-white transition-colors ml-0.5 leading-none" title="Clear country filter">×</button>
            </span>
          )}

          {availableYears.length > 1 && (
            <select
              value={filterYear ?? ''}
              onChange={e => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : null)}
              style={SELECT_STYLE}
            >
              <option value="">All years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          <select
            value={filterEventType ?? ''}
            onChange={e => setFilterEventType((e.target.value as EventType) || null)}
            style={SELECT_STYLE}
          >
            <option value="">All types</option>
            {(Object.entries(EVENT_CONFIG) as [EventType, { label: string }][]).map(([type, { label }]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>

          {hasActiveFilter && (
            <button
              onClick={() => { clearSelection(); setFilterYear(null); setFilterEventType(null) }}
              className="text-[9px] hover:text-slate-400 transition-colors ml-auto"
              style={{ color: '#334155' }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <p className="text-[11px]" style={{ color: '#475569' }}>
              {selectedCountryId ? `No events for ${countryLabel}` : 'No events match current filters'}
            </p>
            <button
              onClick={() => { clearSelection(); setFilterYear(null); setFilterEventType(null) }}
              className="text-[10px] underline hover:text-slate-400 transition-colors"
              style={{ color: '#334155' }}
            >
              Show all events
            </button>
          </div>
        ) : (
          sorted.map(event => (
            <EventCard
              key={event.event_id}
              event={event}
              expanded={activeEventId === event.event_id}
              onToggle={() => toggle(event.event_id)}
              onViewOnMap={onEventSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
