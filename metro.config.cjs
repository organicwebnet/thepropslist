const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web
  isCSSEnabled: true
});

// Configure resolver for web and native
config.resolver.sourceExts = [
  // JS/TS extensions
  'js',
  'jsx',
  'ts',
  'tsx',
  // Web-specific extensions
  'web.js',
  'web.jsx',
  'web.ts',
  'web.tsx',
  // Module extensions
  'cjs',
  'mjs'
];

// Add support for web assets
config.resolver.assetExts = [...config.resolver.assetExts, 'ttf', 'otf'];

// Configure platforms
config.resolver.platforms = ['ios', 'android', 'web'];

// Configure transformer
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  minifierConfig: {
    mangle: {
      keep_fnames: true
    }
  }
};

// Configure server
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set proper CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Handle MIME types for web assets
      if (req.url.endsWith('.js') || req.url.endsWith('.jsx') || req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'text/javascript');
      } else if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (req.url.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
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