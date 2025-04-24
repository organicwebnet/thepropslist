const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { ProgressPlugin } = require('webpack');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add React Refresh plugin for development
  if (env.mode === 'development') {
    config.plugins.push(
      new ReactRefreshWebpackPlugin({
        overlay: false,
      })
    );
  }

  // Add progress plugin
  config.plugins.push(
    new ProgressPlugin({
      activeModules: true,
      modules: true,
      dependencies: true,
      entries: true,
    })
  );

  // Configure module resolution
  config.resolve = {
    ...config.resolve,
    fallback: {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url/'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      assert: require.resolve('assert/'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
    },
    extensions: ['.web.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
  };

  // Configure module rules for handling various file types
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
        plugins: [
          '@babel/plugin-transform-runtime',
          'babel-plugin-transform-import-meta',
        ],
      },
    },
  });

  // Configure environment variables
  config.plugins.forEach(plugin => {
    if (plugin.constructor.name === 'DefinePlugin') {
      const processEnv = plugin.definitions['process.env'] || {};
      plugin.definitions['process.env'] = {
        ...processEnv,
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        FIREBASE_API_KEY: JSON.stringify(process.env.FIREBASE_API_KEY),
        FIREBASE_AUTH_DOMAIN: JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN),
        FIREBASE_PROJECT_ID: JSON.stringify(process.env.FIREBASE_PROJECT_ID),
        FIREBASE_STORAGE_BUCKET: JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET),
        FIREBASE_MESSAGING_SENDER_ID: JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID),
        FIREBASE_APP_ID: JSON.stringify(process.env.FIREBASE_APP_ID),
        GOOGLE_SHEETS_API_KEY: JSON.stringify(process.env.GOOGLE_SHEETS_API_KEY),
        GOOGLE_DOCS_API_KEY: JSON.stringify(process.env.GOOGLE_DOCS_API_KEY),
      };
    }
  });

  return config;
}; 