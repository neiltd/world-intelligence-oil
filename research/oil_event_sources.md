# Oil Intelligence MVP — Oil Event Sources

This report identifies and evaluates reliable sources for geopolitical and supply-chain events affecting the global oil market.

## 1. High-Authority Official Sources (Direct Signal)

| Source Name | Category | URL/API | Format | Suitability for MVP |
| :--- | :--- | :--- | :--- | :--- |
| **OPEC Press Office** | Geopolitical | [opec.org RSS](https://www.opec.org/opec_web/en/feeds.htm) | RSS (XML) | **High** - Official quota changes and meeting outcomes. |
| **EIA Market Updates** | Supply Chain | [EIA Open Data API](https://api.eia.gov/v2/) | JSON | **High** - Inventory shocks and production shut-ins. |
| **Suez Canal Authority**| Chokepoint | [SCA Circulars](https://www.suezcanal.gov.eg/) | PDF/Web | **Medium** - Critical for transit disruptions; requires scraping. |
| **OFAC (US Treasury)** | Sanctions | [Sanctions SLS API](https://sanctionslistservice.ofac.treas.gov/api) | JSON | **High** - Official sanctioning of tankers/entities. |

## 2. Event Aggregators & Monitors (Volume Signal)

| Source Name | Category | URL/API | Format | Signal-to-Noise |
| :--- | :--- | :--- | :--- | :--- |
| **GDELT Project** | Global News | [GDELT DOC 2.0 API](https://api.gdeltproject.org/api/v2/doc/doc) | JSON/CSV | **Low** - High volume; requires strict theme filtering. |
| **ACLED** | Conflict | [ACLED API](https://api.acleddata.com/acled/read) | JSON | **Medium** - Targeted conflict events (infrastructure attacks). |
| **IMF PortWatch** | Trade Flow | [PortWatch Monitor](https://portwatch.imf.org/) | CSV/API | **High** - Quantitative trade volume disruptions. |
| **Lloyd's List** | Shipping | [Lloyd's RSS](http://feeds.feedblitz.com/lloyds-list) | RSS | **Medium** - Expert shipping news; some paywalls. |

---

## Source Details

### Source: OPEC Official Press Releases
- **Type:** Official announcements from the cartel.
- **Machine-Readable:** Yes (RSS/XML).
- **Historical Coverage:** Decades of meeting minutes and press releases.
- **Signal-to-Noise:** Excellent. Every release is market-moving.
- **MVP Role:** Primary source for `event_type: opec`.

### Source: EIA Short-Term Energy Outlook (STEO) - Unplanned Outages
- **Type:** Quantitative data on oil production shut-ins by country.
- **API:** `https://api.eia.gov/v2/steo/`
- **Fields:** `series-id`, `period`, `value` (in mb/d).
- **MVP Role:** High-confidence metric for `event_type: infrastructure` or `conflict` (represented as volume offline).

### Source: GDELT (Global Database of Events, Language, and Tone)
- **Type:** Massive news aggregator.
- **Query Strategy:** Filter by `theme:ECON_OILPRICE` or `theme:ENERGY_INFRASTRUCTURE`.
- **Fields:** `SourceURL`, `Title`, `Tone`, `GeographicLocation`.
- **MVP Role:** Secondary source for broad market sentiment and news discovery.

### Source: ACLED (Conflict Data)
- **Type:** Armed conflict events.
- **Query Strategy:** Search `notes` field for keywords `oil`, `pipeline`, `refinery`.
- **Fields:** `event_date`, `actor1`, `location`, `notes`.
- **MVP Role:** Primary source for `event_type: conflict` impacting production.

---

## Suitability Summary

| Data Need | Recommended Source | Why |
| :--- | :--- | :--- |
| **Quota Changes** | OPEC RSS | Fastest official signal. |
| **Production Shocks**| EIA STEO Outages | Provides numerical impact (kb/d offline). |
| **Attacks/Sabotage** | ACLED | High precision for physical security events. |
| **Sanctions** | OFAC API | Only source for "Primary" sanction events. |
| **Transit Issues** | IMF PortWatch | Best for quantitative Suez/Panama disruptions. |
