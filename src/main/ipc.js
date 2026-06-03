import { app, ipcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { scanMedia } from './scanner'

const PINS_PATH = join(__dirname, '../../data/pins.json')

// Settings live in Electron's userData directory so they persist across app updates
function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

export function registerHandlers() {
  ipcMain.handle('get-pins', () => {
    if (!existsSync(PINS_PATH)) return []
    return JSON.parse(readFileSync(PINS_PATH, 'utf-8'))
  })

  ipcMain.handle('scan-media', (event, { dateFrom, dateTo } = {}) =>
    scanMedia(
      (current, total) => event.sender.send('scan-progress', { current, total }),
      dateFrom,
      dateTo
    )
  )

  ipcMain.handle('get-settings', () => {
    const path = settingsPath()
    if (!existsSync(path)) return {}
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      return {}
    }
  })

  ipcMain.handle('save-settings', (_event, settings) => {
    writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
  })
}
