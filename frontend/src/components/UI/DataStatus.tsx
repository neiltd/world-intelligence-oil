import { useState } from 'react'
import statusRaw from '../../data/oil/live/data_status.json'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceDataset {
  source: string
  series: string[]
  record_count: number
  date_range: readonly [string, string] | string[]
  frequency: string
  error_count: number
}

interface SupplyDataset {
  source: string
  metric: string
  record_count: number
  country_count: number
  year_range: readonly [number, number] | number[]
  reserves_available: boolean
  error_count: number
}

interface DataStatusShape {
  generated_at: string
  datasets: {
    price?:  PriceDataset
    supply?: SupplyDataset
  }
}

const status = statusRaw as DataStatusShape

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  // "2026-05-12T08:54:01Z" → "12 May 2026"
  const d = new Date(iso)
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────
// Renders a small "Live · EIA" badge in the header.
// Hover reveals a concise data status panel.

export default function DataStatus() {
  const [open, setOpen] = useState(false)
  const { price, supply } = status.datasets

  const updatedAt = fmtDate(status.generated_at)
  const priceRange = price ? `${price.date_range[0]} → ${price.date_range[1]}` : '—'
  const supplyRange = supply ? `${supply.year_range[0]} – ${supply.year_range[1]}` : '—'

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[9px] transition-colors"
        style={{ color: open ? '#94A3B8' : '#334155' }}
        title="Data status"
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: '#22C55E' }}
        />
        Live · EIA
      </button>

      {open && (
        <>
          {/* Click-away overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Status panel */}
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-lg border text-xs"
            style={{
              background: '#0A0F1E',
              borderColor: '#1E2D4A',
              padding: '12px 14px',
              minWidth: 240,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
              style={{ color: '#475569' }}>
              Data Status
            </p>

            {/* Price */}
            {price && (
              <div className="mb-3">
                <p className="font-semibold mb-1" style={{ color: '#CBD5E1' }}>
                  Crude Prices
                </p>
                <div className="flex flex-col gap-0.5" style={{ color: '#475569' }}>
                  <span>{price.series.join(' · ')} · {price.frequency}</span>
                  <span>{priceRange}</span>
                  <span>{price.record_count.toLocaleString()} records · {price.source}</span>
                </div>
              </div>
            )}

            {/* Supply */}
            {supply && (
              <div className="mb-3">
                <p className="font-semibold mb-1" style={{ color: '#CBD5E1' }}>
                  Country Supply
                </p>
                <div className="flex flex-col gap-0.5" style={{ color: '#475569' }}>
                  <span>{supply.country_count} countries · {supplyRange}</span>
                  <span>{supply.record_count.toLocaleString()} records · {supply.source}</span>
                  <span style={{ color: supply.reserves_available ? '#22C55E' : '#F59E0B' }}>
                    Reserves: {supply.reserves_available ? 'available' : 'pending (OWID / EI)'}
                  </span>
                </div>
              </div>
            )}

            {/* Events */}
            <div className="mb-3">
              <p className="font-semibold mb-1" style={{ color: '#CBD5E1' }}>Events</p>
              <p style={{ color: '#334155' }}>
                4 records · sample (OPEC, OFAC, EIA, IMF)
              </p>
            </div>

            <div style={{ borderTop: '1px solid #1E2D4A', paddingTop: 8, marginTop: 4 }}>
              <p className="text-[10px]" style={{ color: '#1E3A5F' }}>
                Ingested {updatedAt}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
