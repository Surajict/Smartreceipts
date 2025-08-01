/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'Smart Receipt Logo.png'],
      manifest: {
        name: 'Smart Receipts',
        short_name: 'Receipts',
        description: 'AI-powered receipt management, warranty tracking, and smart search.',
        start_url: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'Smart Receipt Logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'Smart Receipt Logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Enable push notifications in service worker
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,jpg,jpeg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/napulczxrrnsjtmaixzp\.supabase\.co\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
