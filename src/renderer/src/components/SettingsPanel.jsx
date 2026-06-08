import { useState } from 'react'
import { THEMES } from '../shared/themes'
import { DEFAULT_SETTINGS } from '../hooks/useSettings'

// Globe altitude is stored as a fraction of the globe radius; the radius represents
// Earth's mean radius, so multiplying by this gives the camera height above the surface.
const EARTH_RADIUS_KM = 6371

// ── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ value, onChange, t }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 22, borderRadius: 11,
        background: value ? t.accent : t.inputBg,
        border: `1px solid ${value ? t.accent : t.inputBorder}`,
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s, border-color 0.2s', flexShrink: 0
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: value ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }} />
    </button>
  )
}

function Row({ label, children, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '10px 0', borderBottom: `1px solid ${t.panelBorder}` }}>
      <span style={{ fontSize: 12, letterSpacing: '0.06em', color: t.text,
                     fontFamily: 'system-ui, sans-serif' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function SliderSetting({ label, value, min, max, step, onChange, hint, unit, t }) {
  const handleSlider = (e) => onChange(parseFloat(e.target.value))
  const handleNumber = (e) => {
    const v = parseFloat(e.target.value)
    if (!isNaN(v) && v >= min && v <= max) onChange(v)
  }
  const unitSuffix = unit ? ` ${unit}` : ''

  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${t.panelBorder}` }}>
      <span style={{ fontSize: 12, letterSpacing: '0.06em', color: t.text,
                     fontFamily: 'system-ui, sans-serif', display: 'block', marginBottom: 8 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={handleSlider}
          style={{ flex: 1, accentColor: t.accent, cursor: 'pointer' }}
        />
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={handleNumber}
          style={{
            width: 64, padding: '3px 6px', borderRadius: 3, fontSize: 11,
            background: t.inputBg, border: `1px solid ${t.inputBorder}`,
            color: t.text, textAlign: 'right', fontFamily: 'system-ui, sans-serif'
          }}
        />
        {unit && (
          <span style={{ fontSize: 11, color: t.textDim,
                         fontFamily: 'system-ui, sans-serif' }}>{unit}</span>
        )}
      </div>
      <p style={{ margin: '5px 0 0', fontSize: 10, color: t.textDim,
                  fontFamily: 'system-ui, sans-serif', lineHeight: 1.4 }}>
        {hint} · Range: {min} – {max}{unitSuffix}
      </p>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function SettingsPanel({ settings, updateSetting, resetSettings, onRescan, scanning, scanProgress, onClose }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const t = THEMES[settings.theme]

  return (
    <div style={{ ...styles.panel, background: t.panelBg, borderColor: t.panelBorder }}>

      {/* Header */}
      <div style={{ ...styles.header, borderColor: t.panelBorder }}>
        <span style={{ ...styles.headerLabel, color: t.textDim }}>SETTINGS</span>
        <button style={{ ...styles.closeBtn, color: t.textDim }} onClick={onClose}>✕</button>
      </div>

      <div style={styles.body}>
        {/* Theme */}
        <Row label="Theme" t={t}>
          <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden',
                        border: `1px solid ${t.inputBorder}` }}>
            {['light', 'dark'].map(opt => (
              <button
                key={opt}
                onClick={() => updateSetting('theme', opt)}
                style={{
                  padding: '4px 12px', border: 'none', cursor: 'pointer',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: 'system-ui, sans-serif',
                  background: settings.theme === opt ? t.accent : t.inputBg,
                  color: settings.theme === opt ? '#fff' : t.textDim,
                  transition: 'background 0.15s, color 0.15s'
                }}
              >{opt}</button>
            ))}
          </div>
        </Row>

        <Row label="Cycle media by" t={t}>
          <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden',
                        border: `1px solid ${t.inputBorder}` }}>
            {['date', 'name'].map(opt => (
              <button key={opt} onClick={() => updateSetting('cycleSort', opt)}
                style={{
                  padding: '4px 12px', border: 'none', cursor: 'pointer',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: 'system-ui, sans-serif',
                  background: settings.cycleSort === opt ? t.accent : t.inputBg,
                  color: settings.cycleSort === opt ? '#fff' : t.textDim,
                  transition: 'background 0.15s, color 0.15s'
                }}
              >{opt}</button>
            ))}
          </div>
        </Row>

        <Row label="Cycle scope" t={t}>
          <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden',
                        border: `1px solid ${t.inputBorder}` }}>
            {['category', 'all'].map(opt => (
              <button key={opt} onClick={() => updateSetting('cycleScope', opt)}
                style={{
                  padding: '4px 12px', border: 'none', cursor: 'pointer',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: 'system-ui, sans-serif',
                  background: settings.cycleScope === opt ? t.accent : t.inputBg,
                  color: settings.cycleScope === opt ? '#fff' : t.textDim,
                  transition: 'background 0.15s, color 0.15s'
                }}
              >{opt}</button>
            ))}
          </div>
        </Row>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          style={{ ...styles.advancedToggle, color: t.textDim, borderColor: t.panelBorder }}
        >
          <span style={{ letterSpacing: '0.2em' }}>ADVANCED</span>
          <span style={{ transition: 'transform 0.2s',
                         display: 'inline-block',
                         transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                         fontSize: 30 }}>
            ▾
          </span>
        </button>

        {showAdvanced && (
          <>
            {/* Date filter */}
            <div style={{ padding: '10px 0', borderBottom: `1px solid ${t.panelBorder}` }}>
              <span style={{ fontSize: 12, letterSpacing: '0.06em', color: t.text,
                             fontFamily: 'system-ui, sans-serif', display: 'block', marginBottom: 8 }}>
                Date filter
              </span>
              {[['From', 'dateFrom'], ['To', 'dateTo']].map(([label, key]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: t.textDim, width: 28, flexShrink: 0,
                                 fontFamily: 'system-ui, sans-serif', letterSpacing: '0.05em' }}>
                    {label}
                  </span>
                  <input
                    type="date"
                    value={settings[key] ?? ''}
                    onChange={e => updateSetting(key, e.target.value || null)}
                    style={{ flex: 1, padding: '3px 6px', borderRadius: 3, fontSize: 11,
                             background: t.inputBg, border: `1px solid ${t.inputBorder}`,
                             color: t.text, fontFamily: 'system-ui, sans-serif',
                             colorScheme: settings.theme === 'dark' ? 'dark' : 'light' }}
                  />
                  {settings[key] && (
                    <button
                      onClick={() => updateSetting(key, null)}
                      style={{ background: 'none', border: 'none', color: t.textDim,
                               cursor: 'pointer', fontSize: 12, padding: 2, lineHeight: 1 }}
                    >✕</button>
                  )}
                </div>
              ))}
              <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textDim,
                          fontFamily: 'system-ui, sans-serif' }}>
                {!settings.dateFrom && !settings.dateTo
                  ? 'All dates included'
                  : 'Applied on next rescan'}
              </p>
            </div>

            <Row label="Start videos muted" t={t}>
              <Toggle
                value={settings.startMuted}
                onChange={v => updateSetting('startMuted', v)}
                t={t}
              />
            </Row>

            <Row label="Loop videos" t={t}>
              <Toggle
                value={settings.loopVideo}
                onChange={v => updateSetting('loopVideo', v)}
                t={t}
              />
            </Row>

            <Row label="Split overlapping pins" t={t}>
              <Toggle
                value={settings.splitPins}
                onChange={v => updateSetting('splitPins', v)}
                t={t}
              />
            </Row>

            <SliderSetting
              label="Pin size"
              value={settings.pinSize}
              min={0.3} max={2.5} step={0.05}
              onChange={v => updateSetting('pinSize', v)}
              hint="Screen size of map pins. 1.0 = 28px wide teardrop. Does not change with zoom level."
              t={t}
            />

            <SliderSetting
              label="Min zoom altitude"
              value={Math.round(settings.minAltitude * EARTH_RADIUS_KM)}
              min={50} max={3000} step={10}
              onChange={km => updateSetting('minAltitude', km / EARTH_RADIUS_KM)}
              hint="Closest the camera can get to the surface. Lower = zoom in further."
              unit="km"
              t={t}
            />

            <SliderSetting
              label="Cluster density"
              value={settings.clusterRadius}
              min={1} max={100} step={1}
              onChange={v => updateSetting('clusterRadius', v)}
              hint="How aggressively nearby pins merge into clusters. Clustering naturally reduces as you zoom in — this is not a fixed distance."
              t={t}
            />
          </>
        )}

        {/* Rescan / Reset */}
        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onRescan}
            disabled={scanning}
            style={{ ...styles.resetBtn, color: t.accent, borderColor: t.accent,
                     position: 'relative', overflow: 'hidden',
                     cursor: scanning ? 'default' : 'pointer' }}
          >
            {scanning && (
              <span style={{
                position: 'absolute', inset: 0,
                background: t.accent, opacity: 0.2,
                width: scanProgress ? `${(scanProgress.current / scanProgress.total) * 100}%` : '0%',
                transition: 'width 0.1s linear'
              }} />
            )}
            <span style={{ position: 'relative' }}>
              {scanning ? 'SCANNING…' : 'RESCAN MEDIA'}
            </span>
          </button>
          <button
            onClick={resetSettings}
            style={{ ...styles.resetBtn, color: t.danger, borderColor: t.danger }}
          >
            RESET TO DEFAULTS
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 300,
    height: '100vh',
    border: '0 0 0 1px',
    borderLeft: '1px solid',
    borderColor: 'transparent',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
    borderBottom: '1px solid'
  },
  headerLabel: {
    fontSize: 9,
    letterSpacing: '0.35em',
    fontFamily: 'system-ui, sans-serif'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 4
  },
  body: {
    padding: '8px 20px 24px'
  },
  advancedToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid',
    padding: '12px 0',
    fontSize: 9,
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer',
    marginTop: 4
  },
  resetBtn: {
    width: '100%',
    background: 'none',
    border: '1px solid',
    borderRadius: 3,
    padding: '8px 0',
    fontSize: 10,
    letterSpacing: '0.2em',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer'
  }
}
