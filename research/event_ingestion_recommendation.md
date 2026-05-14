# Oil Event Ingestion Recommendation — MVP

This document outlines the recommended strategy for ingesting geopolitical and supply-chain events into the Oil Intelligence MVP.

## 1. Ingestion Strategy: Three-Tier Pipeline

To balance precision with volume, the system should use a tiered ingestion approach:

### Tier 1: Direct API Sync (Highest Confidence)
- **Sources:** EIA (Outages), OFAC (Sanctions), OPEC (RSS).
- **Process:** Automated polling (Daily).
- **Action:** Auto-publish to timeline. These sources have 100% signal and require no manual verification.

### Tier 2: Curated Feed (Medium Confidence)
- **Sources:** ACLED (Filtered), IMF PortWatch.
- **Process:** Automated script searching for keywords (`oil`, `pipeline`, `refinery`).
- **Action:** Queue for "Quick Review" or auto-publish if keyword confidence is >90%.

### Tier 3: Sentiment & Discovery (Broad Signal)
- **Sources:** GDELT DOC API.
- **Process:** Search by theme (`ECON_OILPRICE`).
- **Action:** Display as "Related News" in a sidebar rather than on the primary event timeline, or use to generate "Market Sentiment" scores.

## 2. Recommended Ingestion Specs

### EIA "Unplanned Production Outages"
- **API Route:** `https://api.eia.gov/v2/steo/`
- **Mapping:**
  - `value` -> Store as a numerical impact attribute on the event.
  - `period` -> `date`.
  - `location` -> Map to `iso3`.

### ACLED Conflict Events
- **Authentication (Mandatory Security):**
  - **Do NOT** store credentials in code or research files.
  - Use OAuth token-based authentication.
  - Read `ACLED_USERNAME` and `ACLED_PASSWORD` from a local `.env` file (ignored by Git).
  - Request an access token from `https://acleddata.com/oauth/token`.
  - Use `Authorization: Bearer <token>` for all API requests.
  - Never log credentials or tokens.
- **API Filter:** `notes LIKE '%oil%' OR notes LIKE '%pipeline%' OR notes LIKE '%refinery%'`
- **Mapping:**
  - `notes` -> `summary`.
  - `event_date` -> `date`.
  - `event_type` -> Map "Explosions/Remote violence" to `event_type: conflict`.

### OPEC Press Releases
- **Source:** [opec.org RSS Feed](https://www.opec.org/opec_web/en/feeds.htm)
- **Mapping:**
  - `pubDate` -> `date`.
  - `title` -> `title`.
  - `link` -> `source_url`.

## 3. Handling Duplicate Events

Since one event (e.g., a refinery strike) may be reported by ACLED, GDELT, and EIA:
1.  **Deduplication Key:** Use `date` + `iso3` + `event_type`.
2.  **Precedence Rule:** If a duplicate is found, prioritize the **Source Precedence** (EIA > ACLED > GDELT).

## 4. MVP Implementation Priority

1.  **First:** Implement **OPEC RSS** and **EIA STEO Outages** (High signal, easiest APIs).
2.  **Second:** Implement **ACLED** filtering for conflict events.
3.  **Third:** Implement **OFAC** sanctions polling for the `RUSSIA-EO14024` program.
