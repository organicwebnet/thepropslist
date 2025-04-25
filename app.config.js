const config = {
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
    '**/*',
    'assets/fonts/**/*',
    'assets/fonts/OpenDyslexic/**/*'
  ],
  plugins: [
    'expo-font'
  ],
  extra: {
    eas: {
      projectId: '2f290c3d-90db-4054-ae40-b68113f8c621'
    }
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/2f290c3d-90db-4054-ae40-b68113f8c621'
  },
  runtimeVersion: {
    policy: 'sdkVersion'
  },
  scheme: 'propsbible'
};

// Only include native config if we're not in a prebuild environment
if (!process.env.EAS_BUILD_PLATFORM) {
  config.ios = {
    supportsTablet: true,
    bundleIdentifier: 'com.propsbible.app'
  };
  config.android = {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.propsbible.app',
    jsEngine: 'hermes'
  };
}

export default config; 