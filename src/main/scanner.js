import { exiftool } from 'exiftool-vendored'
import { readdirSync, statSync, writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join, extname, basename } from 'path'
import COUNTRY_NAMES from '../renderer/src/shared/countries.js'

const MEDIA_DIR = join(process.cwd(), 'media')
const PINS_PATH = join(process.cwd(), 'data', 'pins.json')
const CITIES_PATH = join(process.cwd(), 'EXTRA', 'cities500.txt')

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.m4v'])
const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.dng'])

export { PINS_PATH }

// cities500.txt (GeoNames): tab-delimited
//   col 1 = city name, 4 = lat, 5 = lng, 8 = ISO 3166-1 alpha-2 country code
// Loaded once per scan into typed arrays for fast nearest-neighbour search.
function loadCities() {
  if (!existsSync(CITIES_PATH)) return null
  const lines = readFileSync(CITIES_PATH, 'utf-8').split('\n')
  const names = [], countries = [], lats = [], lngs = []
  for (const line of lines) {
    if (!line) continue
    const cols = line.split('\t', 9)
    if (cols.length < 9) continue
    const lat = parseFloat(cols[4]), lng = parseFloat(cols[5])
    if (isNaN(lat) || isNaN(lng)) continue
    names.push(cols[1])
    countries.push(cols[8])
    lats.push(lat)
    lngs.push(lng)
  }
  return {
    names, countries,
    lats: new Float32Array(lats),
    lngs: new Float32Array(lngs)
  }
}

function nearestCity(cities, lat, lng) {
  if (!cities) return { city: null, country: null }
  const { names, countries, lats, lngs } = cities
  const cosLat = Math.cos(lat * Math.PI / 180)
  let bestIdx = -1, bestDist = Infinity
  for (let i = 0; i < lats.length; i++) {
    const dlat = lats[i] - lat
    const dlng = (lngs[i] - lng) * cosLat
    const d = dlat * dlat + dlng * dlng
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  if (bestIdx < 0) return { city: null, country: null }
  const code = countries[bestIdx]
  return { city: names[bestIdx], country: COUNTRY_NAMES[code] ?? code }
}

function fileInDateRange(tags, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true
  const exifDate = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.MediaCreateDate
  if (!exifDate) return true  // no EXIF date — include by default
  const d = exifDate.toDate?.() ?? new Date(String(exifDate))
  if (isNaN(d)) return true
  const iso = d.toISOString().slice(0, 10)
  if (dateFrom && iso < dateFrom) return false
  if (dateTo && iso > dateTo) return false
  return true
}

export async function scanMedia(onProgress, dateFrom, dateTo) {
  if (!existsSync(MEDIA_DIR)) {
    console.log('No media directory found, skipping scan')
    return []
  }

  // Collect all valid media files upfront so we can report progress
  const entries = readdirSync(MEDIA_DIR)
  const categories = entries.filter(name =>
    statSync(join(MEDIA_DIR, name)).isDirectory()
  )

  const queue = []
  for (const category of categories) {
    const categoryDir = join(MEDIA_DIR, category)
    for (const file of readdirSync(categoryDir)) {
      const ext = extname(file).toLowerCase()
      const isVideo = VIDEO_EXTS.has(ext)
      const isPhoto = PHOTO_EXTS.has(ext)
      if (isVideo || isPhoto) queue.push({ category, file, ext, isVideo, isPhoto })
    }
  }

  console.log('Loading cities dataset…')
  const cities = loadCities()
  if (cities) {
    console.log(`  ${cities.lats.length} cities loaded`)
  } else {
    console.warn('  cities500.txt not found — city/country fields will be empty')
  }

  const pins = []
  for (let i = 0; i < queue.length; i++) {
    const { category, file, ext, isVideo, isPhoto } = queue[i]
    const filePath = join(MEDIA_DIR, category, file)

    try {
      const tags = await exiftool.read(filePath)
      const lat = extractLat(tags)
      const lng = extractLng(tags)

      if (lat === null || lng === null) {
        console.warn(`  Skipping ${file} — no GPS data`)
      } else if (!fileInDateRange(tags, dateFrom, dateTo)) {
        console.log(`  Skipping ${file} — outside date range`)
      } else {
        const stem = basename(file, ext)

        const exifDate = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.MediaCreateDate
        let date = null
        if (exifDate?.year && exifDate?.month && exifDate?.day) {
          date = `${exifDate.year}-${String(exifDate.month).padStart(2, '0')}-${String(exifDate.day).padStart(2, '0')}`
        }

        const { city, country } = nearestCity(cities, lat, lng)

        pins.push({
          id: `${category}-${stem}`,
          lat, lng,
          label: stem,
          category,
          date,
          city,
          country,
          mediaPath: `media/${category}/${file}`,
        })
        console.log(`  ${file} → (${lat.toFixed(4)}, ${lng.toFixed(4)}) — ${city ?? '?'}, ${country ?? '?'}`)
      }
    } catch (err) {
      console.error(`  Failed to read ${file}: ${err.message}`)
    }

    onProgress?.(i + 1, queue.length)
  }

  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir)

  writeFileSync(PINS_PATH, JSON.stringify(pins, null, 2))
  console.log(`Scan complete: ${pins.length} pin(s) → data/pins.json`)

  return pins
}

// Extract signed decimal latitude from exiftool tags
function extractLat(tags) {
  const lat = tags.GPSLatitude
  if (lat == null) return null
  return tags.GPSLatitudeRef === 'S' ? -Math.abs(lat) : Math.abs(lat)
}

// Extract signed decimal longitude from exiftool tags
function extractLng(tags) {
  const lng = tags.GPSLongitude
  if (lng == null) return null
  return tags.GPSLongitudeRef === 'W' ? -Math.abs(lng) : Math.abs(lng)
}

// Call this on app quit to clean up the exiftool child process
export function closeExiftool() {
  exiftool.end()
}
