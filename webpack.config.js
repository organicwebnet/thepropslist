const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Remove existing HtmlWebpackPlugin instances
  config.plugins = config.plugins.filter(plugin => !(plugin instanceof HtmlWebpackPlugin));

  // Add new HtmlWebpackPlugin with proper configuration
  config.plugins.push(
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      filename: 'index.html',
      inject: true,
      minify: env.mode === 'production' ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
      templateParameters: {
        lang: 'en',
        title: 'Props Bible',
        description: 'Digital companion for theater production professionals',
      },
    })
  );

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

  // Configure module rules for HTML
  config.module.rules.push({
    test: /\.html$/,
    use: [
      {
        loader: 'html-loader',
        options: {
          minimize: env.mode === 'production',
        },
      },
    ],
  });

  // Ensure proper MIME types
  config.output.devtoolModuleFilenameTemplate = '[absolute-resource-path]';
  config.output.clean = true;

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