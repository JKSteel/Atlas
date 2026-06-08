import raw from './countries.csv?raw'

// CSV format: "Country name,Alpha-2 code"  (2 columns, header on line 1)
// Quoted names (e.g. "Korea, South") are handled by splitting on the last comma.
const COUNTRY_NAMES = {}
for (const line of raw.split('\n').slice(1)) {
  const trimmed = line.trim()
  if (!trimmed) continue
  const lastComma = trimmed.lastIndexOf(',')
  if (lastComma < 0) continue
  const name = trimmed.slice(0, lastComma).replace(/^"|"$/g, '').trim()
  const code = trimmed.slice(lastComma + 1).trim()
  if (code) COUNTRY_NAMES[code] = name
}

export default COUNTRY_NAMES
