import { useState } from 'react'
import Fuse from 'fuse.js'
import { useMapStore } from '../../store/useMapStore'
import type { Country } from '../../types/country'
import type { OilCountrySupplyRecord } from '../../types/oil'
import countryIndex from '../../data/country-index.json'
import supplyRaw from '../../data/oil/oil_country_supply_sample.json'

// ─── Oil supply lookup (ISO3 → record) ───────────────────────────────────────

const supply = supplyRaw as OilCountrySupplyRecord[]
const supplyByISO3 = new Map(supply.map(r => [r.iso3, r]))

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  section: 'text-[10px] uppercase tracking-widest font-semibold',
  body:    'text-[12px] leading-[1.65] break-words',
}

// ─── Relationship display maps ─────────────────────────────────────────────────

const REL_BORDER: Record<string, string> = {
  ally: '#059669', treaty_ally: '#059669',
  strategic_partner: '#2563EB', trade_partner: '#0EA5E9',
  neutral: '#475569', contested: '#D97706',
  rival: '#EA580C', enemy: '#DC2626',
}
const REL_BADGE: Record<string, string> = {
  ally: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  treaty_ally: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  strategic_partner: 'bg-blue-900/60 text-blue-300 border-blue-700',
  trade_partner: 'bg-sky-900/60 text-sky-300 border-sky-700',
  neutral: 'bg-slate-800 text-slate-400 border-slate-600',
  contested: 'bg-amber-900/60 text-amber-300 border-amber-700',
  rival: 'bg-orange-900/60 text-orange-300 border-orange-700',
  enemy: 'bg-red-900/60 text-red-300 border-red-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flag(iso2: string) {
  return iso2.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))).join('')
}
function pop(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return n.toLocaleString()
}

// Format a nullable number with unit. Returns [display, isNull].
function fmtOil(value: number | null | undefined, unit: string): { display: string; isNull: boolean } {
  if (value === null || value === undefined) return { display: '—', isNull: true }
  return { display: `${value.toLocaleString()} ${unit}`, isNull: false }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Sec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`${T.section} mb-2.5`} style={{ color: '#475569' }}>{label}</p>
      {children}
    </div>
  )
}

// ─── Stat card — used for reserves and production ─────────────────────────────

function StatCard({
  label, value, unit, isNull, accent,
}: {
  label: string
  value: number | null
  unit: string
  isNull: boolean
  accent?: boolean
}) {
  const fmt = fmtOil(value, unit)
  return (
    <div className="p-3 flex flex-col gap-1 rounded-lg"
      style={{ background: '#0D1829', border: `1px solid ${accent && !isNull ? '#78350F' : '#1E2D4A'}` }}>
      <span className={T.section} style={{ color: '#475569' }}>{label}</span>
      <span
        className="text-[15px] font-bold leading-none font-mono break-words"
        style={{ color: isNull ? '#334155' : '#F59E0B' }}
      >
        {fmt.display}
      </span>
      {isNull && (
        <span className="text-[10px]" style={{ color: '#1E3A5F' }}>No data</span>
      )}
    </div>
  )
}

// ─── Detail row — label + value pair ─────────────────────────────────────────

function DetailRow({
  label, value, unit, note,
}: {
  label: string
  value: number | null
  unit: string
  note?: string
}) {
  const { display, isNull } = fmtOil(value, unit)
  return (
    <div className="flex items-start justify-between gap-3 py-2"
      style={{ borderBottom: '1px solid #0D1829' }}>
      <span className="text-[11px]" style={{ color: '#475569' }}>{label}</span>
      <div className="text-right flex-shrink-0">
        <span className="text-[12px] font-mono" style={{ color: isNull ? '#334155' : '#CBD5E1' }}>
          {display}
        </span>
        {note && (
          <p className="text-[10px] mt-0.5" style={{ color: '#1E3A5F' }}>{note}</p>
        )}
      </div>
    </div>
  )
}

// ─── CompareSearch ────────────────────────────────────────────────────────────

interface Entry { id: string; iso2: string; name: string; region: string }
const allEntries = countryIndex as Entry[]
const fuse = new Fuse(allEntries, { keys: ['name'], threshold: 0.3 })

