import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import GlobeGL from 'react-globe.gl'
import Supercluster from 'supercluster'
import { THEMES, GLOBE_TEXTURES, GLOBE_TEXTURES_LORES } from '../shared/themes'

const MAX_ALT = 3.0
const MAX_ZOOM = 14

const GLOBE_RADIUS = 100        // globe.gl's world-space globe radius
const DEFAULT_ALT = 2.5         // globe.gl's default camera altitude on load
const MAX_ZOOM_OUT_FACTOR = 1.5   // cap zoom-out at this multiple of the default distance

// When the "split overlapping pins" setting is on, this is the "zoom in close enough to
// split" threshold: below it, near-identical GPS points stay merged in a cluster badge;
// past it, supercluster (capped at this maxZoom) yields individual points that
// deOverlapIndividuals then fans apart. Tune to taste.
const SPLIT_ZOOM = 10

// Desired on-screen spacing between fanned pins, as a multiple of pin width. ~1.4
// roughly matches the teardrop height so stacked pins don't cover each other's tips.
const FAN_SPACING = 1.4

function altToZoom(altitude, minAlt) {
  const logRange = Math.log(MAX_ALT / minAlt)
  const logAlt = Math.log(MAX_ALT / Math.max(altitude, minAlt))
  return Math.max(0, Math.min(MAX_ZOOM, Math.round(logAlt / logRange * MAX_ZOOM)))
}

function zoomToAlt(zoom, minAlt) {
  return MAX_ALT * Math.exp(-zoom / MAX_ZOOM * Math.log(MAX_ALT / minAlt))
}

// Module-level cache of fetch+decode promises, keyed by URL. Survives theme switches so
// switching back to a previously-loaded theme is instant with no re-fetch or re-decode.
const bitmapCache = new Map()

function getCachedBitmap(url) {
  if (!bitmapCache.has(url)) {
    bitmapCache.set(url,
      fetch(url)
        .then(r => r.blob())
        // flipY matches what Three.js TextureLoader does for HTMLImageElement sources;
        // ImageBitmap bypasses that internal flip so we pre-flip at decode time instead.
        .then(blob => createImageBitmap(blob, { imageOrientation: 'flipY' }))
    )
  }
  return bitmapCache.get(url)
}

// react-globe.gl doesn't expose the globe material, so reach it through the scene:
// the earth sphere is the only object carrying a texture map.
function findGlobeMaterial(globe) {
  let material = null
  globe.scene().traverse(o => { if (!material && o.material?.map) material = o.material })
  return material
}

// Spread co-located individual points apart in screen space so each stays clickable.
// Pins sharing (or nearly sharing) GPS coords project to the same pixel; we detect
// these collisions on screen, then fan each colliding group into a ring sized so
// neighbours sit ~sepPx apart. Screen offsets are converted back to lat/lng via the
// local screen→geo Jacobian (finite-differenced from the live camera), which accounts
// for latitude compression, camera tilt and rotation. Mutates points[].lat/lng.
function deOverlapIndividuals(points, globe, sepPx) {
  let screen
  try {
    screen = points.map(p => globe.getScreenCoords(p.lat, p.lng, 0))
  } catch {
    return  // globe not ready yet; positions left as-is, recomputed on next zoom tick
  }

  // Bucket onto a sepPx grid — points landing in the same cell collide on screen.
  const buckets = new Map()
  points.forEach((p, i) => {
    const s = screen[i]
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) return
    const key = `${Math.round(s.x / sepPx)},${Math.round(s.y / sepPx)}`
    const b = buckets.get(key)
    if (b) b.push(i)
    else buckets.set(key, [i])
  })

  for (const idx of buckets.values()) {
    if (idx.length < 2) continue
    const n = idx.length
    const lat0 = idx.reduce((s, i) => s + points[i].lat, 0) / n
    const lng0 = idx.reduce((s, i) => s + points[i].lng, 0) / n

    // Finite-difference the screen→geo mapping around the group centre.
    const EPS = 0.005
    const c = globe.getScreenCoords(lat0, lng0, 0)
    const jLat = globe.getScreenCoords(lat0 + EPS, lng0, 0)
    const jLng = globe.getScreenCoords(lat0, lng0 + EPS, 0)
    const dxdLat = (jLat.x - c.x) / EPS, dydLat = (jLat.y - c.y) / EPS
    const dxdLng = (jLng.x - c.x) / EPS, dydLng = (jLng.y - c.y) / EPS
    const det = dxdLat * dydLng - dxdLng * dydLat
    if (!det) continue  // degenerate (point near the horizon); leave it alone

    const rPx = sepPx / (2 * Math.sin(Math.PI / n))  // ring radius giving sepPx chords
    idx.forEach((pi, k) => {
      const theta = (2 * Math.PI * k) / n - Math.PI / 2
      const dx = rPx * Math.cos(theta), dy = rPx * Math.sin(theta)
      // Solve J · [dLat, dLng]ᵀ = [dx, dy]ᵀ to hit the target pixel offset.
      points[pi].lat = lat0 + (dydLng * dx - dxdLng * dy) / det
      points[pi].lng = lng0 + (-dydLat * dx + dxdLat * dy) / det
    })
  }
}

