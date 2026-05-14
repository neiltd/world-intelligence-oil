import { useState } from 'react'
import { useOilIntelligence } from '../../hooks/useOilIntelligence'
import type { OilIntelEvent, CommoditySignal, HormuzRiskLevel } from '../../types/intelligence'

// ── Theme constants (matches oil project dark palette) ────────────────────────

const BG      = '#0A0F1E'
const BORDER  = '#1E2D4A'
const BG2     = '#0D1525'
const BG3     = '#111827'

// ── Hormuz risk ───────────────────────────────────────────────────────────────

const RISK_STYLES: Record<HormuzRiskLevel, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: '#EF4444', bg: '#450A0A', border: '#7F1D1D', label: '⚠ Critical' },
  high:     { color: '#F97316', bg: '#431407', border: '#7C2D12', label: '▲ High'     },
  elevated: { color: '#EAB308', bg: '#422006', border: '#78350F', label: '↑ Elevated' },
  low:      { color: '#22C55E', bg: '#052E16', border: '#14532D', label: '● Low'      },
}

function HormuzCard({ risk }: { risk: import('../../types/intelligence').HormuzRisk }) {
  const s = RISK_STYLES[risk.riskLevel]
  const escPct = Math.round(risk.maxEscalation * 100)
  return (
    <div className="rounded-lg p-3 mb-3 border" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: s.color }}>Strait of Hormuz</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>Escalation</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2D4A' }}>
          <div className="h-full rounded-full" style={{ width: `${escPct}%`, background: s.color }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color: s.color }}>{escPct}%</span>
      </div>
      <p className="text-[10px]" style={{ color: '#475569' }}>
        {risk.eventIds.length} contributing event{risk.eventIds.length !== 1 ? 's' : ''}
        {!risk.active && ' — passage currently unobstructed'}
      </p>
    </div>
  )
}

// ── Commodity signals ─────────────────────────────────────────────────────────

const COMMODITY_ICONS: Record<string, string> = { oil: '🛢️', gas: '⛽', gold: '🪙', fertilizer: '🌾' }
const DIR_COLORS: Record<string, string> = {
  up: '#22C55E', down: '#EF4444', neutral: '#94A3B8', uncertain: '#EAB308',
}
const DIR_ARROWS: Record<string, string> = { up: '↑', down: '↓', neutral: '→', uncertain: '~' }

function CommodityRow({ sig }: { sig: CommoditySignal }) {
  const color = DIR_COLORS[sig.signalDirection] ?? '#94A3B8'
  const arrow = DIR_ARROWS[sig.signalDirection] ?? '~'
  const icon  = COMMODITY_ICONS[sig.commodity] ?? '📦'
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded" style={{ background: BG2 }}>
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium capitalize flex-1" style={{ color: '#CBD5E1' }}>{sig.commodity}</span>
      <span className="text-xs font-bold" style={{ color }}>{arrow} {sig.signalDirection}</span>
      <span className="text-[10px]" style={{ color: '#475569' }}>
        {Math.round(sig.intensity * 100)}% · {sig.eventCount}ev
      </span>
    </div>
  )
}

// ── Event rows ────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<number, string> = { 5:'#EF4444', 4:'#F97316', 3:'#EAB308', 2:'#94A3B8', 1:'#64748B' }

