# Technical Debt — Oil Intelligence Frontend

Tracked as of 2026-05-12 (post-Step 5 review pass).

Items are classified by urgency:
- **Critical** — causes a bug or will block the next step
- **Moderate** — causes friction, will compound as the codebase grows
- **Low** — cosmetic, naming, or organizational preference

---

## Fixed During This Review Pass

| Item | Fix Applied |
|------|-------------|
| `data/countries/` directory missing — Oil tab unreachable | Copied 15 country JSON files from v2 |
| `EventType` missing `weather` and `accident` (Gemini taxonomy) | Added to union in `oil.ts` |
| Unused `mapZoom` / `setMapZoom` in store | Removed |
| `REL_BORDER` using Tailwind class names as CSS colors | Changed to hex values in CountryPanel |

---

## Open Items

### 1. `OilLayerMetric` lives in `useMapStore.ts` — wrong file (Moderate)

**Problem:** `OilLayerMetric = 'reserves' | 'production'` is a domain type for oil data, not a store concern. `OilMapLayer.tsx` must import it from the store, creating a coupling that should go the other way.

**Recommended fix:** Move `OilLayerMetric` to `src/types/oil.ts`. The store imports it from there. `OilMapLayer.tsx` imports it from there. No functional change, cleaner dependency direction.

---

### 2. Duplicate supply data lookup (Moderate)

**Problem:** Both `OilMapLayer.tsx` and `CountryPanel.tsx` independently import `oil_country_supply_sample.json` and build a `Map<string, OilCountrySupplyRecord>`. The same 15-record JSON is parsed twice, and the same lookup Map is constructed twice at module load time.

```
OilMapLayer.tsx   → import supplyRaw → new Map(...)  // supplyByISO3
CountryPanel.tsx  → import supplyRaw → new Map(...)  // supplyByISO3 (duplicate)
```

**At 15 records:** negligible cost.
**At 200+ countries:** still negligible for a Map construction, but the duplication is a maintenance hazard — a field rename or null convention change must be updated in two places.

**Recommended fix:** Extract to `src/data/oil/useOilSupply.ts`:
```ts
export const supplyByISO3: Map<string, OilCountrySupplyRecord> = ...
```
Both consumers import the shared singleton. No performance change; maintenance surface halved.

---

### 3. `useMapStore` is misnamed (Low)

**Problem:** The store is named `useMapStore` but owns state unrelated to the map: oil metric, layer visibility toggles, country loading state. As more asset modules land, this name will become increasingly misleading.

**Recommended fix:** Rename to `useAppStore` when a second Zustand store is added (e.g. a future `useOilStore`). If the app stays single-store, rename to `useStore`. Do not rename until there is a second store — premature rename has no value.

---

### 4. `compareCountryId` is redundant (Low)

**Problem:** The store holds both `compareCountryId: string | null` and `compareData: Country | null`. The ID is always derivable from `compareData?.id`. `WorldMap.tsx` reads `compareData?.id` directly. `compareCountryId` is set but never read outside the store itself.

**Recommended fix:** Remove `compareCountryId`. If the ID is ever needed independently, read `compareData?.id ?? null`. No behavior change.

---

### 5. `CountryPanel.tsx` is growing (Moderate)

**Problem:** At 476 lines, `CountryPanel.tsx` contains the full body of four tabs plus two sub-components (`StatCard`, `DetailRow`, `CompareSearch`, `Sec`). Adding gas, gold, or rare earth tabs inline will push this toward 700–900 lines.

**Recommended fix (when a second asset tab lands):** Extract tab bodies to colocated files:
```
src/components/Panel/
  CountryPanel.tsx        # shell: header, tabs, dispatch
  tabs/
    OverviewTab.tsx
    OilTab.tsx
    RelationsTab.tsx
    HistoryTab.tsx
```
`CountryPanel.tsx` maps over a tab registry and renders the active tab component. The `Sec`, `StatCard`, `DetailRow` helpers move to `src/components/Panel/shared.tsx`.

**Do not extract yet** — at one asset tab, the current structure is clear enough.

---

### 6. `layers/_core/types.ts` is unused (Low)

**Problem:** `LayerMeta` and `LayerProps` are defined but nothing imports them. `OilMapLayer.tsx` uses its own local `OilMapLayerProps` interface. `LayerProps` (`{ visible, labelLayerId }`) does not apply to the color-injection architecture this project uses — it was scaffolded from v2's MapLibre Source/Layer pattern, which doesn't apply here.

