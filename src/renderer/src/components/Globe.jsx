import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import GlobeGL from 'react-globe.gl'
import Supercluster from 'supercluster'
import { THEMES, GLOBE_TEXTURES } from '../shared/themes'
// TODO: implement progressive low-res → high-res texture loading
// import { GLOBE_TEXTURES_LORES } from '../shared/themes'

const MAX_ALT = 3.0
const MAX_ZOOM = 14

function altToZoom(altitude, minAlt) {
  const logRange = Math.log(MAX_ALT / minAlt)
  const logAlt = Math.log(MAX_ALT / Math.max(altitude, minAlt))
  return Math.max(0, Math.min(MAX_ZOOM, Math.round(logAlt / logRange * MAX_ZOOM)))
}

function zoomToAlt(zoom, minAlt) {
  return MAX_ALT * Math.exp(-zoom / MAX_ZOOM * Math.log(MAX_ALT / minAlt))
}

// Globe.gl sets pointer-events:none on its HTML layer so the globe stays interactive.
// Each element needs pointer-events:auto to receive clicks independently.

// SVG map-pin teardrop element — pinned at its bottom tip to the lat/lng point
function buildPinEl(color, pxWidth, label, onClick, onWheel) {
  const w = pxWidth
  const h = Math.round(w * 1.45)
  const el = document.createElement('div')
  el.title = label
  el.style.cssText = 'cursor:pointer; user-select:none; display:inline-block; pointer-events:auto;'
  el.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 40 58"
         style="display:block; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
      <path d="M20 0C9 0 0 9 0 20C0 35 20 58 20 58C20 58 40 35 40 20C40 9 31 0 20 0Z"
            fill="${color}"/>
      <circle cx="20" cy="20" r="8" fill="rgba(255,255,255,0.7)"/>
    </svg>`
  el.style.transform = 'translate(-50%, -100%)'
  el.addEventListener('click', e => { e.stopPropagation(); onClick() })
  el.addEventListener('wheel', e => { e.preventDefault(); onWheel(e) }, { passive: false })
  return el
}

// Circular cluster badge with count
function buildClusterEl(count, color, pxBase, onClick, onWheel) {
  const s = Math.round(Math.min(pxBase * 1.9, pxBase + Math.log2(count) * pxBase * 0.28))
  const el = document.createElement('div')
  el.title = `${count} locations`
  el.style.cssText = 'cursor:pointer; user-select:none; display:inline-block; pointer-events:auto;'
  el.innerHTML = `
    <div style="
      width:${s}px; height:${s}px; border-radius:50%;
      background:${color}; border:2.5px solid rgba(255,255,255,0.6);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-size:${Math.round(s * 0.36)}px;
      font-family:system-ui,sans-serif; font-weight:600; letter-spacing:-0.02em;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);">${count}</div>`
  el.style.transform = 'translate(-50%, -50%)'
  el.addEventListener('click', e => { e.stopPropagation(); onClick() })
  el.addEventListener('wheel', e => { e.preventDefault(); onWheel(e) }, { passive: false })
  return el
}

