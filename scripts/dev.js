// VS Code sets ELECTRON_RUN_AS_NODE=1 in its terminal environment,
// which causes Electron to run as plain Node.js (no browser context).
// We delete it here so the app gets a proper Electron main process.
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = require('child_process')
const path = require('path')

// Run electron-vite's JS entry directly with Node to avoid shell:true deprecation warning
const electronViteJs = path.join(__dirname, '..', 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')

const child = spawn(process.execPath, [electronViteJs, 'dev'], {
  stdio: 'inherit',
  env: process.env
})

child.on('exit', (code) => process.exit(code ?? 0))
