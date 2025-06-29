const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Find the project root (directory containing package.json)
const projectRoot = __dirname;
// Find the workspace root (if using Yarn workspaces)
// const workspaceRoot = path.resolve(projectRoot, '../..'); // Adjust if needed

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Explicitly disable Package Exports
config.resolver = {
  ...config.resolver,
  // unstable_enablePackageExports: false, // Commented out as recommended
};

// --- Remove all custom alias logic --- 
// config.resolver.nodeModulesPaths = [ ... ]; // Keep default
// config.resolver.extraNodeModules = ... ; // REMOVE ALL ALIAS BLOCKS (Proxy and manual)

// --- Keep Polyfills if needed, but ensure extraNodeModules is handled safely --- 
// Check if extraNodeModules exists before adding buffer polyfill
if (!config.resolver.extraNodeModules) {
  config.resolver.extraNodeModules = {}; // Initialize if it doesn't exist
}
config.resolver.extraNodeModules.buffer = require.resolve('buffer/');

// --- SVG Transformer Configuration (Remains commented out) --- 
// ...

// Add resolver configuration for better global handling
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

// Ensure global polyfills are loaded first
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Add transform configuration for better compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
  },
  // Add global setup
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

// Add serializer configuration to inject global setup
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    require.resolve('./polyfills.js'),
  ],
};

// Export the default config only
module.exports = config; 