const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');

// Find the project root (directory containing package.json)
const projectRoot = __dirname;
// Find the workspace root (if using Yarn workspaces)
// const workspaceRoot = path.resolve(projectRoot, '../..'); // Adjust if needed

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

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

// Restore withNativeWind wrapper
module.exports = withNativeWind(config, {
  input: './global.css',
  projectRoot: projectRoot,
});

// Remove the direct export used for testing
// module.exports = config;