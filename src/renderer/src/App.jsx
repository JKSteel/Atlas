import { useState, useEffect, useMemo } from 'react'
import Globe from './components/Globe'
import MediaPanel from './components/MediaPanel'
import LayerControls from './components/LayerControls'
import SettingsPanel from './components/SettingsPanel'
import { useSettings } from './hooks/useSettings'
import { THEMES } from './shared/themes'

export default function App() {
  const { settings, updateSetting, resetSettings } = useSettings()
  const [pins, setPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [activeLayers, setActiveLayers] = useState(new Set())
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

  const toggleLayer = (category) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: t.appBackground }}>
      <Globe
        pins={pins}
        activeLayers={activeLayers}
        onPinClick={setSelectedPin}
        settings={settings}
      />

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

      {selectedPin && (
        <MediaPanel
          pin={selectedPin}
          settings={settings}
          onClose={() => setSelectedPin(null)}
        />
      )}

      {categories.length > 0 && (
        <LayerControls
          categories={categories}
          activeLayers={activeLayers}
          onToggle={toggleLayer}
          settings={settings}
        />
      )}
    </div>
  )
}
