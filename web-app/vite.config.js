import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    headers: {
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob: https://api.qrserver.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.google-analytics.com wss://*.firebaseio.com; frame-src 'self' https://*.google.com blob:; object-src 'none'; base-uri 'self'; form-action 'self';"
    },
    fs: {
      allow: [
        '..', // allow parent directory for monorepo shared code
        path.resolve(__dirname, '../src/shared'),
        path.resolve(__dirname, '../src/platforms'),
        path.resolve(__dirname, '../src/types'),
      ],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'pdf-vendor': ['jspdf', 'html2pdf.js'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable'],
          
          // Feature chunks
          'props': [
            './src/PropsListPage.tsx',
            './src/pages/PropDetailPage.tsx',
            './src/pages/AddPropPage.tsx',
            './src/pages/EditPropPage.tsx'
          ],
          'shows': [
            './src/ShowsListPage.tsx',
            './src/pages/ShowDetailPage.tsx',
            './src/pages/AddShowPage.tsx',
            './src/pages/EditShowPage.tsx',
            './src/pages/TeamPage.tsx'
          ],
          'boards': [
            './src/pages/BoardsPage.tsx'
          ],
          'packing': [
            './src/pages/PackingListPage.tsx',
            './src/pages/PackingListDetailPage.tsx',
            './src/pages/ContainerDetailPage.tsx'
          ],
          'pdf-export': [
            './src/pages/PropsPdfExportPage.tsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../src/shared'),
      '@platforms': path.resolve(__dirname, '../src/platforms'),
      '@types': path.resolve(__dirname, '../src/types'),
      '@root': path.resolve(__dirname, '../src'),
      'firebase/storage': path.resolve(__dirname, './node_modules/firebase/storage/dist'),
      // Resolve react-native to a stub for web compatibility
      'react-native': path.resolve(__dirname, './src/stubs/react-native-stub.js'),
      // Stub out React Native Firebase packages that aren't available on web
      '@react-native-firebase/firestore': path.resolve(__dirname, './src/stubs/react-native-firebase-stub.js'),
      '@react-native-firebase/auth': path.resolve(__dirname, './src/stubs/react-native-firebase-stub.js'),
      '@react-native-firebase/storage': path.resolve(__dirname, './src/stubs/react-native-firebase-stub.js'),
      '@react-native-firebase/app': path.resolve(__dirname, './src/stubs/react-native-firebase-stub.js'),
      '@react-native-picker/picker': path.resolve(__dirname, './src/stubs/react-native-picker-stub.js'),
      // Stub out expo-notifications (not available on web)
      'expo-notifications': path.resolve(__dirname, './src/stubs/expo-notifications-stub.js'),
    },
    dedupe: ['react', 'react-dom'], // ensure only one copy of React for Fast Refresh
  },
  optimizeDeps: {
    exclude: ['react-native', '@react-native-firebase/firestore', '@react-native-firebase/auth', '@react-native-firebase/storage', '@react-native-firebase/app', 'expo-notifications'],
  },
  define: {
    // Define __DEV__ global for Expo modules compatibility
    '__DEV__': JSON.stringify(process.env.NODE_ENV !== 'production'),
    // Define global for Node.js-style modules (used by Expo)
    'global': 'globalThis',
    // Define process.env.NODE_ENV for compatibility (used in some components)
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}) 