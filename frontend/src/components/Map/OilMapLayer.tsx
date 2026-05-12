import type { OilCountrySupplyRecord, OilLayerMetric } from '../../types/oil'
import supplyRaw from '../../data/oil/oil_country_supply_sample.json'

// ─── Data lookup ──────────────────────────────────────────────────────────────

const supply = supplyRaw as OilCountrySupplyRecord[]
const supplyByISO3 = new Map(supply.map(r => [r.iso3, r]))

// ─── Color scales ─────────────────────────────────────────────────────────────
// Discrete steps — easier to read on a map than continuous gradients.
// Amber ramp for reserves (Bbbl), blue ramp for production (kb/d).

const NULL_COLOR = '#111827' // distinct from all step colors — no data in sample

const RESERVES_STEPS: { max: number; color: string; label: string }[] = [
  { max: 10,       color: '#78350F', label: '< 10 Bbbl'   },
  { max: 50,       color: '#92400E', label: '10–50 Bbbl'  },
  { max: 100,      color: '#B45309', label: '50–100 Bbbl' },
  { max: 200,      color: '#D97706', label: '100–200 Bbbl'},
  { max: Infinity, color: '#F59E0B', label: '> 200 Bbbl'  },
]

const PRODUCTION_STEPS: { max: number; color: string; label: string }[] = [
  { max: 500,      color: '#1E3A5F', label: '< 500 kb/d'     },
  { max: 2000,     color: '#1D4ED8', label: '500–2,000 kb/d' },
  { max: 5000,     color: '#2563EB', label: '2–5k kb/d'      },
  { max: 10000,    color: '#3B82F6', label: '5–10k kb/d'     },
  { max: Infinity, color: '#60A5FA', label: '> 10k kb/d'     },
]

function stepColor(
  value: number,
  steps: { max: number; color: string }[]
): string {
  for (const step of steps) {
    if (value <= step.max) return step.color
  }
  return steps[steps.length - 1].color
}

// ─── Public color function — called by WorldMap inside geoWithColors ───────────
// Returns the choropleth fill color for a given ISO3 and metric.
// Null data → NULL_COLOR (distinct, not the same as base map color).
// 0 reserves/production → first step color (not null — 0 is confirmed data).

export function getOilChoroplethColor(iso3: string, metric: OilLayerMetric): string {
  const record = supplyByISO3.get(iso3)
  if (!record) return NULL_COLOR

  if (metric === 'reserves') {
    if (record.reserves === null) return NULL_COLOR
    return stepColor(record.reserves, RESERVES_STEPS)
  }

  if (metric === 'production') {
    if (record.production === null) return NULL_COLOR
    return stepColor(record.production, PRODUCTION_STEPS)
  }

  return NULL_COLOR
}

// ─── Tooltip data — called by WorldMap when building tooltip content ───────────

export interface OilTooltipData {
  value: number | null
  unit: string
  label: string
}

export function getOilTooltipData(
  iso3: string,
  metric: OilLayerMetric
): OilTooltipData | null {
  const record = supplyByISO3.get(iso3)
  if (!record) return null

  if (metric === 'reserves') {
    return {
      value: record.reserves,
      unit: 'Bbbl',
      label: 'Reserves',
    }
  }
  if (metric === 'production') {
    return {
      value: record.production,
      unit: 'kb/d',
      label: 'Production',
    }
  }
  return null
}

// ─── Legend overlay — rendered as DOM element over the map ────────────────────
// Follows v2 pattern: positioned absolute inside the map container.
// WorldMap renders this when the oil layer is active.

interface OilMapLayerProps {
  metric: OilLayerMetric
}

export default function OilMapLayer({ metric }: OilMapLayerProps) {
  const steps = metric === 'reserves' ? RESERVES_STEPS : PRODUCTION_STEPS
  const title = metric === 'reserves' ? 'Oil Reserves' : 'Oil Production'

  return (
    <div
      className="absolute z-10 rounded-lg border text-xs"
      style={{
        bottom: 24,
        left: 12,
        background: '#0E1525CC',
        borderColor: '#1E2D4A',
        padding: '10px 12px',
        backdropFilter: 'blur(4px)',
        minWidth: 130,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-widest font-semibold mb-2"
        style={{ color: '#475569' }}
      >
        {title}
      </p>

      <div className="flex flex-col gap-1.5">
        {steps.map(step => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className="flex-shrink-0 rounded-sm"
              style={{ width: 10, height: 10, background: step.color }}
            />
            <span style={{ color: '#94A3B8' }}>{step.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-0.5">
          <div
            className="flex-shrink-0 rounded-sm"
            style={{ width: 10, height: 10, background: NULL_COLOR, border: '1px solid #1E2D4A' }}
          />
          <span style={{ color: '#475569' }}>No data</span>
        </div>
      </div>

      <p className="mt-2 text-[9px]" style={{ color: '#1E3A5F' }}>
        EIA · 2023 est. · Sample
      </p>
    </div>
  )
}
