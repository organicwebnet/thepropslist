const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable CSS support
config.transformer.babelTransformerPath = require.resolve('react-native-css-transformer');

// Configure resolver for web
config.resolver.sourceExts = [...config.resolver.sourceExts, 'css', 'scss', 'sass'];
config.resolver.assetExts = [...config.resolver.assetExts, 'ttf', 'otf'];

// Configure platforms
config.resolver.platforms = ['ios', 'android', 'web'];

// Add web-specific configurations
config.resolver.resolverMainFields = ['browser', 'main', 'module'];

// Configure proper MIME types for web
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  minifierConfig: {
    // Enable proper MIME type handling
    mangle: {
      keep_fnames: true
    }
  },
  // Add proper source map handling
  sourceMaps: true,
  experimentalImportSupport: false,
  unstable_disableES6Transforms: false,
};

// Configure proper web bundling
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set proper headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
      
      // Handle MIME types for web assets
      if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      
      return middleware(req, res, next);
    };
  }
};

// Configure resolver
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.endsWith('.web.js') || moduleName.endsWith('.web.tsx')) {
      return {
        filePath: path.resolve(__dirname, moduleName),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config; 