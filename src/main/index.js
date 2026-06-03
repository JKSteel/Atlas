import { app, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { existsSync, readFileSync } from 'fs'
import { registerHandlers } from './ipc'
import { scanMedia, closeExiftool, PINS_PATH } from './scanner'

// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'atlas',
    privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true }
  }
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // atlas://media/some/file.mp4 -> serves the local file relative to project root
  // Range headers forwarded so video seeking and looping work correctly
  protocol.handle('atlas', (request) => {
    const relativePath = decodeURIComponent(request.url.slice('atlas://'.length))
    const absolutePath = join(process.cwd(), relativePath)
    return net.fetch(pathToFileURL(absolutePath).toString(), {
      headers: request.headers
    })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(async () => {
  registerHandlers()
  const win = createWindow()

  // Skip the initial scan if pins.json already has data — user can rescan manually.
  let hasSavedPins = false
  try {
    hasSavedPins = existsSync(PINS_PATH) &&
      JSON.parse(readFileSync(PINS_PATH, 'utf-8')).length > 0
  } catch { /* malformed file — treat as empty */ }

  if (hasSavedPins) {
    console.log('Existing pins found, skipping initial scan.')
  } else {
    console.log('No saved pins — scanning media in background...')
    scanMedia().then(() => {
      win.webContents.send('scan-complete')
    }).catch(err => {
      console.error('Media scan failed:', err)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  closeExiftool()
})
