# Frontend Architecture — Oil Intelligence

---

## Ecosystem Overview

This project is one of three in the World Intelligence platform:

```
┌─────────────────────────────────────────────────────────────────────┐
│               world-intelligence-data-hub                           │
│                                                                     │
│  EIA ──┐                                                            │
│  ACLED ─┤─► ingestion ──► normalization ──► geocoding ──► exports  │
│  GDELT ─┤    (Python)      (Pydantic)       (ACLED/GDELT)          │
│  OFAC ──┤                                                           │
│  OPEC ──┘  Owns: credentials, API quotas, deduplication, caching   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  writes JSON to
                               ▼
                    data/imports/*.json
                               │
          ┌────────────────────┴────────────────────┐
          ▼                                         ▼
┌──────────────────────┐               ┌──────────────────────┐
│ world-intelligence-  │               │ world-intelligence-  │
│        oil           │               │        map           │
│                      │               │                      │
│ Read-only consumer   │               │ Read-only consumer   │
│ Oil/commodity UX     │               │ Geopolitical UX      │
│ No external APIs     │               │ No external APIs     │
└──────────────────────┘               └──────────────────────┘
```

**This project (world-intelligence-oil) is a read-only consumer.** It never calls EIA, ACLED, GDELT, OFAC, OPEC, IMFPortWatch, NewsAPI, or any external data source. All ingestion, credentials, normalization, geocoding, and deduplication live in world-intelligence-data-hub exclusively.

---

## Data Flow

```
Hub pipeline runs
  │
  ├── writes: data/imports/price-series.json
  ├── writes: data/imports/energy-indicators.json
  ├── writes: data/imports/oil-events.json          ← geocoordinated
  ├── writes: data/imports/shipping-disruptions.json
  ├── writes: data/imports/refinery-outages.json
  ├── writes: data/imports/geopolitical-supply-risk-events.json
  └── writes: data/imports/manifest.json            ← connection status

                    ↓ (Vite bundles these at build time)

frontend/src/data/imports/adapter.ts
  │
  ├── getPrices()                → OilPriceChart
  ├── getSupply()                → OilMapLayer, CountryPanel
  ├── getOilEvents()             → OilEventTimeline, App.tsx
  ├── getShippingDisruptions()   → (future: ShippingLayer)
  ├── getRefineryOutages()       → (future: RefineryLayer)
  ├── getGeopoliticalSupplyRisk()→ (future: RiskLayer)
  └── getHubStatus()            → DataStatus badge
```

**Priority rule in adapter:** Hub file non-empty → use hub. Hub file empty → fall back to `src/data/oil/live/` (EIA local bootstrap, NOT production). Components never decide — the adapter handles it.

---

## Local Bootstrap vs Hub (Important Distinction)

| Source | Location | Who writes it | When used |
|--------|----------|---------------|-----------|
| Hub exports | `data/imports/*.json` | world-intelligence-data-hub | **Production** |
| Local EIA fallback | `src/data/oil/live/*.json` | `scripts/ingest.py` | Dev / pre-hub only |
| Sample data | `src/data/oil/*_sample.json` | Hand-crafted | Tests / initial dev |

`scripts/ingest.py` is marked **LOCAL FALLBACK ONLY**. It calls EIA directly, which violates the production architecture. It exists for bootstrapping before the hub is connected.

---

## Frontend Folder Structure

```
frontend/
├── public/
│   ├── countries-110m.json     # TopoJSON world geometry (runtime fetch)
│   ├── data/
│   │   └── intelligence.json   # Intelligence panel stub (hub replaces)
│   └── favicon.svg
│
└── src/
    ├── App.tsx                 # Root layout + event filtering + interaction wiring
    ├── main.tsx
    ├── index.css               # Dark theme, Tailwind
    │
    ├── components/
    │   ├── Map/
    │   │   ├── WorldMap.tsx         # MapLibre GL, choropleth, click/hover
    │   │   └── OilMapLayer.tsx      # Choropleth color fn + legend overlay
    │   ├── Oil/
    │   │   ├── OilPriceChart.tsx    # Recharts line chart + event markers
    │   │   └── OilEventTimeline.tsx # Chronological event list + filters
    │   ├── Panel/
    │   │   └── CountryPanel.tsx     # Country detail: Overview/Oil/Relations/History
    │   ├── Intelligence/
    │   │   └── OilIntelligencePanel.tsx # Hub intelligence: Hormuz risk, signals
    │   └── UI/
    │       ├── SearchBar.tsx        # Fuzzy country search
    │       └── DataStatus.tsx       # Hub connection badge
    │
    ├── hooks/
    │   └── useOilIntelligence.ts    # Fetches public/data/intelligence.json
    │
    ├── store/
    │   └── useMapStore.ts           # Zustand: selection, layers, filters, metric
    │
    ├── types/
    │   ├── country.ts          # Geopolitical country data (from world-map project)
    │   ├── oil.ts              # OilPriceRecord, OilCountrySupplyRecord, OilEventRecord,
    │   │                       #   GeoCoordinate, CoordinateQuality, LocationType
    │   └── hub.ts              # ShippingDisruption, RefineryOutage,
    │                           #   GeopoliticalSupplyRiskEvent
    │
    ├── layers/
    │   └── _core/types.ts      # LayerGroup, LayerMeta, LayerProps
    │
    ├── utils/
    │   ├── geoUtils.ts         # Antimeridian-safe GeoJSON utilities
    │   └── oilEventConfig.ts   # EVENT_CONFIG (event type → color/label)
    │
    └── data/
        ├── country-index.json  # Search index
        ├── countries/          # 43 oil-country geopolitical JSONs (lazy-loaded)
        ├── imports/            # Hub adapter + stub JSONs (hub writes here)
        │   ├── adapter.ts
        │   ├── manifest.json
        │   ├── price-series.json
        │   ├── energy-indicators.json
        │   ├── oil-events.json               ← geocoordinated events (primary)
        │   ├── shipping-disruptions.json
        │   ├── refinery-outages.json
        │   └── geopolitical-supply-risk-events.json
        └── oil/
            ├── DATA_CONTRACT.md
            ├── live/                         # Local EIA fallback (pre-hub)
            │   ├── oil_price.json
            │   ├── oil_country_supply.json
            │   └── data_status.json
            └── oil_events_sample.json        # Dev sample (no geo)
```

