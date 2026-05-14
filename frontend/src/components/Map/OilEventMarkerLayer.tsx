/**
 * OilEventMarkerLayer
 *
 * Renders geocoordinated hub oil events as MapLibre markers.
 * Hub is the sole authority on coordinates — this layer never geocodes,
 * infers, or modifies coordinateQuality.
 *
 * Coordinate rendering rules (Hub PM approved 2026-05-14):
 *   source_exact    → solid precise dot, full opacity
 *   source_approx   → solid dot, reduced opacity
 *   country_centroid → soft dashed ring, low opacity
 *   missing/absent  → omit entirely
 *
 * Focus model:
 *   focused          → larger dot, white border ring, full opacity
 *   storyline_linked → same-storyline_id as focused event → amber dashed ring
 *   dimmed           → all other events when focus is active → 25% opacity
 *   normal           → default when no event is focused
 */
import { useMemo, useState } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { getHubOilEvents } from '../../data/imports/adapter'
import { useMapStore } from '../../store/useMapStore'
import type { HubOilEvent, HubCoordinateQuality } from '../../types/hub'

// ── Static data (loaded once at module level) ─────────────────────────────────

const HUB_EVENTS = getHubOilEvents()
const HUB_BY_ID  = new Map(HUB_EVENTS.map(e => [e.event_id, e]))

// ── Event type config ─────────────────────────────────────────────────────────

export const HUB_EVENT_COLOR: Record<string, string> = {
  supply_disruption:     '#EF4444',
  energy_infrastructure: '#3B82F6',
  armed_conflict:        '#DC2626',
  sanctions:             '#F97316',
  opec_decision:         '#F59E0B',
  diplomatic_incident:   '#8B5CF6',
  economic_data_release: '#06B6D4',
  trade_dispute:         '#64748B',
  other:                 '#475569',
}

export const HUB_EVENT_LABEL: Record<string, string> = {
  supply_disruption:     'Supply Disruption',
  energy_infrastructure: 'Infrastructure',
  armed_conflict:        'Armed Conflict',
  sanctions:             'Sanctions',
  opec_decision:         'OPEC Decision',
  diplomatic_incident:   'Diplomatic',
  economic_data_release: 'Economic',
  trade_dispute:         'Trade Dispute',
  other:                 'Other',
}

const QUALITY_LABEL: Record<string, string> = {
  source_exact:     'Exact',
  source_approx:    'Approx',
  country_centroid: 'Country centroid',
}

// ── Focus state ───────────────────────────────────────────────────────────────

type FocusState = 'focused' | 'storyline_linked' | 'dimmed' | 'normal'

function getFocusState(
  event: HubOilEvent,
  activeEventId: string | null,
  activeStorylineId: string | null | undefined,
): FocusState {
  if (!activeEventId) return 'normal'
  if (event.event_id === activeEventId) return 'focused'
  // storyline_id linking — latent in current test data, ready for when hub provides it
  if (
    activeStorylineId &&
    event.storyline_id &&
    event.storyline_id === activeStorylineId
  ) return 'storyline_linked'
  return 'dimmed'
}

// ── Marker geometry ───────────────────────────────────────────────────────────

interface BaseMarkerStyle {
  coreSize: number   // core dot diameter (px)
  opacity:  number   // core dot opacity
  padded:   boolean  // true = outer ring → add padding to hit area
}

