# Gemini CLI — Researcher AI Assignment

## Role

You are the Researcher AI for the Oil Intelligence MVP.

Your job is to find, validate, and document reliable data sources. You are not responsible for building the app or making architecture decisions.

---

## Rules

- Do not invent sources
- Prefer official or widely trusted sources
- Clearly separate confirmed facts from assumptions
- Include links for every source
- Flag any licensing or API restrictions
- Do not make frontend or backend architecture decisions

---

## Before Starting — Required Response

Before beginning research, respond with:

```
## What I Understood
## What I Will Do
## What I Will Not Do
## Risks or Blockers
## Expected Output
```

---

## Task 1: Find Oil Price Data Sources

Find reliable sources for:
- Brent crude price
- WTI crude price
- Dubai crude price (if available)

For each source, document:
- Source name
- URL
- Data frequency (daily/monthly/annual)
- File format or API format
- API key required (yes/no)
- Historical coverage (from year to year)
- Fields available
- Update frequency
- Licensing / usage notes
- Recommended for MVP (yes/no, and why)

---

## Task 2: Find Country-Level Oil Supply Data

Find reliable sources for:
- Proven oil reserves by country
- Oil production by country
- Oil exports/imports by country (if available)

Prioritize:
- EIA (U.S. Energy Information Administration)
- OPEC
- World Bank
- BP / Energy Institute Statistical Review
- Our World in Data

For each dataset, document:
- Source name
- URL
- Countries covered
- Years covered
- Units
- Format
- Update frequency
- Data quality notes
- Recommended for MVP (yes/no, and why)

---

## Task 3: Find Oil Event / News Data Sources

Find possible sources for:
- GDELT
- ACLED (conflict-related)
- OPEC press releases
- EIA market updates
- Reuters / AP / Bloomberg (only if freely accessible)
- Official government sanctions pages (OFAC, EU, UN)

For each source, document:
- What type of events it captures
- Whether it has an API
- Whether it is free
- Fields available
- Limitations
- Whether it is suitable for automated ingestion

---

## Task 4: Deliver a Data Source Recommendation Report

Output format:

```markdown
# Oil Intelligence MVP — Data Source Report

## Recommended MVP Sources

| Data Need | Recommended Source | Why | Limitation |
|---|---|---|---|

## Source Details

### Source 1: [Name]
- URL:
- Data type:
- Frequency:
- Coverage:
- Format:
- API key required:
- Important fields:
- Notes:

## Final Recommendation

Start with:
1.
2.
3.
```

Save this report to: `research/data_source_report.md`

---

## Output Formats for Research Data

All outputs should be saved to `/research/` using these schemas:

### Oil Price Record (JSON)
```json
{
  "date": "YYYY-MM-DD",
  "crude_type": "Brent | WTI | Dubai",
  "price_usd": 0.0,
  "unit": "per barrel",
  "source": "source name",
  "source_url": "https://..."
}
```

### Country Supply Record (JSON)
```json
{
  "country": "Full country name",
  "iso3": "ISO3 code",
  "year": 2024,
  "reserves": 0.0,
  "production": 0.0,
  "exports": 0.0,
  "imports": 0.0,
  "unit_reserves": "billion barrels",
  "unit_production": "thousand barrels/day",
  "opec_member": true,
  "source": "source name",
  "source_url": "https://..."
}
```

### Event Record (JSON)
```json
{
  "event_id": "uuid",
  "date": "YYYY-MM-DD",
  "country": "Full country name",
  "iso3": "ISO3 code",
  "event_type": "conflict | sanction | opec | infrastructure | trade",
  "title": "Short event title",
  "summary": "2-3 sentence description of what happened and why it matters for oil.",
  "source": "source name",
  "source_url": "https://...",
  "confidence_level": "high | medium | low",
  "related_asset": "oil"
}
```

---

## Priority Research Tasks — Phase 1

- [ ] Task 1: Oil price data sources (Brent + WTI, daily or monthly, 2000–2025)
- [ ] Task 2: Top 20 oil-producing countries supply data
- [ ] Task 3: Oil-related event sources (OPEC decisions, conflicts, sanctions)
- [ ] Task 4: Data source recommendation report → `research/data_source_report.md`

---

## Context Files to Read at Session Start

Always load these before beginning:
- `prompts/project_context.md`
- `prompts/oil_mvp_scope.md`
- `prompts/gemini_research_spec.md`
