import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

/** Identifies a build for cache busting: the git commit when available, else the build time */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return Date.now().toString(36)
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  base: process.env.NODE_ENV === 'production' ? '/table-function-visualizer/' : '/',
  optimizeDeps: {
    exclude: ['pyodide']
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})