export default function Globe({ pins, activeLayers, onPinClick, settings }) {
  const globeRef = useRef()
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)

  // Stable ref so HTML element click handlers always call the current handler
  // without needing to recreate the DOM elements every render
  const onClickRef = useRef()

  const t = THEMES[settings.theme]
  const { minAltitude, clusterRadius, pinSize } = settings
  const pxWidth = Math.round(pinSize * 28)
  // clusterRadius is 1–100 density scale; maps to supercluster's zoom-0 pixel radius
  const clusterRadiusPx = clusterRadius * 0.5

  // Render at the display's full physical resolution
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    globe.renderer().setPixelRatio(window.devicePixelRatio)
  }, [])


  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    globe.controls().minDistance = 100 * (1 + minAltitude)
  }, [minAltitude])

  const filteredPins = useMemo(() => {
    const visible = pins.filter(p => activeLayers.has(p.category))

    // TODO: pin overlap at min zoom — the spread formula and grouping precision need
    // proper calibration. Current approach is a rough approximation; pins may still
    // overlap or be spread too far depending on pinSize and minAltitude.
    const PRECISION = 2  // 0.01° grid (~1.1 km) — catches GPS-indistinct locations
    const SPREAD_DEG = 1.5 * pinSize * 0.042 * minAltitude
    const groups = new Map()
    for (const pin of visible) {
      const key = `${pin.lat.toFixed(PRECISION)},${pin.lng.toFixed(PRECISION)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(pin)
    }

    const result = []
    for (const group of groups.values()) {
      if (group.length === 1) {
        result.push(group[0])
      } else {
        group.forEach((pin, i) => {
          const angle = (2 * Math.PI * i) / group.length
          result.push({ ...pin,
            lat: pin.lat + SPREAD_DEG * Math.cos(angle),
            lng: pin.lng + SPREAD_DEG * Math.sin(angle)
          })
        })
      }
    }
    return result
  }, [pins, activeLayers, minAltitude, pinSize])

  const supercluster = useMemo(() => {
    if (!filteredPins.length) return null
    const sc = new Supercluster({ radius: clusterRadiusPx, maxZoom: MAX_ZOOM })
    sc.load(filteredPins.map(pin => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: pin
    })))
    return sc
  }, [filteredPins, clusterRadiusPx])

  const pointsData = useMemo(() => {
    if (!supercluster) return []
    return supercluster.getClusters([-180, -90, 180, 90], zoom).map(c => {
      const [lng, lat] = c.geometry.coordinates
      const isCluster = !!c.properties?.cluster
      return {
        lat, lng, isCluster,
        count: c.properties?.point_count ?? 1,
        clusterId: c.properties?.cluster_id,
        pin: isCluster ? null : c.properties,
        label: isCluster
          ? `${c.properties.point_count} locations`
          : (c.properties?.label ?? '')
      }
    })
  }, [supercluster, zoom])

  // Keep click handler current without recreating HTML elements
  onClickRef.current = useCallback((point) => {
    if (point.isCluster) {
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(point.clusterId) + 1,
        MAX_ZOOM
      )
      globeRef.current?.pointOfView(
        { lat: point.lat, lng: point.lng, altitude: zoomToAlt(expansionZoom, minAltitude) },
        600
      )
    } else {
      onPinClick(point.pin)
    }
  }, [supercluster, onPinClick, minAltitude])

  const handleZoom = useCallback(({ altitude }) => {
    const z = altToZoom(altitude, minAltitude)
    if (z !== zoomRef.current) {
      zoomRef.current = z
      setZoom(z)
    }
  }, [minAltitude])

  // Forward wheel events from pin elements to the WebGL canvas so scroll-to-zoom
  // works even when the cursor is over a pin.
  const forwardWheel = useCallback((e) => {
    const canvas = globeRef.current?.renderer().domElement
    if (!canvas) return
    canvas.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true, deltaX: e.deltaX, deltaY: e.deltaY,
      deltaZ: e.deltaZ, deltaMode: e.deltaMode,
      clientX: e.clientX, clientY: e.clientY
    }))
  }, [])

  // Recreate HTML elements when theme, pin size, or data changes.
  // Click calls onClickRef.current so the element doesn't need recreating on handler changes.
  const htmlElementFn = useCallback((point) => {
    if (point.isCluster) {
      return buildClusterEl(point.count, t.clusterColor, pxWidth, () => onClickRef.current(point), forwardWheel)
    }
    return buildPinEl(t.pinColor, pxWidth, point.label, () => onClickRef.current(point), forwardWheel)
  }, [t, pxWidth, forwardWheel])

  return (
    <GlobeGL
      ref={globeRef}
      globeImageUrl={GLOBE_TEXTURES[settings.theme]}
      backgroundColor="rgba(0,0,0,0)"
      atmosphereColor={t.atmosphereColor}
      atmosphereAltitude={0.12}
      htmlElementsData={pointsData}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={0}
      htmlElement={htmlElementFn}
      onZoom={handleZoom}
    />
  )
}
