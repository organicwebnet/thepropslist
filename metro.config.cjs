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

// Export the default config only
module.exports = config; 