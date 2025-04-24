import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.js', '.ts', '.jsx', '.tsx'],
    },
  },
  define: {
    global: 'window',
    'process.env': {
      ...process.env,
      FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      GOOGLE_SHEETS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_SHEETS_API_KEY,
      GOOGLE_DOCS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_DOCS_API_KEY,
    },
    __DEV__: process.env.NODE_ENV !== 'production',
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  }
});