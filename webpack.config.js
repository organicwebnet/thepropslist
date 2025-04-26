const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add Node.js polyfills
  config.plugins.push(
    new NodePolyfillPlugin(),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Configure fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    vm: require.resolve('vm-browserify'),
    buffer: require.resolve('buffer/'),
    stream: require.resolve('stream-browserify'),
    path: require.resolve('path-browserify'),
    crypto: require.resolve('crypto-browserify'),
  };

  // Configure dev server
  config.devServer = {
    ...config.devServer,
    historyApiFallback: true,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  };

  return config;
}; 