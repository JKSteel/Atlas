import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    // Serve the project's assets/ folder as Vite's static root.
    // Files in assets/textures/ are then available as /textures/filename.jpg
    // from the renderer — no custom protocol needed for large static files.
    publicDir: resolve(__dirname, 'assets'),
    optimizeDeps: {
      include: ['react-globe.gl', 'three']
    }
  }
})
