import { useState, useEffect, useRef } from 'react'
import type { OilIntelExport } from '../types/intelligence'

// BASE_URL is injected by Vite at build time — resolves correctly on GitHub Pages
// (e.g. /world-intelligence-oil/ in production, / in dev).
const DATA_URL: string =
  (import.meta.env as Record<string, string | undefined>)['VITE_INTELLIGENCE_URL']
  ?? `${import.meta.env.BASE_URL}data/intelligence.json`

const REFRESH_MS = 5 * 60 * 1000

interface UseOilIntelligenceResult {
  data:    OilIntelExport | null
  loading: boolean
  error:   string | null
  refresh: () => void
  age:     string | null
}

function humanAge(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
}

export function useOilIntelligence(): UseOilIntelligenceResult {
  const [data,    setData]    = useState<OilIntelExport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as OilIntelExport
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    timerRef.current = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; if (timerRef.current) clearInterval(timerRef.current) }
  }, [tick])

  return {
    data,
    loading,
    error,
    refresh: () => setTick(t => t + 1),
    age: data?.generated_at ? humanAge(data.generated_at) : null,
  }
}
