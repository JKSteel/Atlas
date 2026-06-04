import { THEMES } from '../shared/themes'

// Convert 1–10 to Roman numerals (sufficient for any realistic category count)
function toRoman(n) {
  const vals = [10, 9, 5, 4, 1]
  const syms = ['X', 'IX', 'V', 'IV', 'I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

export default function LayerControls({ categories, activeLayers, onToggle, settings, categoryColors }) {
  const t = THEMES[settings.theme]
  const allActive = categories.every(c => activeLayers.has(c))
  const noneActive = categories.every(c => !activeLayers.has(c))

  const toggleAll = () => {
    categories.forEach(c => {
      const isActive = activeLayers.has(c)
      if (allActive && isActive) onToggle(c)        // hide all
      else if (!allActive && !isActive) onToggle(c) // show all
    })
  }

  return (
    <div style={{ ...styles.panel, background: t.panelBg, borderColor: t.panelBorder }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={{ ...styles.headerLabel, color: t.textDim }}>INDEX</span>
        <div style={{ ...styles.rule, background: t.panelBorder }} />
      </div>

      {/* Category entries */}
      {categories.map((cat, i) => {
        const active = activeLayers.has(cat)
        const color = categoryColors?.get(cat) ?? t.accent
        return (
          <div
            key={cat}
            style={{ ...styles.row, borderColor: t.panelBorder }}
            onClick={() => onToggle(cat)}
          >
            <span style={{ ...styles.numeral, color: t.textDim }}>
              {toRoman(i + 1)}
            </span>
            <span style={{ ...styles.name, color: active ? t.text : t.textDim }}>
              {cat}
            </span>
            <span style={{
              ...styles.indicator,
              background: active ? color : 'transparent',
              borderColor: active ? color : t.textDim
            }} />
          </div>
        )
      })}

      {/* Footer — show/hide all */}
      <div style={styles.footer}>
        <div style={{ ...styles.rule, background: t.panelBorder }} />
        <button
          style={{ ...styles.footerBtn, color: t.textDim }}
          onClick={toggleAll}
        >
          {allActive ? 'HIDE ALL' : noneActive ? 'SHOW ALL' : 'SHOW ALL'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  panel: {
    position: 'fixed',
    top: 24,
    left: 24,
    minWidth: 180,
    border: '1px solid',
    borderRadius: 4,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    overflow: 'hidden',
    zIndex: 50
  },
  header: {
    padding: '14px 16px 8px'
  },
  headerLabel: {
    display: 'block',
    fontSize: 9,
    letterSpacing: '0.35em',
    fontFamily: 'system-ui, sans-serif',
    marginBottom: 8
  },
  rule: {
    height: 1,
    width: '100%'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 16px',
    cursor: 'pointer',
    borderTop: '1px solid',
    userSelect: 'none'
  },
  numeral: {
    fontSize: 9,
    fontFamily: 'Georgia, serif',
    letterSpacing: '0.05em',
    width: 16,
    flexShrink: 0,
    opacity: 0.6
  },
  name: {
    flex: 1,
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif',
    transition: 'color 0.2s'
  },
  indicator: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    border: '1px solid',
    flexShrink: 0,
    transition: 'background 0.2s, border-color 0.2s'
  },
  footer: {
    padding: '8px 16px 12px'
  },
  footerBtn: {
    marginTop: 8,
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 9,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer'
  }
}
