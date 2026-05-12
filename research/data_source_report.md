# Oil Intelligence MVP — Data Source Report

## Recommended MVP Sources

| Data Need | Recommended Source | Why | Limitation |
|---|---|---|---|
| Oil Prices (Brent/WTI) | **EIA Open Data API** | Official US Govt source, high frequency (daily), machine-readable JSON, free. | Requires API registration. |
| Oil Prices (Dubai) | **World Bank Pink Sheet** | Standard global benchmark for Dubai crude, free monthly historical data. | Frequency is monthly, not daily. |
| Oil Reserves | **EIA International API** | Comprehensive global coverage, consistent with price data source, JSON format. | Some lag in reporting for smaller countries. |
| Oil Production | **EIA International API** | Official, detailed, supports annual/monthly frequency. | Lagged data for some regions. |
| Oil Trade (Exports/Imports) | **EI Statistical Review** | "Gold standard" for global energy trade matrices. | Primarily annual frequency. |

---

## Source Details

### Source 1: EIA Open Data API (v2)
- **URL:** [https://www.eia.gov/opendata/](https://www.eia.gov/opendata/)
- **Data type:** Spot Prices, Production, Reserves, Imports, Exports.
- **Frequency:** Daily (Prices), Monthly/Annual (Supply).
- **Coverage:** Global (International endpoint).
- **Format:** JSON / XML.
- **API key required:** Yes (Free registration).
- **Important fields:** `series-id`, `period`, `value`, `units`, `location`.
- **Notes:** Use the `international` route for country-level supply and the `petroleum/pri/spt` route for spot prices.

### Source 2: World Bank Pink Sheet
- **URL:** [World Bank Commodity Price Data](https://www.worldbank.org/en/research/commodity-markets)
- **Data type:** Benchmark Prices (Brent, WTI, Dubai).
- **Frequency:** Monthly.
- **Coverage:** Global benchmarks since 1960.
- **Format:** Excel / CSV.
- **API key required:** No (Direct download).
- **Important fields:** `Crude oil, Brent`, `Crude oil, WTI`, `Crude oil, Dubai`.
- **Notes:** Best source for the Dubai benchmark and for long-term monthly historical consistency.

### Source 3: Energy Institute (EI) Statistical Review of World Energy
- **URL:** [energyinst.org/statistical-review](https://www.energyinst.org/statistical-review) (or via [Our World in Data](https://github.com/owid/energy-data))
- **Data type:** Reserves, Production, Consumption, Trade Movements.
- **Frequency:** Annual.
- **Coverage:** Global, 1900s to present.
- **Format:** CSV / Excel.
- **API key required:** No (via OWID).
- **Important fields:** `country`, `year`, `oil_production_mt`, `oil_reserves_bbl`.
- **Notes:** Recommended for establishing the "ground truth" for annual benchmarks and trade flows between regions.

---

## Final Recommendation

1.  **Phase 1 Ingestion:** Register for an **EIA API Key** immediately. This will provide ~90% of the daily/monthly data needed for the MVP (Brent/WTI prices and Country Production/Reserves).
2.  **Dubai Price Gap:** Supplement the price chart with **World Bank Pink Sheet** data to include the Dubai benchmark, which is critical for a "Global" view but often missing from US-centric APIs.
3.  **Trade Visualization:** Use the **Energy Institute's Trade Matrix** (via Our World in Data CSV) to build the export/import logic, as the EIA's trade data can be more fragmented for non-US flows.
