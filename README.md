# Atlas

A personal interactive 3D globe for browsing geotagged travel photos and videos. Media is organised into categories, pinned to their GPS coordinates on the globe, and viewable in a full-screen panel.

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later

The EXIF tool used to read GPS data from your media (`exiftool-vendored`) is bundled automatically by npm.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/JKSteel/atlas.git
cd atlas
npm install
```

### 2. Add globe textures

Create `assets/textures/` and add the following files. These are not included in the repo due to size.

| File | Source |
|---|---|
| `earth-day-4k.jpg` or `earth-day-8k.jpg` | [NASA Visible Earth](https://visibleearth.nasa.gov/collection/1484/blue-marble) — "Blue Marble" |
| `earth-night-4k.jpg` or `earth-night-8k.jpg` | [NASA Visible Earth](https://visibleearth.nasa.gov/images/55167) — "Earth at Night" |

The app will still run without textures; the globe will just render as a plain sphere.

### 3. Add the cities dataset (for reverse geocoding)

Download `cities500.zip` from [GeoNames](https://download.geonames.org/export/dump/cities500.zip), extract it, and place `cities500.txt` at:

```
EXTRA/cities500.txt
```

Without this file the scanner still works, but pins won't show city or country names.

### 4. Add your media

Create a `media/` folder in the project root. Organise your files into subfolders — each subfolder becomes a category on the globe:

```
media/
  Landscape/
    photo1.jpg
    clip.mp4
  Fauna/
    ...
  My Category/
    ...
```

**Media must have GPS EXIF data** embedded (most smartphone photos do by default). Files without GPS coordinates are skipped by the scanner. If you need to add GPS data manually, tools like [ExifTool](https://exiftool.org/) or [GeoSetter](https://www.geosetter.de/) can do this.

Supported formats: JPEG, PNG, and common video formats (MP4, MOV, etc.).

---

## Running the app

```bash
npm run dev
```

On first run, or whenever you add new media, click the **Rescan** button inside the app. This reads the EXIF data from all files in `media/` and writes the results to `data/pins.json`.

---
