import { useRef, useEffect, useCallback, useState } from 'react'
import { THEMES } from '../shared/themes'
import COUNTRY_NAMES from '../shared/countries'

// ── Icons ────────────────────────────────────────────────────────────────────

function IconSpeaker() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  )
}

function IconSpeakerMuted() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate) {
  if (!isoDate) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  const suffix = (d === 11 || d === 12 || d === 13) ? 'th'
    : d % 10 === 1 ? 'st'
    : d % 10 === 2 ? 'nd'
    : d % 10 === 3 ? 'rd' : 'th'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d}${suffix} ${months[m - 1]} ${y}`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MediaPanel({ pin, isClosing, categoryPins, settings, categoryColors, onNavigate, onClose }) {
  const videoRef = useRef()
  const t = THEMES[settings.theme]
  const categoryColor = categoryColors?.get(pin?.category) ?? t.accent
  const isVideo = !!pin?.videoPath
  const photoSrc = !isVideo && pin?.photos?.length ? `atlas://${pin.photos[0]}` : null

  const [muted, setMuted] = useState(settings.startMuted)
  const [progress, setProgress] = useState(0)

  // Zoom / pan
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const mediaZoomRef = useRef()
  const panStartRef = useRef(null)

  useEffect(() => { setZoom({ scale: 1, x: 0, y: 0 }) }, [pin?.id])

  // Video: play on load, sync muted state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const playWhenReady = () => {
      video.muted = settings.startMuted
      setMuted(settings.startMuted)
      video.play().catch(() => {})
    }
    video.addEventListener('loadedmetadata', playWhenReady, { once: true })
    video.load()
    return () => video.removeEventListener('loadedmetadata', playWhenReady)
  }, [pin?.videoPath, settings.startMuted])

  // Progress bar
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => { if (video.duration) setProgress(video.currentTime / video.duration) }
    const onEnded = () => setProgress(1)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    return () => { video.removeEventListener('timeupdate', onTimeUpdate); video.removeEventListener('ended', onEnded) }
  }, [pin?.videoPath])

  const handleEnded = useCallback(() => {
    const video = videoRef.current
    if (video && settings.loopVideo) {
      video.currentTime = 0
      video.play().catch(() => {})
    }
  }, [settings.loopVideo])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setMuted(next)
  }, [])

  // Clamp offset so the media edge never scrolls past the container edge
  const clampOffset = useCallback((x, y, scale) => {
    const el = mediaZoomRef.current
    if (!el) return { x, y }
    const maxX = (el.clientWidth * (scale - 1)) / 2
    const maxY = (el.clientHeight * (scale - 1)) / 2
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) }
  }, [])

  // Wheel zoom (non-passive so we can preventDefault)
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const el = mediaZoomRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setZoom(prev => {
      const nextScale = Math.max(1, Math.min(6, prev.scale * factor))
      if (nextScale === 1) return { scale: 1, x: 0, y: 0 }
      const ratio = nextScale / prev.scale
      const raw = { x: cx * (1 - ratio) + prev.x * ratio, y: cy * (1 - ratio) + prev.y * ratio }
      return { scale: nextScale, ...clampOffset(raw.x, raw.y, nextScale) }
    })
  }, [clampOffset])

  useEffect(() => {
    const el = mediaZoomRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Pan via mouse drag when zoomed in
  const handleMouseDown = useCallback((e) => {
    if (zoom.scale <= 1) return
    e.preventDefault()
    setIsPanning(true)
    panStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, x: zoom.x, y: zoom.y }
  }, [zoom])

  useEffect(() => {
    if (!isPanning) return
    const onMove = (e) => {
      if (!panStartRef.current) return
      const { mouseX, mouseY, x, y } = panStartRef.current
      setZoom(prev => ({ ...prev, ...clampOffset(x + (e.clientX - mouseX), y + (e.clientY - mouseY), prev.scale) }))
    }
    const onUp = () => setIsPanning(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isPanning, clampOffset])

  // Prev / next within category
  const currentIdx = categoryPins?.findIndex(p => p.id === pin?.id) ?? -1
  const canCycle = !isClosing && categoryPins?.length > 1

  const navPrevRef = useRef()
  const navNextRef = useRef()
  navPrevRef.current = () => {
    if (!canCycle) return
    const idx = (currentIdx - 1 + categoryPins.length) % categoryPins.length
    onNavigate(categoryPins[idx])
  }
  navNextRef.current = () => {
    if (!canCycle) return
    const idx = (currentIdx + 1) % categoryPins.length
    onNavigate(categoryPins[idx])
  }

  // Keyboard: Escape closes, arrows cycle
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') navPrevRef.current()
      if (e.key === 'ArrowRight') navNextRef.current()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Centre footer: "City, Country — 19th Jan 2026"
  const countryName = pin?.country ? (COUNTRY_NAMES[pin.country] ?? pin.country) : null
  const location = [pin?.city, countryName].filter(Boolean).join(', ')
  const datePart = formatDate(pin?.date)
  const footerDetail = [location, datePart].filter(Boolean).join(' — ')

  const overlayAnim = isClosing
    ? 'atlas-overlay-out 0.38s ease-in both'
    : 'atlas-overlay-in 0.35s ease-out both'
  const panelAnim = isClosing
    ? 'atlas-panel-out 0.32s ease-in both'
    : 'atlas-panel-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both'

  return (
    <div style={{ ...styles.overlay, background: t.overlayBg, animation: overlayAnim }}
         onClick={onClose}>
      <div style={{ ...styles.panel, animation: panelAnim }}
           onClick={e => e.stopPropagation()}>

        {/* Media + nav arrows */}
        <div style={{ position: 'relative' }}>
          <div ref={mediaZoomRef} style={{ ...styles.mediaWrapper, overflow: 'hidden' }}>
            <div
              style={{
                transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                transformOrigin: 'center center',
                cursor: zoom.scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                userSelect: 'none',
              }}
              onMouseDown={handleMouseDown}
            >
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={`atlas://${pin.videoPath}`}
                  style={styles.media}
                  onEnded={handleEnded}
                />
              ) : photoSrc ? (
                <img src={photoSrc} style={styles.media} alt={pin?.label} draggable="false" />
              ) : null}
            </div>
            {isVideo && (
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
              </div>
            )}
          </div>

          {canCycle && (
            <>
              <button style={{ ...styles.navBtn, left: -48 }}
                      onClick={() => navPrevRef.current()}
                      title="Previous">
                <IconChevronLeft />
              </button>
              <button style={{ ...styles.navBtn, right: -48 }}
                      onClick={() => navNextRef.current()}
                      title="Next">
                <IconChevronRight />
              </button>
            </>
          )}
        </div>

        {/* Footer — single row: filename | location & date | category */}
        <div style={{ ...styles.footer, background: t.panelBg, borderTop: `1px solid ${t.panelBorder}` }}>
          <span style={{ ...styles.label, color: t.text }}>{pin?.label}</span>
          <span style={{ ...styles.footerDetail, color: t.textDim }}>{footerDetail}</span>
          <span style={{ ...styles.category, color: categoryColor }}>{pin?.category}</span>
        </div>

        {/* Controls above panel */}
        {isVideo && (
          <button style={{ ...styles.iconBtn, color: t.textDim }} onClick={toggleMute}
                  title={muted ? 'Unmute' : 'Mute'}>
            {muted ? <IconSpeakerMuted /> : <IconSpeaker />}
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
  },
  panel: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: '80vw', maxHeight: '82vh',
  },
  mediaWrapper: {
    background: '#000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  media: {
    display: 'block', maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain'
  },
  progressTrack: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, background: 'rgba(255,255,255,0.12)'
  },
  progressFill: {
    height: '100%', background: 'rgba(255,255,255,0.45)',
    transition: 'width 0.25s linear'
  },
  navBtn: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
    width: 36, height: 36, cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
  },
  footer: {
    width: '100%',
    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'baseline', gap: '0 12px',
    padding: '10px 14px 12px',
  },
  footerDetail: {
    fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center', whiteSpace: 'nowrap',
  },
  label: {
    fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  category: {
    fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif', opacity: 0.8,
    textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  iconBtn: {
    position: 'absolute', top: -34, right: 36,
    background: 'none', border: 'none',
    cursor: 'pointer', padding: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  close: {
    position: 'absolute', top: -36, right: 0,
    background: 'none', border: 'none',
    fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4
  }
}
