const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web
  isCSSEnabled: true
});

// Add support for web-specific extensions
config.resolver.sourceExts = [
  'web.tsx',
  'web.ts',
  'web.jsx',
  'web.js',
  'tsx',
  'ts',
  'jsx',
  'js',
  'mjs',
  'cjs'
];

// Add support for web assets and fonts
config.resolver.assetExts = [
  'otf',
  'ttf',
  'svg',
  'woff',
  'woff2',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'mp4',
  'webp',
  'wav',
  'mp3'
];

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
      
      // Handle all JavaScript files
      if (req.url.match(/\.(js|jsx|ts|tsx|bundle)$/)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      
      return middleware(req, res, next);
    };
  }
};

// Configure resolver
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['browser', 'main'],
  platforms: ['web', 'android', 'ios'],
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