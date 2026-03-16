import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure(proxy) {
          proxy.on('proxyReq', (_, req) =>
            console.log('Vite代理转发:', req.method, req.url)
          )
          proxy.on('error', err =>
            console.error('Vite代理错误:', err.message)
          )
        }
      }
    }
  }
})
