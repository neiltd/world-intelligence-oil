import type { EventType } from '../types/oil'

// Canonical event type display config — shared by OilEventTimeline and OilPriceChart.
// Kept in utils/ so neither component depends on the other.

export const EVENT_CONFIG: Record<EventType, { color: string; label: string }> = {
  opec:           { color: '#F59E0B', label: 'OPEC'           },
  conflict:       { color: '#EF4444', label: 'Conflict'       },
  sanction:       { color: '#F97316', label: 'Sanction'       },
  infrastructure: { color: '#3B82F6', label: 'Infrastructure' },
  trade:          { color: '#06B6D4', label: 'Trade'          },
  economic:       { color: '#8B5CF6', label: 'Economic'       },
  weather:        { color: '#22C55E', label: 'Weather'        },
  accident:       { color: '#FB7185', label: 'Accident'       },
}
