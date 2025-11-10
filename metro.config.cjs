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

// Watch folders for changes
config.watchFolders = [__dirname];

module.exports = config; 