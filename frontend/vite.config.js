import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.glsl'],
  plugins: [react()],
  // --- ДОБАВЬТЕ ЭТОТ БЛОК ---
  server: {
    host: true
  }
  // --- КОНЕЦ БЛОКА ---
})