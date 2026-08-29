import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://frontend.scagerwebsite.uk'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Paksa bind IPv4 — tanpa ini, bisa kalah rebutan port dengan preview server
      // IDE (yang ngempet 127.0.0.1:5173-5175) dan cuma kebind di ::1.
      host: '127.0.0.1',
      // Port khusus agar tidak bentrok dengan proyek lain & preview IDE (5173-5176)
      port: 5180,
      allowedHosts: ['frontend.scagerwebsite.uk'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          // secure: false, // aktifkan kalau backend pakai SSL self-signed
        },
      },
    },
  }
})
