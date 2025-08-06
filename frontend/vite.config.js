// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  assetsInclude: ['**/*.glsl'],
  plugins: [
    react(),
    VitePWA({
      // Эта опция автоматически сгенерирует SW на основе вашего sw.js
      srcDir: 'src', // Папка, где лежит ваш кастомный SW
      filename: 'sw.js', // Имя вашего кастомного SW
      strategies: 'injectManifest', // 'injectManifest' - для использования своего sw.js
      registerType: 'autoUpdate', // Автоматически обновляться при наличии новой версии
      devOptions: {
        enabled: true // Включить SW в режиме разработки для тестирования
      }
    })
  ],
  server: {
    host: true
  }
})