// Globe.gl sets pointer-events:none on its HTML layer so the globe stays interactive;
// every marker re-enables pointer-events so it can be clicked independently. Wheel
// events are forwarded to the canvas (via onWheel) so scroll-zoom works over a marker.
function buildMarkerEl({ html, transform, title, onClick, onWheel }) {
  const el = document.createElement('div')
  el.title = title
  el.style.cssText = 'cursor:pointer; user-select:none; display:inline-block; pointer-events:auto;'
  el.style.transform = transform
  el.innerHTML = html
  el.addEventListener('click', e => { e.stopPropagation(); onClick() })
  el.addEventListener('wheel', e => { e.preventDefault(); onWheel(e) }, { passive: false })
  return el
}

// SVG map-pin teardrop, anchored at its bottom tip to the lat/lng point
function buildPinEl(color, pxWidth, label, onClick, onWheel) {
  const h = Math.round(pxWidth * 1.45)
  return buildMarkerEl({
    title: label,
    transform: 'translate(-50%, -100%)',
    onClick, onWheel,
    html: `
      <svg width="${pxWidth}" height="${h}" viewBox="0 0 40 58"
           style="display:block; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
        <path d="M20 0C9 0 0 9 0 20C0 35 20 58 20 58C20 58 40 35 40 20C40 9 31 0 20 0Z"
              fill="${color}"/>
        <circle cx="20" cy="20" r="8" fill="rgba(255,255,255,0.7)"/>
      </svg>`
  })
}

// Circular cluster badge showing the contained-point count
function buildClusterEl(count, color, pxBase, onClick, onWheel) {
  const s = Math.round(Math.min(pxBase * 1.9, pxBase + Math.log2(count) * pxBase * 0.28))
  return buildMarkerEl({
    title: `${count} locations`,
    transform: 'translate(-50%, -50%)',
    onClick, onWheel,
    html: `
      <div style="
        width:${s}px; height:${s}px; border-radius:50%;
        background:${color}; opacity:0.7; border:2.5px solid rgba(255,255,255,0.6);
        display:flex; align-items:center; justify-content:center;
        color:#fff; font-size:${Math.round(s * 0.36)}px;
        font-family:system-ui,sans-serif; font-weight:600; letter-spacing:-0.02em;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);">${count}</div>`
  })
}

