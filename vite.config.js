import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Free-tier hosting notes:
//  - Vercel / Netlify / Cloudflare Pages : leave BASE_PATH empty ("/")
//  - GitHub Pages project site           : set BASE_PATH=/your-repo-name
//    e.g.  BASE_PATH=/kso-website npm run build
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    // allow the sandbox / *.e2b.app preview host and any custom domain
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
          charts: ['recharts'],
        },
      },
    },
  },
})
