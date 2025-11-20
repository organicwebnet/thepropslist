const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  // Add support for resolving from project root
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
  },
  // Ensure proper resolution of source files
  sourceExts: [...(config.resolver.sourceExts || []), 'tsx', 'ts', 'jsx', 'js', 'json'],
};

config.transformer = {
  ...config.transformer,
  // Enable inline requires for better performance
  inlineRequires: true,
};

// Disable watch mode for production/release builds to avoid Windows file watcher issues
const isProduction = process.env.NODE_ENV === 'production' || process.env.CI === 'true';
if (isProduction) {
  // Disable watch mode for production builds by setting empty watch folders
  // This prevents Metro from trying to start file watching
  config.watchFolders = [];
  
  // Disable the watcher entirely for production builds
  // Metro will skip watch mode initialization when watchFolders is empty
  config.watcher = undefined;
} else {
  // Watch folders for changes (development mode only)
  config.watchFolders = [__dirname];
}

module.exports = config; 