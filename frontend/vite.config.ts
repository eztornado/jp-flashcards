import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 2000,
    host: '0.0.0.0',
    allowedHosts: [
      "rpi4.netbird.vpn", // 👈 aquí tu dominio
    ],
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
