// NASA textures — served by Vite's static server (assets/ → public root).
// Low-res loads fast for first paint; high-res is swapped in once it finishes loading
// in the background (see Globe.jsx). Keep both maps keyed identically by theme.
export const GLOBE_TEXTURES_LORES = {
  dark:  '/textures/earth-night-4k.jpg',
  light: '/textures/earth-day-4k.jpg'
}

export const GLOBE_TEXTURES = {
  dark:  '/textures/earth-night-8k.jpg',
  light: '/textures/earth-day-8k-scaled.jpg'
}

// Tileable film grain (SVG fractal noise) laid over the background for subtle texture.
// Inlined as a data URI so there's no asset to ship; blended via mix-blend-mode in App.
export const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export const THEMES = {
  dark: {
    // App canvas (the "space" around the globe). Layered: a soft vignette over a faint
    // radial lift in the centre, giving the void some depth instead of a flat fill.
    appBackground:
      'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%),' +
      'radial-gradient(ellipse at center, #121a30 0%, #0a0e1a 70%)',
    grainOpacity: 0.22,
    grainBlend: 'overlay',

    // Globe atmosphere glow
    atmosphereColor: '#c87941',

    // Pin colours
    pinColor:     '#f0a830',
    clusterColor: '#6e8fad',  // cool steel-blue — distinct from the warm amber/orange palette

    // Per-category pin colours (assigned by category order). Vivid for the navy canvas.
    categoryPalette: ['#f0a830', '#e8745b', '#f2c14e', '#5fb0d8',
                      '#6fcf97', '#b08fe0', '#e07a9c', '#9ccc65'],

    // Full-screen overlays (MediaPanel, SettingsPanel backdrop)
    overlayBg: 'rgb(10, 14, 26)',

    // Card / panel surfaces
    panelBg:     'rgba(14, 20, 34, 0.92)',
    panelBorder: 'rgba(255, 255, 255, 0.08)',

    // Typography
    text:    'rgba(255, 255, 255, 0.78)',
    textDim: 'rgba(255, 255, 255, 0.35)',

    // Accent (amber)
    accent:    '#f0a830',
    accentDim: '#c87941',

    // Input elements
    inputBg:     'rgba(255, 255, 255, 0.06)',
    inputBorder: 'rgba(255, 255, 255, 0.15)',

    // Danger / reset
    danger: 'rgba(200, 80, 60, 0.8)'
  },

  light: {
    // Aged-paper "old map" background: a deepening vignette over a warm parchment radial,
    // so the edges feel like the worn border of an atlas page. Grain (below) adds tooth.
    appBackground:
      'radial-gradient(ellipse at center, rgba(74,46,12,0) 38%, rgba(74,46,12,0.26) 100%),' +
      'radial-gradient(ellipse at center, #f6ecd6 0%, #e2cfa4 52%, #c4ab78 84%, #ad9263 100%)',
    grainOpacity: 0.55,
    grainBlend: 'soft-light',

    atmosphereColor: '#b8860b',

    // Cartographic deep red pins (classic atlas)
    pinColor:     '#8b1a1a',
    clusterColor: '#4a4540',  // dark charcoal — distinct from the earthy category palette

    // Per-category pin colours (assigned by category order). Muted earthy inks for paper.
    categoryPalette: ['#8b1a1a', '#7a4f2d', '#5a6e3a', '#3d5a6c',
                      '#9c5b2b', '#4f6f5e', '#6d4163', '#9a7d1f'],

    // Parchment overlay
    overlayBg: 'rgb(224, 208, 178)',

    panelBg:     'rgba(232, 218, 188, 0.96)',
    panelBorder: 'rgba(60, 35, 8, 0.18)',

    // Dark sepia ink
    text:    'rgba(38, 22, 6, 0.88)',
    textDim: 'rgba(38, 22, 6, 0.42)',

    // Red accent
    accent:    '#8b1a1a',
    accentDim: '#7a4f2d',

    inputBg:     'rgba(60, 35, 8, 0.06)',
    inputBorder: 'rgba(60, 35, 8, 0.2)',

    danger: 'rgba(139, 26, 26, 0.75)'
  }
}
