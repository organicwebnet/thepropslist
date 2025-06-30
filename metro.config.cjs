const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Reset to basic configuration
config.resolver = {
  ...config.resolver,
};

config.transformer = {
  ...config.transformer,
  // Remove any custom transformer options that might cause issues
};

module.exports = config; 