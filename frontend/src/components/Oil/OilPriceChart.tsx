import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { OilPriceRecord, CrudeType } from '../../types/oil'
import rawData from '../../data/oil/oil_price_sample.json'

// ─── Data prep ────────────────────────────────────────────────────────────────

const records = rawData as OilPriceRecord[]

// Pivot: one row per date with each crude type as a key
// { date: "2024-01", Brent: 78.01, WTI: 73.67, Dubai: 76.92 }
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

// ─── Config ───────────────────────────────────────────────────────────────────

const SERIES: { key: CrudeType; color: string; label: string }[] = [
  { key: 'Brent',  color: '#F59E0B', label: 'Brent' },
  { key: 'WTI',   color: '#3B82F6', label: 'WTI'   },
  { key: 'Dubai', color: '#34D399', label: 'Dubai'  },
]

// Format "2024-01" → "Jan '24"
function fmtDate(d: string): string {
  const [year, month] = d.split('-')
  const m = new Date(Number(year), Number(month) - 1).toLocaleString('en', { month: 'short' })
  return `${m} '${year.slice(2)}`
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{ background: '#0E1525', borderColor: '#1E2D4A' }}>
      <p className="font-semibold text-white mb-1.5">{label ? fmtDate(label) : ''}</p>
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function OilPriceChart() {
  const [active, setActive] = useState<Record<CrudeType, boolean>>({
    Brent: true,
    WTI:   true,
    Dubai: true,
  })

  const chartData = useMemo(() => buildChartData(records), [])

  function toggle(key: CrudeType) {
    // Keep at least one series visible
    const nextActive = SERIES.filter(s => s.key !== key).some(s => active[s.key])
    if (!nextActive) return
    setActive(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-2"
      style={{ background: '#0A0F1E', borderTop: '1px solid #1E2D4A' }}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <span className="text-[11px] font-semibold text-white">Crude Oil Spot Price</span>
          <span className="text-[10px] ml-2" style={{ color: '#334155' }}>USD / barrel · monthly</span>
        </div>

        {/* Crude type toggles */}
        <div className="flex items-center gap-1">
          {SERIES.map(({ key, color, label }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-opacity"
              style={{
                background: active[key] ? `${color}22` : '#0E1525',
                border: `1px solid ${active[key] ? color : '#1E2D4A'}`,
                color: active[key] ? color : '#475569',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active[key] ? color : '#475569' }} />
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
          <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1E2D4A', strokeWidth: 1 }} />
            {SERIES.map(({ key, color }) =>
              active[key] ? (
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
