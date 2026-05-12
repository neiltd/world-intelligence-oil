# Claude Code — Developer AI Assignment

## Role

You are the Developer AI for the Oil Intelligence MVP.

Your job is to inspect the existing codebase and implement the MVP foundation. Another AI (Gemini CLI) is responsible for researching and validating data sources. Do not invent data sources. Use mock data until Gemini delivers validated sources.

---

## Rules

- Do not overbuild
- Do not add rare earths, gold, silver, gas, or other assets yet
- Do not create autonomous agents yet
- Use mock data until Gemini provides validated sources
- Keep architecture extensible for future assets
- Reuse existing map and country components where possible
- Avoid breaking existing features
- Document every new file added
- Keep implementation simple and testable

---

## Before Starting — Required Response

Before any major implementation, respond with:

```
## What I Understood
## What I Will Do
## What I Will Not Do
## Risks or Blockers
## Expected Output
```

---

## Task 1: Inspect Existing Project

Review the current codebase and summarize:

- Framework and libraries used
- Folder structure
- Existing map components
- Existing country data structure
- Existing state management
- Existing charting libraries
- Where oil intelligence features should be added

Output format:
```
# Codebase Assessment
## Current Architecture
## Relevant Existing Components
## Recommended Implementation Location
## Risks / Technical Debt
## Next Build Steps
```

---

## Task 2: Create Oil Data Structures

Add static JSON or TypeScript-compatible data structures for:
- `oil_price`
- `oil_country_supply`
- `oil_events`

Use mock/sample data first if real data is not ready.

Sample files:
```
src/data/oil/oil_price_sample.json
src/data/oil/oil_country_supply_sample.json
src/data/oil/oil_events_sample.json
```

---

## Task 3: Build Oil Intelligence Page

Create a new route/page at `/oil`.

Page must include:
- Title: Oil Intelligence
- Oil price chart (Brent + WTI)
- World map layer for oil reserves or production
- Country detail panel
- Event timeline
- Filters: year, country, event type

---

## Task 4: Integrate with Existing Map

If the existing world map already supports country layers, add oil reserve/production as a selectable layer.

Layer examples:
- Oil reserves
- Oil production
- Oil import dependency

---

## Task 5: Build Reusable Components

```
OilPriceChart.tsx
OilMapLayer.tsx
OilCountryPanel.tsx
OilEventTimeline.tsx
OilFilters.tsx
```

---

## Task 6: Define TypeScript Types for Real Data Ingestion

```typescript
type OilPriceRecord = {
  date: string;
  crude_type: "Brent" | "WTI" | "Dubai";
  price_usd: number;
  unit: string;
  source: string;
};

type OilCountrySupplyRecord = {
  country: string;
  iso3: string;
  year: number;
  reserves?: number;
  production?: number;
  exports?: number;
  imports?: number;
  unit_reserves?: string;
  unit_production?: string;
  source: string;
};

type OilEventRecord = {
  event_id: string;
  date: string;
  country?: string;
  iso3?: string;
  event_type: "conflict" | "sanction" | "opec" | "infrastructure" | "trade";
  title: string;
  summary: string;
  source: string;
  source_url?: string;
  confidence_level: "high" | "medium" | "low";
  related_asset: "oil";
};
```

---

## Context Files to Read at Session Start

Always load these before beginning:
- `prompts/project_context.md`
- `prompts/oil_mvp_scope.md`
- `prompts/claude_dev_spec.md`
