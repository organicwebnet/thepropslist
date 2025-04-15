import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
              }
            }
          },
          // Don't cache any Google or Firebase auth endpoints
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/identitytoolkit\//,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/accounts\.google\.com\//,
            handler: 'NetworkOnly'
          }
        ],
        // Exclude authentication-related URLs from caching
        navigateFallbackDenylist: [
          /^\/auth/,
          /^\/oauth/,
          /^\/api\/auth/,
          /^\/\/__\/auth/,
          /^.*?[\/\?].*?authuser.*$/,
          /^.*?[\/\?].*?oauth2.*$/
        ]
      },
      manifest: {
        name: 'Props Bible',
        short_name: 'Props Bible',
        description: 'A comprehensive props management system for theatrical productions',
        theme_color: '#d6001c',
        background_color: '#0A0A0A',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});