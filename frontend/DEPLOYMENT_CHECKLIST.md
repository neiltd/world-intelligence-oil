# Deployment Checklist — Oil Intelligence MVP

Target: GitHub Pages at `https://neiltd.github.io/world-intelligence-oil/`

---

## Security checks

| Check | Status | Notes |
|-------|--------|-------|
| `.env` not tracked | ✅ | Root `.gitignore` covers `.env` at any depth |
| `scripts/.env` not tracked | ✅ | Same pattern |
| No API keys in tracked files | ✅ | Grep confirmed — only `os.getenv()` references in Python |
| No ACLED credentials in code | ✅ | Grep confirmed — never hardcoded |
| `*.db` (ruvector.db) not tracked | ✅ | Root `.gitignore` `*.db` covers `frontend/ruvector.db` + `ruvector.db` |
| `node_modules/` not tracked | ✅ | Covered in both `.gitignore` files |
| `dist/` not tracked | ✅ | Covered by both `.gitignore` files — CI builds from source |
| `.env.example` committed | ✅ | Template only, no real values |

---

## TypeScript

| Check | Status |
|-------|--------|
| `tsc --noEmit` exits 0 | ✅ |
| No `any` casts that hide runtime errors | ✅ |
| Intelligence panel types resolved | ✅ Fixed: `HormuzCard` prop simplified to `HormuzRisk`; `import.meta.env` cast corrected |

---

## Build

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` exits 0 | ✅ | |
| `base: '/world-intelligence-oil/'` set in `vite.config.ts` | ✅ Fixed | Was missing — would have broken all assets on GitHub Pages |
| `dist/index.html` asset paths prefixed with base | ✅ | `/world-intelligence-oil/assets/...` |
| `countries-110m.json` fetch uses `import.meta.env.BASE_URL` | ✅ | `WorldMap.tsx` already correct |
| Intelligence data fetch uses `BASE_URL` | ✅ Fixed | Was `/data/intelligence.json` (root-relative) |
| MapLibre workers bundled inline (no separate worker file) | ✅ | Confirmed in `dist/assets/` — no external worker |
| Carto tile URL is absolute (not affected by base) | ✅ | `https://basemaps.cartocdn.com/...` |
| Live JSON imports resolve at build time | ✅ | Bundled as JS modules by Vite |

---

## GitHub Pages compatibility

| Check | Status | Notes |
|-------|--------|-------|
| No client-side routing | ✅ | Single-page app, no React Router, no 404 issue |
| No server-side code or API routes | ✅ | Static-only frontend |
| MapLibre style tiles from public CDN | ✅ | CartoCDN — no auth needed for basic usage |
| Intelligence stub JSON in `public/data/` | ✅ | Panel shows "unavailable" gracefully until hub delivers |
| Repo must be public OR GitHub Pro | ⚠ | Free tier requires public repo for Pages deployment |

---

## Chunk size warning (non-blocking)

The build emits a warning about chunks > 500 KB:

| Chunk | Size (gzip) |
|-------|-------------|
| `maplibre-gl-*.js` | 273 KB |
| `index-*.js` | 253 KB |

These are expected for a full-screen mapping application. MapLibre cannot be easily split further without significant refactoring. Both are well within typical LCP budgets (< 2 MB total) for a dashboard app. Not a deployment blocker.

To silence the warning without changing behavior:
```ts
// vite.config.ts
build: { chunkSizeWarningLimit: 1500 }
```

---

## Remaining technical debt (non-blocking for initial deploy)

See `TECH_DEBT.md` for full list. Items that affect production quality:

1. **`isLayerVisible` reads `getState()` directly** — bypasses Zustand reactivity. Safe now but may cause stale reads if used outside a reactive context.
2. **`OilLayerMetric` re-exported from store** — should live in `types/oil.ts` only. Currently re-exported for backward compatibility.
3. **`zod` in `package.json` but unused** — remove or use in ingestion validation.
4. **`CountryPanel.tsx` at ~500 lines** — will become unwieldy at second commodity tab. Extract tabs when gas/gold lands.
5. **`data/imports/` files are copied manually** — no sync mechanism between repo root `data/imports/` and `frontend/src/data/imports/`. Consider a `prebuild` script to sync.

---

## Files in this commit

### Frontend (new/modified)
- `frontend/vite.config.ts` — added `base: '/world-intelligence-oil/'`
- `frontend/.gitignore` — added `*.db`
- `frontend/src/hooks/useOilIntelligence.ts` — fixed `import.meta.env` cast + BASE_URL fallback
- `frontend/src/components/Intelligence/OilIntelligencePanel.tsx` — fixed `HormuzCard` prop type
- `frontend/src/components/Intelligence/` (new)
- `frontend/src/components/Oil/OilEventTimeline.tsx` (updated)
- `frontend/src/components/UI/DataStatus.tsx` (new)
- `frontend/src/data/imports/` (new — hub adapter + stub JSONs)
- `frontend/src/data/oil/live/` (new — EIA + EI live data)
- `frontend/src/hooks/useOilIntelligence.ts` (new)
- `frontend/src/types/intelligence.ts` (new)
- `frontend/src/utils/oilEventConfig.ts` (new)
- `frontend/src/store/useMapStore.ts` (updated)
- `frontend/src/App.tsx` (updated)
- `frontend/public/data/intelligence.json` (stub)

### Ingestion scripts (new/modified)
- `scripts/ingestion/ingest_reserves_owid.py`
- `scripts/ingestion/status.py`
- `scripts/data/reserves_ei_2023.csv`
- `scripts/ingest.py`
- `scripts/README.md`
- `scripts/.env.example`

### Hub contract (new)
- `data/imports/` — manifest, stub JSONs, HUB_CONTRACT.md

### CI/CD (new)
- `.github/workflows/deploy.yml`

### Research (new)
- `research/event_ingestion_recommendation.md`
- `research/oil_event_sources.md`

---

## GitHub Pages deployment steps

See below for exact commands.
