# Frontend Architecture — Oil Intelligence MVP

## Overview

The frontend is a single-page React application. There is no routing — the entire MVP fits on one view: a world map, a price chart, and a side panel. The application is intentionally scoped to oil for Phase 1 and structured to add future commodity modules (gas, gold, rare earths) without rewriting the core.

---

## Folder Structure

```
frontend/
├── public/
│   ├── countries-110m.json     # TopoJSON world geometry — loaded once at runtime
│   └── favicon.svg
├── src/
│   ├── App.tsx                 # Root layout: header, map row, chart row
│   ├── main.tsx                # React DOM entry point
│   ├── index.css               # Global styles, dark theme, Tailwind import
│   │
│   ├── components/
│   │   ├── Map/
│   │   │   ├── WorldMap.tsx        # MapLibre GL map, choropleth coloring, tooltips
│   │   │   └── OilMapLayer.tsx     # Oil choropleth logic + map legend overlay
│   │   ├── Oil/
│   │   │   └── OilPriceChart.tsx   # Recharts line chart for Brent / WTI / Dubai
│   │   ├── Panel/
│   │   │   └── CountryPanel.tsx    # Slide-in country detail panel with tabs
│   │   └── UI/
│   │       └── SearchBar.tsx       # Fuzzy country search (Fuse.js)
│   │
│   ├── store/
│   │   └── useMapStore.ts      # Global Zustand store — selection, layers, oil metric
│   │
│   ├── types/
│   │   ├── country.ts          # Country geopolitical data shape (from v2)
│   │   └── oil.ts              # Oil price, supply, and event record types
│   │
│   ├── layers/
│   │   └── _core/
│   │       └── types.ts        # LayerGroup, LayerMeta, LayerProps interfaces
│   │
│   ├── utils/
│   │   └── geoUtils.ts         # Antimeridian-safe GeoJSON geometry utilities
│   │
│   └── data/
│       ├── country-index.json  # Flat list of {id, iso2, name, region} for search
│       ├── countries/          # Per-country geopolitical JSON (15 oil countries)
│       │   ├── SAU.json
│       │   ├── USA.json
│       │   └── ...             # One file per ISO3 — lazy-loaded on country click
│       └── oil/
│           ├── DATA_CONTRACT.md            # Canonical field/unit/source reference
│           ├── oil_price_sample.json       # 12-month 2024 price data (Brent/WTI/Dubai)
│           ├── oil_country_supply_sample.json  # 15 country supply records (2023 est.)
│           └── oil_events_sample.json      # Empty — Step 6 placeholder
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
| Validation | Zod | 4 (imported, not yet used) |
| Geo parsing | topojson-client | 3 |

---

## Layer Architecture

The project uses a **color-injection pattern** for choropleth layers, not a separate MapLibre Source/Layer per dataset. This was a deliberate choice over the v2 approach of stacking multiple GeoJSON sources.

### How it works

`WorldMap.tsx` fetches `countries-110m.json` once and parses it into a GeoJSON FeatureCollection. For every country feature, it computes a `color` property and injects it into the GeoJSON. The MapLibre fill layer reads `['get', 'color']` — one layer, one source, no z-ordering issues.

```
countries-110m.json (TopoJSON)
  → topojson.feature()           parsed once on mount
  → fixFeatureCollection()       antimeridian fix
  → geoWithColors (useMemo)      color assigned per-feature
      ├─ selected country         → #2563EB (blue)  — always highest priority
      ├─ compare country          → #8B5CF6 (purple) — second priority
      ├─ oil layer active         → getOilChoroplethColor(iso3, metric)
      └─ default                  → #131C30 (dark base)
  → <Source> + <Layer>           single MapLibre fill layer
```

### What `OilMapLayer.tsx` actually is

`OilMapLayer.tsx` is not a MapLibre component — it is a **color utility module** with a co-located legend component. It exports:

- `getOilChoroplethColor(iso3, metric)` — pure function, called by `WorldMap` inside the `geoWithColors` memo
- `getOilTooltipData(iso3, metric)` — pure function, called by `WorldMap` when building hover tooltip content
- `OilMapLayer` (default) — a DOM overlay React component rendering the map legend

The legend is positioned `absolute` inside the map container div, not inside MapLibre's canvas. `WorldMap` renders `{oilLayerActive && <OilMapLayer metric={oilMetric} />}` at the bottom of its container.

### Adding a new commodity layer (e.g. gas)

1. Create `src/data/gas/gas_country_supply_sample.json`
2. Create `src/components/Map/GasMapLayer.tsx` — same exports pattern: `getGasChoroplethColor`, `getGasTooltipData`, default `GasMapLayer` legend
3. Add `gas: boolean` to `layerVisibility` initial state in `useMapStore`
4. In `WorldMap.tsx` `geoWithColors`, add a branch: `else if (gasLayerActive && iso3) { color = getGasChoroplethColor(iso3) }`
5. Add tab to `CountryPanel.tsx` (or extract to `GasTab.tsx` — see Tech Debt)

---

## Store Responsibilities (`useMapStore`)

The single Zustand store owns all global interactive state.

| Slice | Fields | Purpose |
|-------|--------|---------|
| Country selection | `selectedCountryId`, `countryData`, `loading`, `error` | Which country is selected; its geopolitical data |
| Compare | `compareCountryId`, `compareData`, `compareLoading` | Optional second country for side-by-side context |
| Oil metric | `oilMetric`, `setOilMetric` | Which supply metric the choropleth shows (`reserves` \| `production`) |
| Layer visibility | `layerVisibility`, `toggleLayerById`, `isLayerVisible` | Map/off state for each named layer, keyed by string ID |

### Country data loading

`selectCountry(iso3)` dynamically imports `src/data/countries/${iso3}.json`. This means:

- Only the clicked country's JSON is loaded — not all 15 at startup
- Countries without a JSON file produce an error state in the panel
- The `data/countries/` directory currently contains only the 15 oil supply countries

---

## Data Flow

```
User clicks country on map
  │
  ├─ MapMouseEvent → handleClick → selectCountry("SAU")
  │
  ├─ Store: selectedCountryId = "SAU", loading = true
  │
  ├─ Dynamic import: data/countries/SAU.json
  │     success → countryData = { id: "SAU", name: "Saudi Arabia", ... }
  │     failure → error = "No data available..."
  │
  ├─ CountryPanel re-renders
  │     header:    flag + name from countryData
  │     Oil tab:   supplyByISO3.get("SAU") → OilCountrySupplyRecord
  │     Oil stats: reserves, production, OPEC, source note
  │
  └─ WorldMap re-renders (geoWithColors recomputes)
        SAU feature → color = #2563EB (selected override)