function CompareSearch() {
  const { setCompare, compareData, clearCompare, compareLoading } = useMapStore()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Entry[]>([])

  if (compareData) {
    return (
      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg min-w-0"
        style={{ background: '#0D1829', border: '1px solid #1E2D4A' }}>
        <span className="flex-shrink-0 text-base">{flag(compareData.iso2)}</span>
        <span className="text-[12px] text-purple-300 flex-1 truncate min-w-0">{compareData.name}</span>
        <button onClick={clearCompare}
          className="flex-shrink-0 text-slate-500 hover:text-white text-lg leading-none">×</button>
      </div>
    )
  }

  return (
    <div className="relative mt-3">
      <input
        value={q}
        onChange={e => {
          setQ(e.target.value)
          setRes(e.target.value ? fuse.search(e.target.value).slice(0, 6).map(r => r.item) : [])
        }}
        placeholder="Compare with another country…"
        className="w-full text-[12px] px-3 py-2 rounded-lg outline-none"
        style={{ background: '#0D1829', border: '1px solid #1E2D4A', color: '#CBD5E1' }}
      />
      {compareLoading && <p className="text-[11px] text-slate-500 mt-1">Loading…</p>}
      {res.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-20 shadow-2xl"
          style={{ background: '#0A0F1E', border: '1px solid #1E2D4A' }}>
          {res.map(e => (
            <button key={e.id} onClick={() => { setCompare(e.id); setQ(''); setRes([]) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#0D1829] text-left min-w-0">
              <span className="flex-shrink-0">{flag(e.iso2)}</span>
              <div className="min-w-0">
                <p className="text-[12px] truncate" style={{ color: '#E2E8F0' }}>{e.name}</p>
                <p className="text-[11px]" style={{ color: '#475569' }}>{e.region}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab definition ───────────────────────────────────────────────────────────

type Tab = 'overview' | 'oil' | 'relationships' | 'history'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',      label: 'Overview'   },
  { id: 'oil',          label: 'Oil'        },
  { id: 'relationships', label: 'Relations'  },
  { id: 'history',       label: 'History'    },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function CountryPanel() {
  const { countryData, loading, error, clearSelection } = useMapStore()
  const [tab, setTab] = useState<Tab>('overview')

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[12px]" style={{ color: '#475569' }}>Loading country data…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
      <span className="text-4xl">🗺️</span>
      <p className="text-[12px] leading-relaxed" style={{ color: '#475569' }}>{error}</p>
      <button onClick={clearSelection}
        className="text-[11px] text-blue-400 hover:text-blue-300 underline">
        Back to map
      </button>
    </div>
  )

  if (!countryData) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <span className="text-5xl">🛢️</span>
      <div>
        <p className="text-[13px] font-medium mb-1.5" style={{ color: '#94A3B8' }}>Click any country</p>
        <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
          Explore oil reserves, production, geopolitical<br />context, and energy relationships by country.
        </p>
      </div>
    </div>
  )

  const c: Country = countryData

  // Oil supply record for this country — null if not in sample dataset
  const oil: OilCountrySupplyRecord | undefined = supplyByISO3.get(c.id)

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: '#0A0F1E' }}>

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #1E2D4A' }}>
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{flag(c.iso2)}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-white leading-tight break-words">{c.name}</h2>
            <p className="text-[11px] mt-1 break-words" style={{ color: '#475569' }}>
              {c.subregion} · {c.capital}
            </p>
          </div>
          <button onClick={clearSelection}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-lg leading-none transition-colors hover:bg-[#1E2D4A]"
            style={{ color: '#475569' }}>
            ×
          </button>
        </div>
        <CompareSearch />
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex overflow-x-auto"
        style={{ borderBottom: '1px solid #1E2D4A', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.id
                ? t.id === 'oil'
                  ? 'border-amber-500'
                  : 'text-blue-400 border-blue-500'
                : 'border-transparent hover:text-slate-300'
            }`}
            style={{
              color: tab === t.id
                ? t.id === 'oil' ? '#F59E0B' : '#60A5FA'
                : '#475569',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 flex flex-col gap-5">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && <>
          <p className={T.body} style={{ color: '#CBD5E1' }}>{c.summary}</p>

          <Sec label="Demographics">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {[
                ['Population', pop(c.demographics.population)],
                ['Median Age', `${c.demographics.medianAge} yrs`],
                ['Urban',      `${c.demographics.urbanizationRate}%`],
                ['Alliances',  `${c.alliances.length}`],
              ].map(([lbl, val]) => (
                <div key={lbl} className="p-3 flex flex-col gap-1.5 rounded-lg"
                  style={{ background: '#0D1829', border: '1px solid #1E2D4A' }}>
                  <span className={T.section} style={{ color: '#475569' }}>{lbl}</span>
                  <span className="text-[14px] font-bold text-white leading-none break-words">{val}</span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec label="Alliances & Memberships">
            <div className="flex flex-wrap gap-1.5">
              {c.alliances.map(a => (
                <span key={a} className="text-[11px] px-2.5 py-1 rounded-full break-words"
                  style={{ background: '#0D1829', border: '1px solid #1E2D4A', color: '#94A3B8' }}>
                  {a}
                </span>
              ))}
            </div>
          </Sec>
        </>}

        {/* ── OIL ── */}
        {tab === 'oil' && (
          oil ? <>

            {/* Primary supply stats */}
            <Sec label="Supply">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <StatCard
                  label="Proven Reserves"
                  value={oil.reserves}
                  unit="Bbbl"
                  isNull={oil.reserves === null}
                  accent
                />
                <StatCard
                  label="Production"
                  value={oil.production}
                  unit="kb/d"
                  isNull={oil.production === null}
                  accent
                />
              </div>
            </Sec>

            {/* Trade — out of scope for v1 */}
            <Sec label="Trade">
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1E2D4A' }}>
                <DetailRow
                  label="Exports"
                  value={oil.exports}
                  unit="kb/d"
                  note="Out of scope for v1"
                />
                <DetailRow
                  label="Imports"
                  value={oil.imports}
                  unit="kb/d"
                  note="Out of scope for v1"
                />
              </div>
            </Sec>

            {/* Membership */}
            <Sec label="Membership">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] px-3 py-1 rounded-full font-medium"
                  style={{
                    background: oil.opec_member ? '#064E3B' : '#1E293B',
                    color: oil.opec_member ? '#34D399' : '#64748B',
                    border: `1px solid ${oil.opec_member ? '#065F46' : '#1E2D4A'}`,
                  }}
                >
                  {oil.opec_member ? 'OPEC Member' : 'Non-OPEC'}
                </span>
                {!oil.opec_member && (
                  <span className="text-[10px]" style={{ color: '#334155' }}>
                    Independent producer
                  </span>
                )}
              </div>
            </Sec>

            {/* Source & data quality */}
            <Sec label="Source">
              <div className="rounded-lg p-3 flex flex-col gap-2"
                style={{ background: '#0D1829', border: '1px solid #1E2D4A' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: '#475569' }}>
                    {oil.source} · {oil.year}
                  </span>
                  {oil.source_url && (
                    <a
                      href={oil.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] hover:text-blue-300 transition-colors"
                      style={{ color: '#1D4ED8' }}
                    >
                      View source ↗
                    </a>
                  )}
                </div>
                {oil.data_year_note && (
                  <p className="text-[11px] leading-[1.5]" style={{ color: '#475569' }}>
                    ⚠ {oil.data_year_note}
                  </p>
                )}
                <p className="text-[10px]" style={{ color: '#1E3A5F' }}>
                  Sample data · Replace with live EIA ingestion
                </p>
              </div>
            </Sec>

          </> : (

            // No oil record for this country in current dataset
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <span className="text-3xl">🛢️</span>
              <div>
                <p className="text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
                  No oil data for {c.name}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: '#334155' }}>
                  This country is not yet in the oil supply dataset.<br />
                  Gemini will expand coverage in a future update.
                </p>
              </div>
            </div>

          )
        )}

        {/* ── RELATIONSHIPS ── */}
        {tab === 'relationships' && <>
          <p className="text-[11px]" style={{ color: '#475569' }}>
            {c.relationships?.length ?? 0} key bilateral relationships
          </p>
          {(c.relationships ?? []).map((r, i) => (
            <div key={i} className="p-3 rounded-lg"
              style={{
                background: '#0D1829',
                border: '1px solid #1E2D4A',
                borderLeft: `3px solid ${REL_BORDER[r.type] ?? '#475569'}`,
              }}>
              <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
                <span className="text-[13px] font-semibold text-white break-words min-w-0 flex-1 leading-snug pl-2">
                  {r.countryName}
                </span>
                <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${REL_BADGE[r.type] ?? REL_BADGE.neutral}`}>
                  {r.type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className={`${T.body} pl-2`} style={{ color: '#94A3B8' }}>{r.summary}</p>
            </div>
          ))}
        </>}

        {/* ── HISTORY ── */}
        {tab === 'history' && <>
          <p className={T.body} style={{ color: '#CBD5E1' }}>{c.historicalContext?.summary}</p>
          <Sec label="Key Events">
            <div className="relative flex flex-col gap-3.5">
              <div className="absolute top-1 bottom-1 w-px"
                style={{ left: '3.25rem', background: '#1E2D4A' }} />
              {(c.historicalContext?.keyEvents ?? []).map((e, i) => (
                <div key={i} className="flex items-start gap-3 min-w-0">
                  <span className="flex-shrink-0 w-11 text-right text-[11px] pt-0.5 tabular-nums font-mono"
                    style={{ color: '#60A5FA' }}>
                    {e.year}
                  </span>
                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1 relative z-10"
                    style={{ background: '#0A0F1E', border: '2px solid #3B82F6' }} />
                  <p className={`${T.body} min-w-0 flex-1`} style={{ color: '#CBD5E1' }}>{e.event}</p>
                </div>
              ))}
            </div>
          </Sec>
        </>}

      </div>
    </div>
  )
}