**Recommended fix:** Delete `layers/_core/types.ts` unless the project adds true MapLibre Source/Layer components (e.g. a pipeline route overlay). Keep the `layers/` directory for future use but remove the dead file. OR: keep it and document that `LayerMeta` will be used when a layer registry UI is built.

---

### 7. `isLayerVisible` reads from `getState()` directly (Low)

**Problem:**
```ts
isLayerVisible: (id: string): boolean => {
  return useMapStore.getState().layerVisibility[id] ?? false
}
```
This bypasses Zustand's reactive subscription. It works correctly inside memos that already depend on `layerVisibility`, but calling `isLayerVisible` in a non-reactive context (e.g. a plain function) will not re-run when visibility changes.

**Recommended fix:** Replace usages of `isLayerVisible(id)` with direct destructuring from `useMapStore`: `const { layerVisibility } = useMapStore()` and read `layerVisibility['oil'] ?? false`. Remove `isLayerVisible` from the store interface entirely. The helper is not adding value over direct property access.

---

### 8. `OilPriceRecord.source_id` / `source_url` vs `OilCountrySupplyRecord` — optionality inconsistency (Low)

**Problem:** In `OilPriceRecord`, these are `?: string` (optional/undefined). In `OilCountrySupplyRecord`, they are also `?: string`. In `OilEventRecord`, `source_url` is `string | null` (required but nullable). The inconsistency means consuming code must handle both `undefined` and `null` for audit trail fields.

**Recommended fix:** Standardize on `string | null` for all optional string fields in oil types. Align with Gemini's null convention (null = explicitly missing, not undefined = field absent). The JSON files already use `null` explicitly — the TypeScript types should match.

---

### 9. No `.env` file or API key management (Moderate)

**Problem:** The EIA API key and World Bank endpoints are documented in `DATA_CONTRACT.md` but there is no `.env.example`, no `VITE_EIA_API_KEY` variable, and no ingestion script. When real data ingestion begins, there is no established pattern for secret handling.

**Recommended fix (before ingestion step):** Add `.env.example` with `VITE_EIA_API_KEY=your_key_here`. Add `.env` to `.gitignore` (already ignored). Create `scripts/ingest_prices.py` with the EIA API call pattern.

---

### 10. `data/countries/` only has 15 files (Known limitation)

**Problem:** `selectCountry` dynamically imports from `data/countries/${iso3}.json`. Only the 15 oil supply countries have files. Clicking any other country produces an error state ("No data available for this country yet."). The Oil tab is therefore only accessible for these 15 countries.

**This is intentional for MVP.** The error message is accurate. The country data files will be expanded when v2's full country dataset is ported.

**When expanding:** Copy remaining country files from `worldmaphistory_v2/src/data/countries/`. No code change required — the dynamic import pattern already handles any ISO3 that has a corresponding file.

---

## TypeScript Alignment with Gemini Standards

Verified as of 2026-05-12:

| Standard | Status |
|----------|--------|
| `null` for missing values (not `0`, not `undefined`) | ✅ Enforced in types and sample data |
| `number \| null` for nullable numeric fields | ✅ `reserves`, `production`, `exports`, `imports` |
| ISO3 as primary geography key | ✅ Required in both supply and event types |
| ISO 8601 dates | ✅ `"YYYY-MM"` monthly, `"YYYY-MM-DD"` daily, integer year for annual |
| Source precedence: EIA > EnergyInstitute > WorldBank | ✅ Documented in type comment and DATA_CONTRACT |
| Unit abbreviations: Bbbl, kb/d | ✅ Used in panel display, documented in types |
| EventType taxonomy: includes `weather`, `accident` | ✅ Fixed in this review pass |
| Explicit unit fields on all supply records | ✅ `unit_reserves`, `unit_production` always present |

---

## Dependency Audit

No unused dependencies. All packages in `package.json` are actively used:

| Package | Used by |
|---------|---------|
| `maplibre-gl` + `react-map-gl` | WorldMap.tsx |
| `recharts` | OilPriceChart.tsx |
| `zustand` | useMapStore.ts |
| `framer-motion` | App.tsx (panel animation) |
| `fuse.js` | SearchBar.tsx, CountryPanel.tsx (CompareSearch) |
| `topojson-client` | WorldMap.tsx |
| `zod` | Imported in package.json, not yet used in source — see below |

**`zod` is declared but unused.** It was included in anticipation of ingestion script validation. Remove from `package.json` now, or use it in the first ingestion script (Step 9). Do not keep unused dependencies.
