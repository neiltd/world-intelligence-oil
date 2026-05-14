import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { OilPriceRecord, OilEventRecord, CrudeType } from '../../types/oil'
import { useMapStore } from '../../store/useMapStore'
import { EVENT_CONFIG } from '../../utils/oilEventConfig'
import rawData from '../../data/oil/live/oil_price.json'

// ─── Price data ───────────────────────────────────────────────────────────────

const priceRecords = rawData as OilPriceRecord[]

// Pivot flat price array → one row per date:
// [{ date, crude_type, price_usd }, ...] → [{ date: "2024-01", Brent: 78.01, ... }]
function buildChartData(data: OilPriceRecord[]) {
  const byDate = new Map<string, Record<string, number>>()
  for (const r of data) {
    if (!byDate.has(r.date)) byDate.set(r.date, {})
    byDate.get(r.date)![r.crude_type] = r.price_usd
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }))
}

// ─── Series config ────────────────────────────────────────────────────────────

const SERIES: { key: CrudeType; color: string; label: string }[] = [
  { key: 'Brent',  color: '#F59E0B', label: 'Brent' },
  { key: 'WTI',   color: '#3B82F6', label: 'WTI'   },
  { key: 'Dubai', color: '#34D399', label: 'Dubai'  },
]

// ─── Date formatters ──────────────────────────────────────────────────────────

// "2024-01" → "Jan '24"
function fmtMonthTick(d: string): string {
  const [year, month] = d.split('-')
  const m = new Date(Number(year), Number(month) - 1).toLocaleString('en', { month: 'short' })
  return `${m} '${year.slice(2)}`
}

// "2024-06-02" → "Jun 2, 2024"  (for marker tooltip)
function fmtFullDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Price series tooltip (unchanged from original) ───────────────────────────