---

## Tech Stack

| Concern | Library | Version |
|---------|---------|---------|
| Framework | React | 19 |
| Language | TypeScript | ~6.0 |
| Build | Vite | 8 |
| Map | MapLibre GL via react-map-gl | 5.x / 8.x |
| Charts | Recharts | 3 |
| State | Zustand | 5 |
| Animation | Framer Motion | 12 |
| Styling | Tailwind CSS v4 | 4 |
| Search | Fuse.js | 7 |
| Geo parsing | topojson-client | 3 |

---

## Layer Architecture

The map choropleth uses a **color-injection pattern**: `WorldMap.tsx` fetches `countries-110m.json` once, injects a `color` property per feature, and renders a single MapLibre fill layer. `getOilChoroplethColor()` (exported from `OilMapLayer.tsx`) computes the color.

**Adding a new map layer (e.g. shipping disruptions):**
1. Create `components/Map/ShippingLayer.tsx` — exports `getShippingChoroplethColor()` + legend
2. Add `shipping: boolean` to `layerVisibility` initial state in `useMapStore`
3. In `WorldMap.tsx` `geoWithColors`, add branch for shipping layer
4. Render `<ShippingLayer />` when layer is active

**Adding a new infrastructure point layer (ports, refineries):**
- Use Recharts `<Marker>` components rendered inside `<Map>` — see v2 `AirportLayer.tsx` pattern
- Data comes via `adapter.getRefineryOutages()` — no API call needed

---

## Geocoordinate Architecture

Hub-enriched events carry `GeoCoordinate | null` on every record.

### Oil frontend responsibilities (approved by Hub PM)

```
✅ Render event markers at hub-provided coordinates
✅ Style markers by coordinateQuality
✅ Show tooltip: title, event_type, confidence, source
✅ Skip events where geo === null (omit from map, still show in timeline)
✅ Handle empty hub arrays gracefully (no crash, no spinner forever)

❌ Do NOT geocode
❌ Do NOT infer or fill in missing coordinates
❌ Do NOT modify coordinateQuality
❌ Do NOT enrich events client-side
❌ Do NOT build clustering, proximity logic, or route visualization yet
```

### Marker style rules (by coordinateQuality)

| coordinateQuality | Visual treatment |
|-------------------|-----------------|
| `"exact"` | Solid, precise dot — full opacity, sharp border |
| `"city"` | Solid dot — slightly reduced opacity (0.8) |
| `"country_centroid"` | Soft/glowing ring — low opacity, dashed border, signals imprecision |
| `"regional"` | Larger radius zone indicator — semi-transparent fill |
| `null` / missing | **Omit from map** — event still appears in OilEventTimeline |

### Tooltip content (when geo is present)

```
[event_type badge]  [coordinateQuality indicator]
Event title
Country · confidence%
Source: ACLED · source_count outlets
```

No client-side logic beyond reading hub-provided values. The hub decides where events are. The frontend renders what it receives.

### Implementation note

Event marker layer is **not yet built**. When built:
1. Read from `getOilEvents()` (adapter) — hub data only
2. Filter to `event.geo !== null`
3. Render one `<Marker>` per event using `geo.latitude` / `geo.longitude`
4. Style marker radius/opacity based on `geo.coordinate_quality`
5. Show tooltip on hover with above fields
6. Do not mutate or re-interpret hub coordinates

---

## Store Responsibilities

| Slice | Fields | Purpose |
|-------|--------|---------|
| Country selection | `selectedCountryId`, `countryData`, `loading`, `error` | Active country + panel |
| Compare | `compareCountryId`, `compareData` | Side-by-side context |
| Oil metric | `oilMetric` | Choropleth: `'reserves'` or `'production'` |
| Active event | `activeEventId` | Chart ↔ timeline synchronization |
| Event filters | `filterYear`, `filterEventType` | Timeline filter state |
| Layer visibility | `layerVisibility` | Toggle per-layer visibility |
| Intelligence | `showIntelligence` | Intelligence panel open/closed |

---

## Extensibility: Adding Future Commodities

When gas, gold, or rare earths land:
1. Hub delivers `gas-indicators.json`, `gold-indicators.json` etc.
2. Add types to `types/hub.ts`
3. Add getter to `adapter.ts`
4. Add tab to `CountryPanel.tsx` (or extract to `GasTab.tsx`)
5. Add new choropleth layer following `OilMapLayer.tsx` pattern
6. No API credentials needed — hub handles ingestion

---

## Design System

| Token | Hex | Used for |
|-------|-----|---------|
| Background deep | `#070B14` | App root |
| Background surface | `#0A0F1E` | Header, panels |
| Background card | `#0D1829` | Stat cards, inputs |
| Border | `#1E2D4A` | All borders |
| Text primary | `#FFFFFF` | Values, headings |
| Text secondary | `#CBD5E1` | Body text |
| Text muted | `#475569` | Labels, meta |
| Accent blue | `#2563EB` | Selected country |
| Accent amber | `#F59E0B` | Oil data, Brent series |
| Accent purple | `#8B5CF6` | Compare country |
| Null color | `#111827` | Countries with no data |