function baseStyle(
  quality: HubCoordinateQuality | undefined,
  severity: number,
): BaseMarkerStyle | null {
  const sev = Math.max(1, Math.min(5, severity))
  switch (quality) {
    case 'source_exact':    return { coreSize: Math.round(7 + sev * 1.4), opacity: 0.92, padded: false }
    case 'source_approx':   return { coreSize: Math.round(7 + sev * 1.4), opacity: 0.68, padded: false }
    case 'country_centroid':return { coreSize: Math.round(9 + sev * 1.2), opacity: 0.35, padded: true  }
    case 'missing':
    default:                return null
  }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState { event: HubOilEvent; x: number; y: number }

function EventTooltip({ t }: { t: TooltipState }) {
  const e       = t.event
  const color   = HUB_EVENT_COLOR[e.event_type] ?? '#475569'
  const label   = HUB_EVENT_LABEL[e.event_type] ?? e.event_type
  const qualLbl = e.coordinateQuality ? (QUALITY_LABEL[e.coordinateQuality] ?? e.coordinateQuality) : '—'
  const confPct = Math.round(e.confidence * 100)
  const escPct  = Math.round(e.escalation_potential * 100)

  return (
    <div
      className="fixed z-[200] pointer-events-none rounded-lg shadow-2xl border text-xs"
      style={{ left: t.x + 14, top: t.y - 10, background: '#0E1525', borderColor: '#1E2D4A', padding: '10px 12px', maxWidth: 260, minWidth: 190 }}
    >
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
          style={{ background: `${color}22`, color }}>
          {label}
        </span>
        <span className="text-[9px]" style={{ color: '#334155' }}>
          {qualLbl} · {e.locationType ?? '—'}
        </span>
      </div>
      <p className="text-[11px] font-medium leading-snug mb-2" style={{ color: '#CBD5E1' }}>
        {e.title}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]" style={{ color: '#475569' }}>
        <span>Severity</span>
        <span className="font-mono font-semibold text-right" style={{ color }}>
          {e.severity}/5
        </span>
        <span>Confidence</span>
        <span className="font-mono font-semibold text-right" style={{ color: confPct >= 80 ? '#22C55E' : confPct >= 60 ? '#F59E0B' : '#EF4444' }}>
          {confPct}%
        </span>
        <span>Escalation</span>
        <span className="font-mono font-semibold text-right" style={{ color: escPct >= 70 ? '#EF4444' : escPct >= 40 ? '#F59E0B' : '#94A3B8' }}>
          {escPct}%
        </span>
        <span>Sources</span>
        <span className="font-mono font-semibold text-right" style={{ color: '#94A3B8' }}>
          {e.source_count}
        </span>
      </div>
      {(e.is_supply_disruption || e.is_hormuz_related) && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {e.is_supply_disruption && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#450A0A', color: '#EF4444' }}>
              SUPPLY
            </span>
          )}
          {e.is_hormuz_related && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#431407', color: '#F97316' }}>
              HORMUZ
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Layer ─────────────────────────────────────────────────────────────────────

interface Props { visible: boolean }

export default function OilEventMarkerLayer({ visible }: Props) {
  const { activeEventId, setActiveEventId, hubEventFilters } = useMapStore()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Focused event's storyline_id — used for storyline linking
  const activeEvent        = activeEventId ? HUB_BY_ID.get(activeEventId) : undefined
  const activeStorylineId  = activeEvent?.storyline_id ?? null
  const anyFocused         = activeEventId !== null

  // Apply hub event filters
  const visibleEvents = useMemo(() => {
    const f = hubEventFilters
    return HUB_EVENTS.filter(e => {
      if (e.lat === undefined || e.lng === undefined) return false
      if (!baseStyle(e.coordinateQuality, e.severity)) return false
      if (f.severityMin > 1 && e.severity < f.severityMin) return false
      if (f.eventType !== null && e.event_type !== f.eventType) return false
      if (f.hormuzOnly && !e.is_hormuz_related) return false
      if (f.supplyOnly && !e.is_supply_disruption) return false
      if (f.qualityFilter !== null && e.coordinateQuality !== f.qualityFilter) return false
      return true
    })
  }, [hubEventFilters])

  if (!visible || HUB_EVENTS.length === 0) return null

  return (
    <>
      {visibleEvents.map(e => {
        const base      = baseStyle(e.coordinateQuality, e.severity)!
        const color     = HUB_EVENT_COLOR[e.event_type] ?? '#475569'
        const focus     = getFocusState(e, activeEventId, activeStorylineId)
        const isFocused = focus === 'focused'

        // Apply focus-state transforms
        const coreSize = isFocused ? Math.round(base.coreSize * 1.45) : base.coreSize
        const opacity  = focus === 'dimmed' ? 0.18
                       : focus === 'normal' ? base.opacity
                       : isFocused          ? 1.0
                       : base.opacity * 0.85

        // Outer ring: country_centroid (quality ring) OR storyline_linked (amber dash) OR focused (white)
        const showQualityRing   = base.padded && !isFocused && focus !== 'storyline_linked'
        const showStorylineRing = focus === 'storyline_linked'
        const showFocusRing     = isFocused

        // Container size accommodates largest possible ring
        const containerSize = coreSize + (showFocusRing ? 10 : showQualityRing || showStorylineRing ? 8 : 0)

        return (
          <Marker
            key={e.event_id}
            latitude={e.lat!}
            longitude={e.lng!}
            anchor="center"
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: containerSize, height: containerSize, cursor: 'pointer' }}
              onMouseEnter={ev => setTooltip({ event: e, x: ev.clientX, y: ev.clientY })}
              onMouseMove={ev => setTooltip(t => t ? { ...t, x: ev.clientX, y: ev.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
              onClick={ev => {
                ev.stopPropagation()
                setActiveEventId(isFocused ? null : e.event_id)
                setTooltip(null)
              }}
            >
              {/* Focus ring (white border) */}
              {showFocusRing && (
                <div className="absolute rounded-full pointer-events-none"
                  style={{ inset: 0, border: '2px solid rgba(255,255,255,0.85)' }} />
              )}
              {/* Storyline ring (amber dash — latent until hub provides storyline_id) */}
              {showStorylineRing && (
                <div className="absolute rounded-full pointer-events-none"
                  style={{ inset: -4, border: '1.5px dashed #F59E0B', opacity: 0.7 }} />
              )}
              {/* Quality ring (country_centroid soft ring) */}
              {showQualityRing && (
                <div className="absolute rounded-full pointer-events-none"
                  style={{ inset: 0, border: `1.5px dashed ${color}`, opacity: opacity * 0.65 }} />
              )}
              {/* Core dot */}
              <div
                style={{
                  width:        coreSize,
                  height:       coreSize,
                  borderRadius: '50%',
                  background:   color,
                  opacity,
                  // Subtle glow for sev ≥4 when not dimmed
                  boxShadow:    (e.severity >= 4 && focus !== 'dimmed')
                                  ? `0 0 ${e.severity * 2}px ${color}55` : 'none',
                  flexShrink:   0,
                  transition:   'opacity 0.15s ease, width 0.1s ease, height 0.1s ease',
                }}
              />
            </div>
          </Marker>
        )
      })}

      {/* Dismiss focus on empty map click — handled separately */}
      {tooltip && !anyFocused && <EventTooltip t={tooltip} />}
      {tooltip && anyFocused  && <EventTooltip t={tooltip} />}
    </>
  )
}
