# Oil Intelligence — Ingestion Scripts

Python ingestion pipeline for the Oil Intelligence MVP.
Fetches validated data from EIA Open Data API v2 and exports normalised JSON
into `frontend/src/data/oil/live/` for direct use by the Vite frontend.

---

## Quick Start

```bash
# 1. From the repo root, enter the scripts directory
cd scripts

# 2. Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env — add your EIA_API_KEY

# 5. Run
cd ..   # back to repo root
python scripts/ingest.py prices    # EIA Brent + WTI prices
python scripts/ingest.py supply    # EIA reserves + production
python scripts/ingest.py all       # both
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EIA_API_KEY` | **Yes** | — | Free key from https://www.eia.gov/opendata/ |
| `START_YEAR` | No | `2010` | First year to fetch |
| `END_YEAR` | No | `2024` | Last year to fetch |

---

## Output Files

| Script | Output |
|--------|--------|
| `ingest.py prices` | `frontend/src/data/oil/live/oil_price.json` |
| `ingest.py supply` | `frontend/src/data/oil/live/oil_country_supply.json` |

These files are committed to git. The frontend imports from `live/` once the
team is ready to switch from the `_sample` files.

To update the frontend imports after first successful ingestion:

```ts
// In OilPriceChart.tsx — change:
import rawData from '../../data/oil/oil_price_sample.json'
// To:
import rawData from '../../data/oil/live/oil_price.json'

// In OilMapLayer.tsx and CountryPanel.tsx — change:
import supplyRaw from '../../data/oil/oil_country_supply_sample.json'
// To:
import supplyRaw from '../../data/oil/live/oil_country_supply.json'
```

---

## Folder Structure

```
scripts/
├── .env.example         ← copy to .env, add EIA_API_KEY
├── .env                 ← gitignored — never commit
├── requirements.txt     ← pinned dependencies
├── README.md
├── ingest.py            ← CLI entry point
└── ingestion/
    ├── __init__.py
    ├── config.py        ← env loading, paths, constants
    ├── schema.py        ← Pydantic models (mirrors TypeScript types)
    ├── eia_client.py    ← HTTP client with retry + pagination
    ├── normalise.py     ← unit conversion, ISO3 mapping, data quality notes
    ├── ingest_prices.py ← EIA Brent + WTI price ingestion
    └── ingest_supply.py ← EIA reserves + production ingestion
```

---

## Data Standards (Gemini-aligned)

| Standard | Value |
|----------|-------|
| Production unit | kb/d (thousand barrels per day) |
| Reserves unit | Bbbl (billion barrels) |
| Geography key | ISO3 (alpha-3) |
| Date format | ISO 8601 — `YYYY-MM` monthly, `YYYY-MM-DD` daily, integer for annual |
| Missing values | `null` — never `0` for unknown data |
| Source precedence | EIA > EnergyInstitute > WorldBank > OPEC > manual |

---

## Adding a New Source

1. Add a new module `ingestion/ingest_<source>.py` following the pattern of `ingest_prices.py`
2. Add the Pydantic model to `schema.py` if the output type is new
3. Add ISO3 mappings to `normalise.py` if needed
4. Register the command in `ingest.py`'s `COMMANDS` dict

---

## Error Handling

- **Missing API key**: exits with a clear message before any network call
- **Network errors**: retried 3 times with exponential backoff (1s, 2s, 4s)
- **HTTP 4xx/5xx**: raised immediately with URL and response body in the message
- **Validation failures**: collected per-record; partial output is written if some records pass
- **Unknown units**: logged as warnings; the record is skipped (not silently converted)
- **Unknown country names**: logged as a count; add to `normalise.EIA_NAME_TO_ISO3` to include
- **File write**: atomic (`.tmp` file → rename), so a failed run never produces a partial file
