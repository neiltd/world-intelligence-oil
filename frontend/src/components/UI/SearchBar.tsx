import { useState, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'
import { useMapStore } from '../../store/useMapStore'
import countryIndex from '../../data/country-index.json'

interface CountryEntry { id: string; iso2: string; name: string; region: string }
const entries = countryIndex as CountryEntry[]
const fuse = new Fuse(entries, { keys: ['name', 'id'], threshold: 0.35 })

function flag(iso2: string) {
  return iso2.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
  ).join('')
}

export default function SearchBar() {
  const { selectCountry } = useMapStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CountryEntry[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    setResults(fuse.search(query).slice(0, 8).map(r => r.item))
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(c: CountryEntry) {
    selectCountry(c.id)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-64">
      <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{ background: '#0E1525', border: '1px solid #1E2D4A' }}>
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ color: '#475569' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search country..."
          className="bg-transparent text-sm outline-none w-full"
          style={{ color: '#E2E8F0' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }}
            className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-2xl z-50"
          style={{ background: '#0E1525', border: '1px solid #1E2D4A' }}>
          {results.map(c => (
            <button key={c.id} onClick={() => select(c)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#151F35]">
              <span className="text-base">{flag(c.iso2)}</span>
              <div>
                <p className="text-sm" style={{ color: '#E2E8F0' }}>{c.name}</p>
                <p className="text-xs" style={{ color: '#475569' }}>{c.region}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
