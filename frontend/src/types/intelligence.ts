// Types matching exports/oil-project/intelligence.json (schema_version: 1.0).
// Read from Data Hub export only — never import from Data Hub internals.

export type HormuzRiskLevel = 'low' | 'elevated' | 'high' | 'critical'

export interface HormuzRisk {
  active:          boolean
  risk_level:      HormuzRiskLevel
  max_escalation:  number
  event_ids:       string[]
  updated_at:      string
}

export interface OilIntelEvent {
  event_id:             string
  storyline_id?:        string
  title:                string
  summary:              string
  event_type:           string
  severity:             number   // 1–5
  confidence_score:     number   // 0–1
  countries:            string[] // ISO3, primary first
  escalation_potential: number
  market_relevance:     number
  is_supply_disruption: boolean
  is_hormuz_related:    boolean
  first_seen_at:        string
  source_ids:           string[]
}

export interface CommoditySignal {
  commodity:        'oil' | 'gas' | 'gold' | 'fertilizer'
  signal_direction: 'up' | 'down' | 'neutral' | 'uncertain'
  intensity:        number
  event_ids:        string[]
  event_count:      number
}

export interface OilIntelExport {
  // Meta — always display these
  schema_version:        string
  export_type:           'oil-project'
  generated_at:          string
  date:                  string
  extraction_version:    string
  event_count:           number
  review_excluded_count: number   // withheld pending human review
  unique_source_count:   number   // distinct RSS outlets

  // Data
  hormuz_risk:       HormuzRisk
  energy_events:     OilIntelEvent[]
  commodity_signals: CommoditySignal[]
}
