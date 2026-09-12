import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Builds a Node-runnable bundle of the test entries so the suites can import
 * real application modules (JSX, Tailwind-in-JS, import.meta.env) without a browser.
 *   SMOKE_ENTRY / SMOKE_OUT select which entry to build and where.
 */
export default defineConfig({
  root: path.resolve(import.meta.dirname, '..'),
  plugins: [react()],
  logLevel: 'error',
  build: {
    ssr: path.resolve(import.meta.dirname, process.env.SMOKE_ENTRY || 'entry.ssr.jsx'),
    outDir: path.resolve(import.meta.dirname, process.env.SMOKE_OUT || '.build'),
    emptyOutDir: true,
  },
})
