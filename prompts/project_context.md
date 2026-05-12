# Project Context — World Intelligence Oil

## What This Project Is

World Intelligence Oil is the first module of a broader global intelligence platform. It connects geopolitics, commodities, financial markets, infrastructure, and news — starting with oil.

The goal is not just to build a dashboard. The goal is to build the foundation for an intelligence system that can explain how oil prices, reserves, production, trade flows, geopolitical events, and country-level risks interact over time.

## The Core Question This System Answers

> "Why did oil prices move, and which countries/events were involved?"

## AI Team Structure

This project uses a three-role AI coordination model. Each AI has a defined lane. They do not overlap.

| Role | AI | Owns |
|------|----|------|
| Head of Operation | You (the user) | Vision, scope, priorities, task assignment, acceptance criteria |
| Developer AI | Claude Code | Codebase, architecture, frontend, backend, data structures, scripts |
| Researcher AI | Gemini CLI | Data discovery, source validation, schemas, dataset documentation, ingestion specs |

### Head of Operation
- Decides what gets built and in what order
- Reviews outputs from both AIs before handoff
- Resolves scope disputes
- Sets acceptance criteria for each milestone

### Developer AI — Claude Code
- Owns all implementation
- Works on frontend, backend, database, scripts, and component architecture
- Does not invent data sources without Researcher AI validation
- Uses mock data until Gemini delivers validated sources

### Researcher AI — Gemini CLI
- Owns data discovery and research
- Finds reliable sources, documents schemas, validates availability, recommends ingestion approach
- Does not make app architecture decisions unless explicitly requested
- Delivers outputs in structured JSON format for Claude to ingest

## Handoff Rules

### Gemini → Claude
Gemini provides:
- Validated source links
- Dataset schemas and field descriptions
- Sample downloaded data if possible
- Recommended cleaning rules
- Notes about missing values and units

Claude then:
- Builds ingestion-ready data structures
- Maps fields to frontend TypeScript types
- Displays data in the dashboard

### Claude → Gemini
Claude may request:
- Missing ISO3 country codes
- Unit clarification
- Historical coverage confirmation
- Better source for a specific missing field
- Event taxonomy suggestions

### Before Major Implementation
Both AIs must return a response block covering:
- What they understood
- What they will do
- What they will not do
- Risks or blockers
- Expected output

## Directory Layout

```
world-intelligence-oil/
├── frontend/        # React + TypeScript + MapLibre GL dashboard
├── backend/         # FastAPI + PostgreSQL + pgvector API
├── data/
│   ├── raw/         # Unprocessed source data
│   ├── processed/   # Cleaned, structured datasets
│   └── sample/      # Small test datasets for development
├── docs/            # Architecture decisions, API docs, data schemas
├── research/        # Gemini research outputs, event logs, source notes
├── prompts/         # AI coordination specs and context files
├── scripts/         # Data ingestion, transformation, utility scripts
└── notebooks/       # Exploratory analysis, data validation
```

## Current Phase

Phase 1: Oil Intelligence MVP

## Future Phases (Do Not Build Yet)

- Gas
- Gold, silver, lithium, rare earths
- Semiconductor supply chain
- Stock market exposure
- AI analyst agents
- Causal event studies
- Global intelligence graph
