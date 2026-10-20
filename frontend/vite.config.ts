import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 2000,
    host: '0.0.0.0',
    allowedHosts: [
      "rpi2.netbird.vpn", // 👈 aquí tu dominio
    ],
    // En desarrollo el frontend usa rutas relativas (/api/...), igual que en
    // producción con nginx. Sin este proxy, Vite devolvería 404 en local.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
