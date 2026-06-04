import { useRef, useEffect, useCallback } from 'react'
import { THEMES } from '../shared/themes'

export default function MediaPanel({ pin, settings, categoryColors, onClose }) {
  const videoRef = useRef()
  const t = THEMES[settings.theme]
  const categoryColor = categoryColors?.get(pin?.category) ?? t.accent
  const isVideo = !!pin?.videoPath
  const photoSrc = !isVideo && pin?.photos?.length ? `atlas://${pin.photos[0]}` : null

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const playWhenReady = () => {
      video.muted = settings.startMuted
      video.play().catch(() => {})
    }
    video.addEventListener('loadedmetadata', playWhenReady, { once: true })
    video.load()
    return () => video.removeEventListener('loadedmetadata', playWhenReady)
  }, [pin?.videoPath, settings.startMuted])

  const handleEnded = useCallback(() => {
    const video = videoRef.current
    if (video && settings.loopVideo) {
      video.currentTime = 0
      video.play().catch(() => {})
    }
  }, [settings.loopVideo])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (video) video.muted = !video.muted
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div style={{ ...styles.overlay, background: t.overlayBg }} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>

        <div style={styles.mediaWrapper}>
          {isVideo ? (
            <video
              ref={videoRef}
              src={`atlas://${pin.videoPath}`}
              loop={settings.loopVideo}
              style={styles.media}
              onEnded={handleEnded}
            />
          ) : photoSrc ? (
            <img src={photoSrc} style={styles.media} alt={pin?.label} />
          ) : null}
        </div>

        <div style={{ ...styles.footer, background: t.panelBg, borderTop: `1px solid ${t.panelBorder}` }}>
          <span style={{ ...styles.label, color: t.text }}>{pin?.label}</span>
          <span style={{ ...styles.category, color: categoryColor }}>{pin?.category}</span>
        </div>

        {isVideo && (
          <button style={{ ...styles.muteBtn, color: t.textDim }} onClick={toggleMute}>
            MUTE
          </button>
        )}
        <button style={{ ...styles.close, color: t.textDim }} onClick={onClose}>✕</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    animation: 'atlas-overlay-in 0.35s ease-out both'
  },
  panel: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: '80vw', maxHeight: '82vh',
    animation: 'atlas-panel-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both'
  },
  mediaWrapper: {
    background: '#000',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  media: {
    display: 'block', maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain'
  },
  footer: {
    width: '100%',
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '10px 14px 12px', gap: 16
  },
  label: {
    fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif'
  },
  category: {
    fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif', opacity: 0.8
  },
  muteBtn: {
    position: 'absolute', top: -32, right: 36,
    background: 'none', border: 'none',
    fontSize: 10, letterSpacing: '0.12em',
    cursor: 'pointer', padding: 4, fontFamily: 'system-ui, sans-serif'
  },
  close: {
    position: 'absolute', top: -36, right: 0,
    background: 'none', border: 'none',
    fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4
  }
}
