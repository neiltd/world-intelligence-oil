// Types matching exports/oil-project/intelligence.json (schemaVersion: '2.0').
// Read from Data Hub export only — never import from Data Hub internals.
// Field names are camelCase per the external consumer contract (schemaVersion 2.0+).
//
// Backward compat note: legacy exports used snake_case keys and schema_version '1.0'.
// Detect legacy by checking: typeof (data as any).schema_version === 'string'.

export type HormuzRiskLevel = 'low' | 'elevated' | 'high' | 'critical'

export interface HormuzRisk {
  active:        boolean
  riskLevel:     HormuzRiskLevel
  maxEscalation: number
  eventIds:      string[]
  updatedAt:     string
}

export interface OilIntelEvent {
  eventId:             string
  storylineId?:        string
  title:               string
  summary:             string
  eventType:           string
  severity:            number   // 1–5
  confidence:          number   // 0–1
  countries:           string[] // ISO3, primary first
  iso3:                string   // countries[0] convenience
  escalationPotential: number
  marketRelevance:     number
  isSupplyDisruption:  boolean
  isHormuzRelated:     boolean
  firstSeenAt:         string
  sourceIds:           string[]
  sourceCount:         number
  lat?:                number
  lng?:                number
  coordinateQuality?:  'source_exact' | 'source_approx' | 'country_centroid' | 'missing'
  coordinateSource?:   string
  locationType?:       string
  relatedAsset?:       string
}

export interface CommoditySignal {
  commodity:       'oil' | 'gas' | 'gold' | 'fertilizer'
  signalDirection: 'up' | 'down' | 'neutral' | 'uncertain'
  intensity:       number
  eventIds:        string[]
  eventCount:      number
}

export interface OilIntelExport {
  // Envelope
  schemaVersion:       string   // '2.0'
  exportType:          'oil-project'
  generatedAt:         string
  date:                string
  extractionVersion:   string
  eventCount:          number
  reviewExcludedCount: number
  uniqueSourceCount:   number

  // Data
  hormuzRisk:       HormuzRisk
  energyEvents:     OilIntelEvent[]
  commoditySignals: CommoditySignal[]
}