function EventRow({ e }: { e: OilIntelEvent }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="mb-1.5 rounded-lg border cursor-pointer transition-colors"
      style={{ background: BG3, borderColor: open ? '#334155' : BORDER }}
      onClick={() => setOpen(x => !x)}
    >
      <div className="flex items-start gap-2 p-2.5">
        <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: SEV_COLOR[e.severity] ?? '#94A3B8' }}>
          {e.severity}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-snug" style={{ color: '#CBD5E1' }}>{e.title}</p>
          <div className="flex items-center gap-2 mt-0.5" style={{ color: '#475569' }}>
            <span className="text-[10px]">{e.countries.slice(0,3).join(' · ')}</span>
            {e.isHormuzRelated && (
              <span className="text-[9px] px-1 rounded" style={{ background: '#450A0A', color: '#EF4444' }}>HORMUZ</span>
            )}
            {e.isSupplyDisruption && (
              <span className="text-[9px] px-1 rounded" style={{ background: '#422006', color: '#F97316' }}>SUPPLY</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[10px] font-mono" style={{ color: '#EAB308' }}>
            esc {Math.round(e.escalationPotential * 100)}%
          </div>
          <div className="text-[10px]" style={{ color: '#334155' }}>
            conf {Math.round(e.confidence * 100)}%
          </div>
        </div>
      </div>
      {open && (
        <div className="px-2.5 pb-2.5 pt-0 border-t" style={{ borderColor: BORDER }}>
          <p className="text-[11px] leading-relaxed mb-2 mt-2" style={{ color: '#94A3B8' }}>{e.summary}</p>
          <div className="flex flex-wrap gap-1 mb-1">
            {e.sourceIds.map(s => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#0D1525', color: '#475569' }}>{s}</span>
            ))}
          </div>
          <div className="flex gap-3 text-[9px]" style={{ color: '#334155' }}>
            <span className="font-mono">{e.eventId.slice(0,12)}…</span>
            {e.storylineId && <span className="font-mono">story:{e.storylineId.slice(0,8)}…</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

type Tab = 'hormuz' | 'events' | 'commodities'

interface Props { onClose: () => void }

export default function OilIntelligencePanel({ onClose }: Props) {
  const { data, loading, error, refresh, age } = useOilIntelligence()
  const [tab, setTab] = useState<Tab>('hormuz')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#475569' }}>
        <div className="text-center">
          <div className="animate-spin w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs">Loading intelligence…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center" style={{ color: '#475569' }}>
        <div className="text-3xl mb-3">📡</div>
        <p className="text-sm mb-1" style={{ color: '#94A3B8' }}>Intelligence unavailable</p>
        <p className="text-xs mb-3">{error ?? 'No export data'}</p>
        <p className="text-xs mb-4">Run <code className="px-1 rounded" style={{ background: BG2 }}>npm run export</code> in Data Hub</p>
        <button onClick={refresh} className="text-xs underline" style={{ color: '#F59E0B' }}>Retry</button>
      </div>
    )
  }

  const hormuzEvents = data.energyEvents.filter(e => e.isHormuzRelated)
  const supplyEvents = data.energyEvents.filter(e => e.isSupplyDisruption)
  const sorted = [...data.energyEvents].sort((a, b) =>
    b.escalationPotential - a.escalationPotential || b.severity - a.severity,
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: 'hormuz',      label: `Hormuz` },
    { id: 'events',      label: `Events (${data.eventCount})` },
    { id: 'commodities', label: `Commodities` },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Oil Intelligence</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: BG2, color: '#475569', border: `1px solid ${BORDER}` }}>
                v{data.schemaVersion}
              </span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: '#334155' }}>
              {data.date} · {age} · {data.extractionVersion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="text-sm transition-colors" style={{ color: '#334155' }} title="Refresh">↻</button>
            <button onClick={onClose} className="text-xl leading-none" style={{ color: '#334155' }}>×</button>
          </div>
        </div>

        {/* Five monitoring labels */}
        <div className="grid grid-cols-5 gap-1">
          {[
            { label: 'Verified',    value: data.eventCount,           color: '#22C55E' },
            { label: 'Exc. review', value: data.reviewExcludedCount,
              color: data.reviewExcludedCount > 0 ? '#EAB308' : '#475569' },
            { label: 'Outlets',     value: data.uniqueSourceCount,    color: '#60A5FA' },
            { label: 'Hormuz',      value: hormuzEvents.length,
              color: data.hormuzRisk.riskLevel === 'critical' ? '#EF4444'
                   : data.hormuzRisk.riskLevel === 'high' ? '#F97316' : '#22C55E' },
            { label: 'Supply',      value: supplyEvents.length,       color: '#F59E0B' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center rounded p-1" style={{ background: BG2 }}>
              <p className="text-xs font-bold" style={{ color }}>{value}</p>
              <p className="text-[9px] leading-tight" style={{ color: '#334155' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: BORDER }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-[11px] font-medium transition-colors"
            style={{
              color: tab === t.id ? '#F59E0B' : '#475569',
              borderBottom: tab === t.id ? '2px solid #F59E0B' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">

        {tab === 'hormuz' && (
          <div>
            <HormuzCard risk={data.hormuzRisk} />
            <p className="text-[10px] mb-2 font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>
              Hormuz-related events ({hormuzEvents.length})
            </p>
            {hormuzEvents.length === 0
              ? <p className="text-xs text-center mt-4" style={{ color: '#334155' }}>No Hormuz events in current data</p>
              : hormuzEvents.sort((a, b) => b.escalationPotential - a.escalationPotential)
                           .map(e => <EventRow key={e.eventId} e={e} />)
            }
          </div>
        )}

        {tab === 'events' && (
          <div>
            <p className="text-[10px] mb-2" style={{ color: '#334155' }}>
              {data.eventCount} verified · sorted by escalation · click to expand
            </p>
            {sorted.map(e => <EventRow key={e.eventId} e={e} />)}
          </div>
        )}

        {tab === 'commodities' && (
          <div>
            <p className="text-[10px] mb-2" style={{ color: '#334155' }}>Signal direction inferred from event content</p>
            {data.commoditySignals.length === 0
              ? <p className="text-xs text-center mt-4" style={{ color: '#334155' }}>No commodity signals</p>
              : <div className="space-y-1">
                  {data.commoditySignals.map(s => <CommodityRow key={s.commodity} sig={s} />)}
                </div>
            }
            <div className="mt-4 p-3 rounded-lg border" style={{ background: BG2, borderColor: BORDER }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: '#94A3B8' }}>Monitoring note</p>
              <p className="text-[10px] leading-relaxed" style={{ color: '#475569' }}>
                These signals are for monitoring and analysis only. They are derived from
                news intelligence and are not automated trading recommendations.
                {data.reviewExcludedCount > 0 && ` ${data.reviewExcludedCount} event(s) excluded pending human review.`}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
