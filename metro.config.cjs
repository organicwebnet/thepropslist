// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

/** @type {import('metro-config').MetroConfig} */
const config = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  const { resolver: { sourceExts, assetExts } } = defaultConfig;

  return {
    transformer: {
      babelTransformerPath: require.resolve("react-native-svg-transformer"),
      experimentalImportSupport: false,
      inlineRequires: true,
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
      resolverMainFields: ['react-native', 'browser', 'main'],
      platforms: ['ios', 'android'],
    },
    server: {
      ...defaultConfig.server,
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
})();

module.exports = config; 