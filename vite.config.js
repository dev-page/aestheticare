import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('firebase')) return 'firebase'
          if (id.includes('@iconify')) return 'iconify'
          if (id.includes('chart.js')) return 'charts'
          if (id.includes('sweetalert2')) return 'sweetalert2'
          if (id.includes('vue3-toastify') || id.includes('toastify-js')) return 'toasts'
          if (id.includes('html5-qrcode')) return 'qrcode'
          if (id.includes('vue-router')) return 'router'
          if (id.includes('pinia')) return 'pinia'
          if (id.includes('axios')) return 'axios'
          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/upload': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/send-otp': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  }
})
