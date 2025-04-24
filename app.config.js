export default {
  name: 'Props Bible',
  slug: 'props-bible',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.propsbible.app',
    jsEngine: 'hermes'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.propsbible.app',
    jsEngine: 'hermes'
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    'expo-font'
  ],
  extra: {
    FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID
  }
}; 