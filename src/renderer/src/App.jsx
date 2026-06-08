import { useState, useEffect, useMemo, useRef } from 'react'
import Globe from './components/Globe'
import MediaPanel from './components/MediaPanel'
import LayerControls from './components/LayerControls'
import SettingsPanel from './components/SettingsPanel'
import { useSettings } from './hooks/useSettings'
import { THEMES, GRAIN_TEXTURE } from './shared/themes'

export default function App() {
  const { settings, updateSetting, resetSettings } = useSettings()
  const [pins, setPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [closingPin, setClosingPin] = useState(null)
  const [activeLayers, setActiveLayers] = useState(new Set())
  const globeFlyRef = useRef()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const t = THEMES[settings.theme]

  const loadPins = () => {
    window.api.getPins().then(data => {
      setPins(data)
      setActiveLayers(new Set(data.map(p => p.category).filter(Boolean)))
    })
  }

  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(null)

  const rescan = () => {
    setScanning(true)
    setScanProgress(null)
    window.api.scanMedia(settings.dateFrom, settings.dateTo).then(() => {
      loadPins()
      setScanning(false)
      setScanProgress(null)
    })
  }

  useEffect(() => {
    loadPins()
    window.api.onScanComplete(loadPins)
    window.api.onScanProgress(setScanProgress)
  }, [])

  const categories = useMemo(
    () => [...new Set(pins.map(p => p.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [pins]
  )

  // Stable category → colour map (assigned by sorted order) shared by the globe pins,
  // the layer index, and the media panel so a category reads the same colour everywhere.
  const categoryColors = useMemo(() => {
    const palette = t.categoryPalette
    const map = new Map()
    categories.forEach((c, i) => map.set(c, palette[i % palette.length]))
    return map
  }, [categories, t])

  // Sorted pins for prev/next cycling — either within the open pin's category or across
  // all active layers, depending on the cycleScope setting.
  const categoryPins = useMemo(() => {
    const pin = selectedPin ?? closingPin
    if (!pin) return []
    const pool = settings.cycleScope === 'all'
      ? pins.filter(p => activeLayers.has(p.category))
      : pins.filter(p => p.category === pin.category)
    return pool.sort((a, b) => {
      if (settings.cycleSort === 'date') {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date.localeCompare(b.date)
      }
      return (a.label ?? '').localeCompare(b.label ?? '', undefined, { sensitivity: 'base' })
    })
  }, [selectedPin?.id, closingPin?.id, pins, activeLayers, settings.cycleSort, settings.cycleScope])

  const handleNavigate = (pin) => {
    setSelectedPin(pin)
    setClosingPin(null)
    globeFlyRef.current?.(pin.lat, pin.lng)
  }

  const toggleLayer = (category) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: t.appBackground }}>
      {/* Film-grain overlay — sits behind the globe so it only textures the empty canvas */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: GRAIN_TEXTURE, backgroundSize: '180px 180px',
        opacity: t.grainOpacity, mixBlendMode: t.grainBlend
      }} />

      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Globe
          pins={pins}
          activeLayers={activeLayers}
          onPinClick={setSelectedPin}
          settings={settings}
          categoryColors={categoryColors}
          flyToRef={globeFlyRef}
        />
      </div>

      {/* Settings button — top right */}
      <button
        onClick={() => setSettingsOpen(v => !v)}
        style={{
          position: 'fixed', top: 24, right: 24, zIndex: 400,
          background: t.panelBg, border: `1px solid ${t.panelBorder}`,
          borderRadius: 3, padding: '7px 14px',
          color: t.textDim, fontSize: 9, letterSpacing: '0.3em',
          textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
          cursor: 'pointer', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        Settings
      </button>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          resetSettings={resetSettings}
          onRescan={rescan}
          scanning={scanning}
          scanProgress={scanProgress}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {(selectedPin || closingPin) && (
        <MediaPanel
          pin={selectedPin ?? closingPin}
          isClosing={!selectedPin && !!closingPin}
          categoryPins={categoryPins}
          settings={settings}
          categoryColors={categoryColors}
          onNavigate={handleNavigate}
          onClose={() => {
            setClosingPin(selectedPin)
            setSelectedPin(null)
            setTimeout(() => setClosingPin(null), 380)
          }}
        />
      )}

      {categories.length > 0 && (
        <LayerControls
          categories={categories}
          activeLayers={activeLayers}
          onToggle={toggleLayer}
          settings={settings}
          categoryColors={categoryColors}
        />
      )}
    </div>
  )
}
