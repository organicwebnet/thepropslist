const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Find the project root (directory containing package.json)
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Configure resolver for better compatibility
config.resolver = {
  ...config.resolver,
  // Add buffer polyfill
  extraNodeModules: {
    buffer: require.resolve('buffer/'),
  },
  alias: {
    'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  },
  platforms: ['native', 'android', 'ios', 'web'],
};

// Configure transformer
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

// Note: polyfills are now loaded in app/_layout.tsx

module.exports = config; 