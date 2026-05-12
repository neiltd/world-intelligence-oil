export type LayerGroup = 'oil' | 'geopolitical' | 'economic' | 'infrastructure'

export interface LayerMeta {
  id: string
  label: string
  description: string
  group: LayerGroup
  defaultEnabled: boolean
}

export interface LayerProps {
  visible: boolean
  labelLayerId?: string
}