export default function Globe({ pins, activeLayers, onPinClick, settings, categoryColors, flyToRef }) {
  const globeRef = useRef()
  const containerRef = useRef()
  // Fixed at mount — never passed as a changing prop so globe.gl's TextureLoader
  // only runs once and can't race-overwrite our hi-res swaps on theme changes.
  const seedGlobeImageRef = useRef(GLOBE_TEXTURES_LORES[settings.theme])
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  const [dims, setDims] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [hiResLoaded, setHiResLoaded] = useState(false)
  // Tracks whether the globe has fired its first onZoom, meaning the camera has settled
  // and getScreenCoords returns valid values. deOverlapIndividuals is skipped until then.
  const globeReadyRef = useRef(false)

  // Stable ref so HTML element click handlers always call the current handler
  // without needing to recreate the DOM elements every render
  const onClickRef = useRef()

  const t = THEMES[settings.theme]
  const { theme, minAltitude, clusterRadius, pinSize, splitPins } = settings
  const pxWidth = Math.round(pinSize * 28)

  // Pre-fetch and decode all theme bitmaps in the background so switches are instant.
  useEffect(() => {
    Object.values(GLOBE_TEXTURES_LORES).forEach(url => getCachedBitmap(url))
    Object.values(GLOBE_TEXTURES).forEach(url => getCachedBitmap(url))
  }, [])

  // Unified texture sequence: apply lo-res first (fast), then hi-res.
  // We own all material updates — globe.gl's TextureLoader only runs once (seed URL on
  // mount) and is never triggered again, so it cannot overwrite a hi-res swap.
  useEffect(() => {
    setHiResLoaded(false)
    let cancelled = false

    const applyBitmap = (bitmap) => {
      const globe = globeRef.current
      if (!globe) return false
      const material = findGlobeMaterial(globe)
      if (!material?.map) return false
      // three.js allocates immutable GPU storage per texture; replace the object entirely.
      const oldMap = material.map
      const texture = new oldMap.constructor(bitmap)
      texture.colorSpace = oldMap.colorSpace
      texture.wrapS = oldMap.wrapS
      texture.wrapT = oldMap.wrapT
      texture.minFilter = oldMap.minFilter
      texture.magFilter = oldMap.magFilter
      texture.anisotropy = oldMap.anisotropy
      texture.needsUpdate = true
      material.map = texture
      material.needsUpdate = true
      oldMap.dispose()
      return true
    }

    // Retry until the material exists — on initial mount globe.gl may not have finished
    // loading the seed globeImageUrl yet when this effect first fires.
    const applyWhenReady = (bitmap, onDone, retries = 30) => {
      if (cancelled) return
      if (!applyBitmap(bitmap)) {
        if (retries > 0) setTimeout(() => applyWhenReady(bitmap, onDone, retries - 1), 100)
        return
      }
      onDone?.()
    }

    getCachedBitmap(GLOBE_TEXTURES_LORES[theme]).then(loBitmap => {
      if (cancelled) return
      applyWhenReady(loBitmap, () => {
        if (cancelled) return
        getCachedBitmap(GLOBE_TEXTURES[theme]).then(hiBitmap => {
          if (cancelled) return
          applyWhenReady(hiBitmap, () => { if (!cancelled) setHiResLoaded(true) })
        }).catch(() => {})
      })
    }).catch(() => {})

    return () => { cancelled = true }
  }, [theme])
  // clusterRadius is 1–100 density scale; maps to supercluster's zoom-0 pixel radius
  const clusterRadiusPx = clusterRadius * 0.5

  // Render at the display's full physical resolution
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    globe.renderer().setPixelRatio(window.devicePixelRatio)
  }, [])

  // Expose a flyTo(lat, lng) function to the parent via ref, preserving current altitude
  useEffect(() => {
    if (!flyToRef) return
    flyToRef.current = (lat, lng) => {
      const globe = globeRef.current
      if (!globe) return
      const { altitude } = globe.pointOfView()
      globe.pointOfView({ lat, lng, altitude }, 800)
    }
  }, [flyToRef])

  // Keep the globe filling its container when the window is resized
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const controls = globe.controls()
    controls.minDistance = GLOBE_RADIUS * (1 + minAltitude)
    // Cap how far the camera can pull back: 2× the default load distance.
    controls.maxDistance = MAX_ZOOM_OUT_FACTOR * GLOBE_RADIUS * (1 + DEFAULT_ALT)
  }, [minAltitude])

  // Cluster on the pins' true coordinates — overlap is resolved later in screen space
  // (deOverlapIndividuals) rather than by pre-shifting coordinates.
  const filteredPins = useMemo(
    () => pins.filter(p => activeLayers.has(p.category)),
    [pins, activeLayers]
  )

  const supercluster = useMemo(() => {
    if (!filteredPins.length) return null
    // When splitting is on we cap clustering at SPLIT_ZOOM so that, once the user zooms
    // past it, getClusters returns raw individual points — co-located pins never separate
    // by pixel distance, so this is the only way they can surface to be fanned apart.
    const sc = new Supercluster({
      radius: clusterRadiusPx,
      maxZoom: splitPins ? SPLIT_ZOOM : MAX_ZOOM
    })
    sc.load(filteredPins.map(pin => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: pin
    })))
    return sc
  }, [filteredPins, clusterRadiusPx, splitPins])

  const pointsData = useMemo(() => {
    if (!supercluster) return []
    const clusters = []
    const individuals = []
    for (const c of supercluster.getClusters([-180, -90, 180, 90], zoom)) {
      const [lng, lat] = c.geometry.coordinates
      if (c.properties?.cluster) {
        clusters.push({
          lat, lng, isCluster: true,
          count: c.properties.point_count,
          clusterId: c.properties.cluster_id
        })
      } else {
        individuals.push({
          lat, lng, isCluster: false,
          pin: c.properties,
          label: c.properties?.label ?? ''
        })
      }
    }
    // Fan apart individual pins that collide on screen (e.g. near-identical GPS coords).
    // Guard on globeReadyRef: before the first onZoom the camera hasn't settled, so
    // getScreenCoords returns bad values without throwing, causing wrong pin positions.
    const globe = globeRef.current
    if (splitPins && globeReadyRef.current && globe && individuals.length > 1) {
      deOverlapIndividuals(individuals, globe, pxWidth * FAN_SPACING)
    }
    return [...clusters, ...individuals]
  }, [supercluster, zoom, pxWidth, splitPins])

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
    globeReadyRef.current = true
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
    const color = categoryColors?.get(point.pin?.category) ?? t.pinColor
    return buildPinEl(color, pxWidth, point.label, () => onClickRef.current(point), forwardWheel)
  }, [t, pxWidth, forwardWheel, categoryColors])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GlobeGL
        ref={globeRef}
        width={dims.width}
        height={dims.height}
        globeImageUrl={seedGlobeImageRef.current}
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
      {!hiResLoaded && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          color: t.textDim, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
          fontFamily: 'system-ui, sans-serif', pointerEvents: 'none',
          animation: 'atlas-overlay-in 1s ease-out both'
        }}>
          Loading high-res textures
        </div>
      )}
    </div>
  )
}
