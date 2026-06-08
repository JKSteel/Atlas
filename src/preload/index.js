import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getPins:        ()                 => ipcRenderer.invoke('get-pins'),
  scanMedia:      (dateFrom, dateTo) => ipcRenderer.invoke('scan-media', { dateFrom, dateTo }),
  getSettings:    ()                 => ipcRenderer.invoke('get-settings'),
  saveSettings:   (settings)        => ipcRenderer.invoke('save-settings', settings),
  onScanComplete: (cb)               => ipcRenderer.on('scan-complete', cb),
  onScanProgress: (cb)               => ipcRenderer.on('scan-progress', (_e, data) => cb(data))
})
