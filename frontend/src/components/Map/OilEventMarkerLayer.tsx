/**
 * OilEventMarkerLayer
 *
 * Renders geocoordinated oil events from the hub as map markers.
 * Hub is the sole authority on coordinates — this layer never geocodes,
 * infers, or modifies coordinateQuality.
 *
 * Rendering rules (approved by Hub PM 2026-05-14):
 *   source_exact    → solid precise marker, full opacity
 *   source_approx   → solid marker, reduced opacity
 *   country_centroid → soft ring indicator, low opacity
 *   missing (or absent) → omit from map entirely
 */
import { useState } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { getHubOilEvents } from '../../data/imports/adapter'
import type { HubOilEvent, HubCoordinateQuality } from '../../types/hub'

// ── Pre-load hub events once (module level) ───────────────────────────────────

const HUB_EVENTS = getHubOilEvents()

// ── Event type display config ─────────────────────────────────────────────────

const EVENT_COLOR: Record<string, string> = {
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

const EVENT_LABEL: Record<string, string> = {
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

// ── Marker geometry by coordinateQuality ─────────────────────────────────────
// source_exact / source_approx: precise dot, scaled by severity
// country_centroid: larger, low-opacity ring

interface MarkerStyle {
  size:    number
  opacity: number
  ring:    boolean     // show dashed outer ring (country_centroid)
}

function markerStyle(
  quality: HubCoordinateQuality | undefined,
  severity: number,
): MarkerStyle | null {
  const sev = Math.max(1, Math.min(5, severity))

  switch (quality) {
    case 'source_exact': return {
      size:    Math.round(8 + sev * 1.4),   // 9–15px
      opacity: 0.92,
      ring:    false,
    }
    case 'source_approx': return {
      size:    Math.round(8 + sev * 1.4),
      opacity: 0.68,
      ring:    false,
    }
    case 'country_centroid': return {
      size:    Math.round(10 + sev * 1.2),  // 11–16px
      opacity: 0.38,
      ring:    true,
    }
    case 'missing':
    default:
      return null   // omit from map
  }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState {
  event: HubOilEvent
  x: number
  y: number
}

function EventTooltip({ t }: { t: TooltipState }) {
  const e    = t.event
  const color = EVENT_COLOR[e.event_type] ?? '#475569'
  const label = EVENT_LABEL[e.event_type] ?? e.event_type
  const qualLabel = e.coordinateQuality ? QUALITY_LABEL[e.coordinateQuality] ?? e.coordinateQuality : '—'
  const confPct = Math.round(e.confidence * 100)
  const escPct  = Math.round(e.escalation_potential * 100)

  return (
    <div
      className="fixed z-[200] pointer-events-none rounded-lg shadow-2xl border text-xs"
      style={{
        left: t.x + 14,
        top:  t.y - 10,
        background: '#0E1525',
        borderColor: '#1E2D4A',
        padding: '10px 12px',
        maxWidth: 260,
        minWidth: 180,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
          style={{ background: `${color}22`, color }}
        >
          {label}
        </span>
        <span className="text-[9px]" style={{ color: '#334155' }}>
          {qualLabel} · {e.locationType ?? '—'}
        </span>
      </div>

      {/* Title */}
      <p className="text-[11px] font-medium leading-snug mb-2" style={{ color: '#CBD5E1' }}>
        {e.title}
      </p>

      {/* Stats row */}
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

      {/* Supply / Hormuz flags */}
      {(e.is_supply_disruption || e.is_hormuz_related) && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {e.is_supply_disruption && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#450A0A', color: '#EF4444' }}>
              SUPPLY DISRUPTION
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

// ── Layer component ───────────────────────────────────────────────────────────

interface Props {
  visible: boolean
}

export default function OilEventMarkerLayer({ visible }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (!visible || HUB_EVENTS.length === 0) return null

  return (
    <>
      {HUB_EVENTS.map(e => {
        // Skip events without renderable coordinates
        if (e.lat === undefined || e.lng === undefined) return null
        const style = markerStyle(e.coordinateQuality, e.severity)
        if (!style) return null  // coordinateQuality === 'missing' or unknown

        const color = EVENT_COLOR[e.event_type] ?? '#475569'
        const { size, opacity, ring } = style

        return (
          <Marker
            key={e.event_id}
            latitude={e.lat}
            longitude={e.lng}
            anchor="center"
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: size + (ring ? 10 : 0), height: size + (ring ? 10 : 0) }}
              onMouseEnter={ev => setTooltip({ event: e, x: ev.clientX, y: ev.clientY })}
              onMouseMove={ev => setTooltip(t => t ? { ...t, x: ev.clientX, y: ev.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Outer ring for country_centroid */}
              {ring && (
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: 0,
                    border: `1.5px dashed ${color}`,
                    opacity: opacity * 0.7,
                  }}
                />
              )}
              {/* Core dot */}
              <div
                style={{
                  width:        size,
                  height:       size,
                  borderRadius: '50%',
                  background:   color,
                  opacity,
                  border:       `1.5px solid ${color}`,
                  boxShadow:    e.severity >= 4 ? `0 0 ${e.severity * 2}px ${color}44` : 'none',
                  cursor:       'pointer',
                  flexShrink:   0,
                }}
              />
            </div>
          </Marker>
        )
      })}

      {/* Tooltip — fixed position, outside canvas overflow context */}
      {tooltip && <EventTooltip t={tooltip} />}
    </>
  )
}
