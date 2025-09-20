import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
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
      'firebase/storage': path.resolve(__dirname, './node_modules/firebase/storage/dist'),
    },
    dedupe: ['react', 'react-dom'], // ensure only one copy of React for Fast Refresh
  },
}) 