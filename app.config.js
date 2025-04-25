module.exports = {
  name: 'Props Bible',
  slug: 'props-bible',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    "**/*",
    "assets/fonts/**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.propsbible.app'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.propsbible.app'
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro'
  },
  plugins: [
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf',
          './assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf',
          './assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'
        ]
      }
    ]
  ],
  extra: {
    eas: {
      projectId: 'your-project-id'
    }
  }
}; 