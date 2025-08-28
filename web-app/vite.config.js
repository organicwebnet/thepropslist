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
    outDir: 'dist'
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