// TODO: re-enable progressive loading (low-res shown immediately, high-res swapped in)
// export const GLOBE_TEXTURES_LORES = {
//   dark:  '/textures/earth-night-4k.jpg',
//   light: '/textures/earth-day-4k.jpg'
// }

// High-res NASA textures — served by Vite's static server (assets/ → public root)
export const GLOBE_TEXTURES = {
  dark:  '/textures/earth-night-8k.jpg',
  light: '/textures/earth-day-8k.jpg'
}

export const THEMES = {
  dark: {
    // App canvas (the "space" around the globe)
    appBackground: '#0a0e1a',

    // Globe atmosphere glow
    atmosphereColor: '#c87941',

    // Pin colours
    pinColor:     '#f0a830',
    clusterColor: '#c87941',

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
    // Aged-paper vignette — the "old map" space background
    appBackground:
      'radial-gradient(ellipse at center, #f2e8d2 0%, #d9c49a 55%, #b8a070 100%)',

    atmosphereColor: '#b8860b',

    // Cartographic deep red pins (classic atlas)
    pinColor:     '#8b1a1a',
    clusterColor: '#7a4f2d',

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
