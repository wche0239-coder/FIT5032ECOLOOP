import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    // F.1 offline: a service worker caches the built app so EcoLoop still
    // opens without a connection after the first visit, and can be installed
    // to the home screen. Firebase, SendGrid and Mapbox requests are never
    // cached — they always need the network.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'EcoLoop — local exchange',
        short_name: 'EcoLoop',
        description: 'Give, swap and resell surplus with Melbourne neighbours and small businesses.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#EFF1EA',
        theme_color: '#1F5C4D',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,ico}'],
        // Product photos (~8 MB) are cached when first viewed instead of all up front.
        globIgnores: ['**/assets/*.png'],
        // The lazy-loaded map chunk is ~1.9 MB; allow it so Map view's code is offline too.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'ecoloop-images', expiration: { maxEntries: 60 } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
