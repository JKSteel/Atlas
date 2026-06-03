import { exiftool } from 'exiftool-vendored'
import { readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname, basename } from 'path'

const MEDIA_DIR = join(process.cwd(), 'media')
const PINS_PATH = join(process.cwd(), 'data', 'pins.json')

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.m4v'])
const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.dng'])

export { PINS_PATH }

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
        pins.push({
          id: `${category}-${stem}`,
          lat, lng,
          label: stem,
          category,
          videoPath: isVideo ? `media/${category}/${file}` : null,
          photos: isPhoto ? [`media/${category}/${file}`] : []
        })
        console.log(`  ${file} → (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
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