function PriceTooltip({ active, payload, label }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{ background: '#0E1525', borderColor: '#1E2D4A' }}>
      <p className="font-semibold text-white mb-1.5">{label ? fmtMonthTick(label) : ''}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: '#94A3B8' }}>{p.dataKey}</span>
          </span>
          <span className="font-mono font-semibold text-white">${Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Event marker SVG — rendered inside ReferenceLine label ───────────────────
// The chart is monthly (YYYY-MM). Events carry full dates (YYYY-MM-DD).
// A marker group may contain multiple events that fall in the same month.
// Marker is highlighted when any event in the group is the activeEventId.

interface MarkerProps {
  // Injected by Recharts via the label prop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewBox?: any
  events: OilEventRecord[]
  activeEventId: string | null
  onHover: (events: OilEventRecord[], clientX: number, clientY: number) => void
  onLeave: () => void
  onActivate: (id: string | null) => void
}

function EventMarker({ viewBox, events, activeEventId, onHover, onLeave, onActivate }: MarkerProps) {
  if (!viewBox) return <g />
  const { x, y } = viewBox as { x: number; y: number }

  const hasActive   = events.some(e => e.event_id === activeEventId)
  const primaryCfg  = EVENT_CONFIG[events[0].event_type]
  const dotColor    = hasActive ? (primaryCfg?.color ?? '#F59E0B') : '#1E3A5F'
  const r           = events.length > 1 ? 7 : 5
  const nextId      = hasActive ? null : events[0].event_id

  return (
    <g>
      {/* Outer ring when active */}
      {hasActive && (
        <circle
          cx={x} cy={y + 6} r={r + 3}
          fill="none"
          stroke={primaryCfg?.color ?? '#F59E0B'}
          strokeWidth={1}
          strokeOpacity={0.35}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <circle
        cx={x} cy={y + 6} r={r}
        fill={dotColor}
        fillOpacity={hasActive ? 0.95 : 0.55}
        stroke={hasActive ? (primaryCfg?.color ?? '#F59E0B') : '#2D4A6B'}
        strokeWidth={hasActive ? 1.5 : 1}
        style={{ cursor: 'pointer' }}
        onMouseEnter={e => onHover(events, e.clientX, e.clientY)}
        onMouseLeave={onLeave}
        onClick={() => onActivate(nextId)}
      />
      {/* Count badge for months with multiple events */}
      {events.length > 1 && (
        <text
          x={x} y={y + 10}
          textAnchor="middle"
          fontSize={8}
          fontWeight="600"
          fill="#fff"
          style={{ pointerEvents: 'none' }}
        >
          {events.length}
        </text>
      )}
    </g>
  )
}

// ─── Marker hover tooltip (HTML, position:fixed) ──────────────────────────────

interface MarkerTooltipState {
  events: OilEventRecord[]
  x: number
  y: number
}

function MarkerTooltipPanel({ tooltip }: { tooltip: MarkerTooltipState }) {
  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg shadow-xl border text-xs"
      style={{
        left: tooltip.x + 14,
        top: tooltip.y - 10,
        background: '#0E1525',
        borderColor: '#1E2D4A',
        padding: '8px 10px',
        minWidth: 170,
        maxWidth: 240,
      }}
    >
      {tooltip.events.map(e => {
        const cfg = EVENT_CONFIG[e.event_type]
        return (
          <div key={e.event_id} className="flex flex-col gap-0.5 mb-2 last:mb-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg?.color }} />
              <span className="text-[9px] uppercase tracking-wide font-medium" style={{ color: cfg?.color }}>
                {cfg?.label}
              </span>
              <span className="text-[9px] ml-auto tabular-nums font-mono" style={{ color: '#475569' }}>
                {fmtFullDate(e.date)}
              </span>
            </div>
            <p className="text-[10px] font-medium leading-snug pl-3.5" style={{ color: '#CBD5E1' }}>
              {e.title}
            </p>
            {e.country && (
              <p className="text-[9px] pl-3.5" style={{ color: '#334155' }}>{e.country}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── OilPriceChart ────────────────────────────────────────────────────────────

interface OilPriceChartProps {
  // Visible events (already filtered by parent) — drives reference line rendering.
  // The chart stays decoupled from filtering logic; it only renders what it receives.
  events: OilEventRecord[]
}

export default function OilPriceChart({ events }: OilPriceChartProps) {
  const { activeEventId, setActiveEventId } = useMapStore()

  const [activeSeries, setActiveSeries] = useState<Record<CrudeType, boolean>>({
    Brent: true, WTI: true, Dubai: true,
  })
  const [markerTooltip, setMarkerTooltip] = useState<MarkerTooltipState | null>(null)

  const chartData = useMemo(() => buildChartData(priceRecords), [])

  // Group events by month (YYYY-MM) — chart x-axis is monthly.
  // Multiple events in the same month share one marker with a count badge.
  const eventsByMonth = useMemo(() => {
    const map = new Map<string, OilEventRecord[]>()
    for (const e of events) {
      const month = e.date.slice(0, 7) // "2024-06-02" → "2024-06"
      if (!map.has(month)) map.set(month, [])
      map.get(month)!.push(e)
    }
    return map
  }, [events])

  // Which month is the active event in? Used to highlight the correct reference line.
  const activeMonth = useMemo(() => {
    if (!activeEventId) return null
    const activeEvent = events.find(e => e.event_id === activeEventId)
    return activeEvent?.date.slice(0, 7) ?? null
  }, [activeEventId, events])

  function toggleSeries(key: CrudeType) {
    const wouldAllBeOff = SERIES.filter(s => s.key !== key).every(s => !activeSeries[s.key])
    if (wouldAllBeOff) return
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-2"
      style={{ background: '#0A0F1E', borderTop: '1px solid #1E2D4A' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <span className="text-[11px] font-semibold text-white">Crude Oil Spot Price</span>
          <span className="text-[10px] ml-2" style={{ color: '#334155' }}>USD / barrel · monthly</span>
        </div>
        <div className="flex items-center gap-1">
          {SERIES.map(({ key, color, label }) => (
            <button
              key={key}
              onClick={() => toggleSeries(key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-opacity"
              style={{
                background: activeSeries[key] ? `${color}22` : '#0E1525',
                border: `1px solid ${activeSeries[key] ? color : '#1E2D4A'}`,
                color: activeSeries[key] ? color : '#475569',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: activeSeries[key] ? color : '#475569' }} />
              {label}
            </button>
          ))}
          <span className="ml-2 text-[9px]" style={{ color: '#1E3A5F' }}>
            EIA · World Bank · Sample
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtMonthTick}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              width={38}
            />
            <Tooltip content={<PriceTooltip />} cursor={{ stroke: '#1E2D4A', strokeWidth: 1 }} />

            {/* Price series lines */}
            {SERIES.map(({ key, color }) =>
              activeSeries[key] ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                />
              ) : null
            )}

            {/* Event reference lines — one per unique month in the visible event set */}
            {[...eventsByMonth.entries()].map(([month, monthEvents]) => {
              const isActiveMonth = month === activeMonth
              const primaryColor = EVENT_CONFIG[monthEvents[0].event_type]?.color ?? '#475569'

              return (
                <ReferenceLine
                  key={month}
                  x={month}
                  stroke={isActiveMonth ? primaryColor : '#1E3A5F'}
                  strokeWidth={isActiveMonth ? 1.5 : 1}
                  strokeDasharray={isActiveMonth ? undefined : '4 4'}
                  strokeOpacity={isActiveMonth ? 0.75 : 0.4}
                  label={(props: { viewBox?: { x: number; y: number } }) => (
                    <EventMarker
                      viewBox={props.viewBox}
                      events={monthEvents}
                      activeEventId={activeEventId}
                      onHover={(evs, cx, cy) => setMarkerTooltip({ events: evs, x: cx, y: cy })}
                      onLeave={() => setMarkerTooltip(null)}
                      onActivate={setActiveEventId}
                    />
                  )}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Marker hover tooltip — rendered outside SVG as fixed HTML */}
      {markerTooltip && <MarkerTooltipPanel tooltip={markerTooltip} />}
    </div>
  )
}