```

```
User hovers country on map
  │
  ├─ MapMouseEvent → setTooltip({ name, iso3, x, y })
  │
  ├─ tooltipOilData = getOilTooltipData(iso3, oilMetric)
  │     if oilLayerActive → { value: 267, unit: "Bbbl", label: "Reserves" }
  │     if not in sample  → null
  │
  └─ Tooltip renders: country name + optional oil value
```

```
App startup
  │
  ├─ WorldMap mounts → fetch countries-110m.json → parse TopoJSON → setCountriesGeo
  │
  ├─ geoWithColors computes (oilLayerActive = true by default)
  │     each feature → getOilChoroplethColor(iso3, "reserves")
  │     → 15 countries colored amber, rest colored #111827 (null)
  │
  ├─ OilMapLayer legend renders (oil layer on by default)
  │
  └─ OilPriceChart mounts → import oil_price_sample.json → buildChartData → render
```

---

## Panel Interaction Flow

```
CountryPanel state machine:

  loading = true              → spinner
  error ≠ null                → error message + "Back to map" link
  countryData = null          → empty state (🛢️ + "Click any country")
  countryData ≠ null          → tabbed panel
    tab = 'overview'          → summary, demographics, alliances
    tab = 'oil'               → supply stats from oil_country_supply_sample.json
                                 oil record found  → reserves / production / trade / source
                                 oil record missing → "No oil data" empty state
    tab = 'relationships'     → bilateral relationship cards
    tab = 'history'           → timeline of key events
```

**Oil tab data binding:** `countryData.id` is ISO3. `supplyByISO3` is a module-level `Map<string, OilCountrySupplyRecord>` built once at import time from `oil_country_supply_sample.json`. The lookup is synchronous — no effect, no loading state needed for the oil tab itself.

---

## Extensibility Model

### Adding a new asset tab (e.g. gas, gold)

The `Tab` type union in `CountryPanel.tsx` must be extended: `'overview' | 'oil' | 'gas' | 'relationships' | 'history'`. The tab body is a conditional block inside the same file. This works cleanly at 1–2 new assets; beyond that, extracting tab bodies to separate files is recommended (see Tech Debt).

### Adding new oil metrics to the map (e.g. exports, imports)

1. Populate `exports` / `imports` fields in the supply JSON (currently always `null`)
2. Extend `OilLayerMetric` in `useMapStore.ts` to include `'exports' | 'imports'`
3. Add step scales in `OilMapLayer.tsx`
4. Add metric button in `App.tsx` header

### Adding new crude types to the price chart

1. Add records with new `crude_type` to `oil_price_sample.json`
2. Add an entry to `SERIES` in `OilPriceChart.tsx`
3. Extend `CrudeType` in `oil.ts`

### Replacing sample data with live EIA ingestion

The data files in `src/data/oil/` are the only connection between real data and the UI. To switch from sample to live:

1. Run ingestion script → writes to `src/data/oil/oil_price.json` (replacing `_sample`)
2. Update the import path in `OilPriceChart.tsx` and `OilMapLayer.tsx`
3. Or: expose data via a FastAPI backend and replace static imports with `fetch()` calls

---

## Design System

All UI is built with Tailwind CSS v4 utility classes and inline `style` props for specific hex values. There are no CSS Modules or styled-components. The core palette is:

| Token | Hex | Used for |
|-------|-----|---------|
| Background deep | `#070B14` | App root |
| Background surface | `#0A0F1E` | Header, panels |
| Background card | `#0D1829` | Stat cards, inputs |
| Border | `#1E2D4A` | All borders |
| Text primary | `#FFFFFF` | Values, headings |
| Text secondary | `#CBD5E1` | Body text |
| Text muted | `#475569` | Labels, meta |
| Text faint | `#334155` | Disabled, notes |
| Accent blue | `#2563EB` | Selected country, active tabs |
| Accent amber | `#F59E0B` | Oil data values, Brent series |
| Accent purple | `#8B5CF6` | Compare country |
| Null color | `#111827` | Countries with no oil data |
