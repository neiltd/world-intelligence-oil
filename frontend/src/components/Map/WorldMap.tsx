import { useState, useEffect, useMemo, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import type { MapMouseEvent, MapEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
// @ts-expect-error topojson-client has no bundled types
import * as topojson from 'topojson-client'
import { useMapStore } from '../../store/useMapStore'
import { fixFeatureCollection } from '../../utils/geoUtils'
import OilMapLayer, { getOilChoroplethColor, getOilTooltipData } from './OilMapLayer'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Base fill color for countries that have no oil data and are not selected
const BASE_COLOR     = '#131C30'
const EMPTY_COLOR    = '#0C1220' // countries without ISO3 (unrecognised territories)

const NUM_TO_ISO3: Record<string, string> = {
  '004':'AFG','008':'ALB','012':'DZA','024':'AGO','028':'ATG','032':'ARG','036':'AUS',
  '040':'AUT','031':'AZE','044':'BHS','048':'BHR','050':'BGD','052':'BRB','112':'BLR',
  '056':'BEL','084':'BLZ','204':'BEN','064':'BTN','068':'BOL','070':'BIH','072':'BWA',
  '076':'BRA','096':'BRN','100':'BGR','854':'BFA','108':'BDI','116':'KHM','120':'CMR',
  '124':'CAN','132':'CPV','140':'CAF','148':'TCD','152':'CHL','156':'CHN','170':'COL',
  '174':'COM','178':'COG','180':'COD','188':'CRI','384':'CIV','191':'HRV','192':'CUB',
  '196':'CYP','203':'CZE','208':'DNK','262':'DJI','214':'DOM','218':'ECU','818':'EGY',
  '222':'SLV','226':'GNQ','232':'ERI','233':'EST','231':'ETH','242':'FJI','246':'FIN',
  '250':'FRA','266':'GAB','270':'GMB','268':'GEO','276':'DEU','288':'GHA','300':'GRC',
  '308':'GRD','320':'GTM','324':'GIN','624':'GNB','328':'GUY','332':'HTI','340':'HND',
  '348':'HUN','356':'IND','360':'IDN','364':'IRN','368':'IRQ','372':'IRL','376':'ISR',
  '380':'ITA','388':'JAM','392':'JPN','400':'JOR','398':'KAZ','404':'KEN','296':'KIR',
  '408':'PRK','410':'KOR','414':'KWT','417':'KGZ','418':'LAO','422':'LBN','426':'LSO',
  '430':'LBR','434':'LBY','440':'LTU','442':'LUX','450':'MDG','454':'MWI','458':'MYS',
  '462':'MDV','466':'MLI','470':'MLT','478':'MRT','484':'MEX','583':'FSM','498':'MDA',
  '496':'MNG','504':'MAR','508':'MOZ','104':'MMR','516':'NAM','520':'NRU','524':'NPL',
  '528':'NLD','554':'NZL','558':'NIC','562':'NER','566':'NGA','578':'NOR','512':'OMN',
  '586':'PAK','585':'PLW','591':'PAN','598':'PNG','600':'PRY','604':'PER','608':'PHL',
  '616':'POL','620':'PRT','634':'QAT','642':'ROU','643':'RUS','646':'RWA','659':'KNA',
  '662':'LCA','670':'VCT','882':'WSM','678':'STP','682':'SAU','686':'SEN','694':'SLE',
  '706':'SOM','710':'ZAF','724':'ESP','144':'LKA','729':'SDN','740':'SUR','752':'SWE',
  '756':'CHE','760':'SYR','762':'TJK','834':'TZA','764':'THA','626':'TLS','768':'TGO',
  '776':'TON','780':'TTO','788':'TUN','792':'TUR','795':'TKM','798':'TUV','800':'UGA',
  '804':'UKR','784':'ARE','826':'GBR','840':'USA','858':'URY','860':'UZB','548':'VUT',
  '862':'VEN','704':'VNM','887':'YEM','894':'ZMB','716':'ZWE','020':'AND','051':'ARM',
  '352':'ISL','438':'LIE','492':'MCO','807':'MKD','480':'MUS','688':'SRB','703':'SVK',
  '705':'SVN','090':'SLB',
}

type TooltipState = {
  name: string
  iso3: string | null
  x: number
  y: number
}

export default function WorldMap() {
  const {
    selectedCountryId, countryData, compareData, selectCountry,
    oilMetric, isLayerVisible,
  } = useMapStore()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countriesGeo, setCountriesGeo] = useState<any>(null)
  const [labelLayerId, setLabelLayerId] = useState<string | undefined>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const oilLayerActive = isLayerVisible('oil')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries-110m.json`)
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((topo: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = topojson.feature(topo, topo.objects.countries) as any
        const fixed = fixFeatureCollection(geo)
        setCountriesGeo({
          ...fixed,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          features: fixed.features.map((f: any) => ({
            ...f,
            properties: {
              numId: String(f.id),
              iso3: NUM_TO_ISO3[String(f.id)] ?? null,
              name: f.properties?.name ?? '',
            },
          })),
        })
      })
  }, [])

  function handleMapLoad(e: MapEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers = (e.target.getStyle().layers ?? []) as any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = layers.find((l: any) => l.type === 'symbol')
    setLabelLayerId(first?.id)
  }

  // ── Choropleth color computation ─────────────────────────────────────────────
  // Priority (highest wins):
  //   1. Selected country  → blue
  //   2. Compare country   → purple
  //   3. Oil layer active  → choropleth color from OilMapLayer
  //   4. Fallback          → base dark color
  //
  // This means clicking a country always shows blue regardless of oil layer state,
  // preserving existing CountryPanel behavior.

  const geoWithColors = useMemo(() => {
    if (!countriesGeo) return null
    return {
      ...countriesGeo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features: countriesGeo.features.map((f: any) => {
        const iso3: string | null = f.properties?.iso3

        // Selected / compare overrides always win.
        // Use selectedCountryId (not countryData?.id) so highlight persists even
        // when the country JSON failed to load (e.g. clicking "View on map" for a
        // country not yet in data/countries/).
        if (iso3 === selectedCountryId) return { ...f, properties: { ...f.properties, color: '#2563EB' } }
        if (iso3 === compareData?.id)   return { ...f, properties: { ...f.properties, color: '#8B5CF6' } }

        // Oil choropleth
        if (oilLayerActive && iso3) {
          return { ...f, properties: { ...f.properties, color: getOilChoroplethColor(iso3, oilMetric) } }
        }

        // Base
        const color = iso3 ? BASE_COLOR : EMPTY_COLOR
        return { ...f, properties: { ...f.properties, color } }
      }),
    }
  }, [countriesGeo, selectedCountryId, compareData, oilLayerActive, oilMetric])

  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    const f = e.features?.[0]
    if (!f) { setTooltip(null); return }
    setTooltip({
      name: f.properties?.name ?? '',
      iso3: f.properties?.iso3 ?? null,
      x: e.point.x,
      y: e.point.y,
    })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const handleClick = useCallback((e: MapMouseEvent) => {
    const f = e.features?.[0]
    if (!f) return
    const iso3 = f.properties?.iso3
    if (iso3) selectCountry(iso3)
  }, [selectCountry])

  // Build tooltip oil data only when layer is active and we have an iso3
  const tooltipOilData = useMemo(() => {
    if (!oilLayerActive || !tooltip?.iso3) return null
    return getOilTooltipData(tooltip.iso3, oilMetric)
  }, [oilLayerActive, tooltip?.iso3, oilMetric])

  return (
    <div className="relative w-full h-full">
      <Map
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: 20, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['countries-fill']}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onLoad={handleMapLoad}
      >
        {geoWithColors && (
          <Source id="countries" type="geojson" data={geoWithColors} generateId>
            <Layer
              id="countries-fill"
              type="fill"
              beforeId={labelLayerId}
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.85,
              }}
            />
          </Source>
        )}
        <NavigationControl position="top-right" showCompass={false} />
      </Map>

      {/* Oil choropleth legend — rendered as DOM overlay inside map container */}
      {oilLayerActive && <OilMapLayer metric={oilMetric} />}

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div
            className="rounded-lg shadow-xl border text-xs"
            style={{ background: '#0E1525', borderColor: '#1E2D4A', padding: '6px 10px' }}
          >
            <p className="font-medium text-white">{tooltip.name}</p>
            {tooltipOilData && (
              <p className="mt-0.5" style={{ color: '#94A3B8' }}>
                {tooltipOilData.label}:{' '}
                <span className="font-mono text-white">
                  {tooltipOilData.value !== null
                    ? `${tooltipOilData.value.toLocaleString()} ${tooltipOilData.unit}`
                    : 'No data'}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {!countryData && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
          <p
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: '#0E1525CC', color: '#475569', border: '1px solid #1E2D4A' }}
          >
            Click any country to explore its oil profile
          </p>
        </div>
      )}
    </div>
  )
}
