# Oil Intelligence MVP — Scope

## MVP Goal

Build the first version of an Oil Intelligence Dashboard that answers:

> "Why did oil prices move, and which countries/events were involved?"

---

## In Scope — Version 1

### Oil Price Data
- Brent crude
- WTI crude
- Monthly or daily price depending on available source

Fields:
```
date
crude_type
price_usd
unit
source
last_updated
```

### Country Oil Supply Data
- Proven reserves
- Production
- Exports/imports if available

Fields:
```
country
iso3
year
reserves
production
exports
imports
unit_reserves
unit_production
unit_exports
unit_imports
source
last_updated
```

### Oil Events
- OPEC decisions
- Wars/conflicts
- Sanctions
- Shipping disruptions
- Refinery disruptions
- Major supply/demand announcements

Fields:
```
event_id
date
country
iso3
event_type
title
summary
source
source_url
confidence_level
related_asset
created_at
```

### Frontend Features
- Oil price line chart (Brent + WTI)
- World map colored by oil reserves or production
- Country click panel (reserves, production, exports)
- Event timeline linked to price chart
- Filters: year, country, event type

---

## Data Tables

### 1. oil_price_daily or oil_price_monthly
| Field | Type | Notes |
|-------|------|-------|
| date | date | |
| crude_type | string | Brent, WTI, Dubai |
| price_usd | float | |
| unit | string | per barrel |
| source | string | |
| last_updated | timestamp | |

### 2. oil_country_supply
| Field | Type | Notes |
|-------|------|-------|
| country | string | |
| iso3 | string | |
| year | integer | |
| reserves | float | |
| production | float | |
| exports | float | nullable |
| imports | float | nullable |
| unit_reserves | string | |
| unit_production | string | |
| unit_exports | string | nullable |
| unit_imports | string | nullable |
| source | string | |
| last_updated | timestamp | |

### 3. oil_events
| Field | Type | Notes |
|-------|------|-------|
| event_id | string | UUID |
| date | date | |
| country | string | nullable |
| iso3 | string | nullable |
| event_type | string | conflict, sanction, opec, infrastructure, trade |
| title | string | |
| summary | text | |
| source | string | |
| source_url | string | nullable |
| confidence_level | string | high, medium, low |
| related_asset | string | oil |
| created_at | timestamp | |

---

## Out of Scope — Do Not Build Yet

- Stock market analysis
- Company-level exposure
- Full AI agent system
- Rare earths, gold, silver, gas, lithium
- Advanced forecasting or causal inference
- Real-time news streaming
- Trading recommendations
- Portfolio optimization
- User accounts or saved views
- Mobile optimization

---

## Acceptance Criteria

The MVP is complete when:

- [ ] `/oil` page exists and loads
- [ ] Oil price chart displays sample or real data
- [ ] World map shows country-level oil reserves or production
- [ ] Clicking a country shows that country's oil profile
- [ ] Event timeline displays oil-related events
- [ ] Data structures are clean and documented
- [ ] Gemini has delivered validated data source report
- [ ] Claude builds without breaking existing app features
- [ ] Project structure remains extensible for future assets
