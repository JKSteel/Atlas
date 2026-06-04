import { useState, useEffect } from 'react'

export const DEFAULT_SETTINGS = {
  theme: 'light',
  startMuted: false,
  loopVideo: true,
  pinSize: 1.0,        // base pin width in screen pixels × 28 (0.3 – 2.5)
  minAltitude: 0.02,   // fraction of globe radius (0.01 – 0.5)
  clusterRadius: 40,   // cluster density 1–100
  splitPins: false,    // fan apart co-located pins when zoomed in close
  dateFrom: null,      // ISO date string YYYY-MM-DD or null (no lower bound)
  dateTo: null         // ISO date string YYYY-MM-DD or null (no upper bound)
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load persisted settings from userData on mount
  useEffect(() => {
    window.api.getSettings().then(stored => {
      setSettings({ ...DEFAULT_SETTINGS, ...stored })
      setLoaded(true)
    })
  }, [])

  // Persist to userData whenever settings change (but not on initial load)
  useEffect(() => {
    if (!loaded) return
    window.api.saveSettings(settings)
  }, [settings, loaded])

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const resetSettings = () => setSettings(DEFAULT_SETTINGS)

  return { settings, updateSetting, resetSettings }
}
