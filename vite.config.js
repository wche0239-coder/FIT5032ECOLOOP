import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Keep the Firebase SDK in its own long-cached chunk.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase'
        },
      },
    },
    // mapbox-gl is ~1.9 MB but is lazy-loaded only when Map view opens.
    chunkSizeWarningLimit: 2000,
  },
})
