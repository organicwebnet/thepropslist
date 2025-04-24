// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

/** @type {import('metro-config').MetroConfig} */
const metroConfig = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    experimentalImportSupport: false,
    inlineRequires: true,
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'db'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs', 'svg', 'mjs'],
    resolverMainFields: ['react-native', 'browser', 'main', 'module'],
    platforms: ['ios', 'android', 'web'],
  },
  server: {
    port: 8081,
    enhanceMiddleware: (middleware) => {
      return middleware;
    }
  },
  watchFolders: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'assets')
  ],
  cacheVersion: '1.0'
};

module.exports = metroConfig; 