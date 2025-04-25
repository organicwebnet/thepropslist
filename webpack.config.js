const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { ProgressPlugin } = require('webpack');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: [
        '@react-native',
        '@react-native-community',
        '@expo/vector-icons',
        'expo-font',
        'expo',
        'expo-modules-core',
        '@react-native/assets-registry'
      ]
    }
  }, argv);

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
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      ...config.resolve.alias,
      '@components': path.resolve(__dirname, 'src/components'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'assets'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@platforms': path.resolve(__dirname, 'src/platforms'),
      'react-native$': 'react-native-web',
      'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web'),
    },
  };

  // Configure module rules for handling various file types
  config.module.rules = [
    {
      test: /\.(js|jsx|ts|tsx|mjs)$/,
      include: [
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname, 'App.tsx'),
        path.resolve(__dirname, 'node_modules/@react-native'),
        path.resolve(__dirname, 'node_modules/@react-native-community'),
        path.resolve(__dirname, 'node_modules/expo'),
        path.resolve(__dirname, 'node_modules/expo-modules-core'),
        path.resolve(__dirname, 'node_modules/@expo'),
        path.resolve(__dirname, 'node_modules/react-native-reanimated'),
        path.resolve(__dirname, 'node_modules/react-native-web'),
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            '@babel/preset-react',
            '@babel/preset-typescript',
            'babel-preset-expo'
          ],
          plugins: [
            '@babel/plugin-transform-runtime',
            'babel-plugin-transform-import-meta',
            ['@babel/plugin-transform-class-properties', { loose: true }],
            ['@babel/plugin-transform-private-methods', { loose: true }],
            ['@babel/plugin-transform-private-property-in-object', { loose: true }]
          ],
          cacheDirectory: true,
          cacheCompression: false,
        },
      },
    },
    {
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name].[hash][ext]'
      }
    },
    {
      test: /\.(png|jpg|jpeg|gif|svg)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/images/[name].[hash][ext]'
      }
    },
  ];

  // Configure output
  config.output = {
    ...config.output,
    filename: 'static/js/[name].[contenthash].js',
    chunkFilename: 'static/js/[name].[contenthash].chunk.js',
    assetModuleFilename: 'static/media/[name].[hash][ext]',
    publicPath: '/',
    clean: true,
  };

  // Configure development server with improved MIME type handling
  config.devServer = {
    ...config.devServer,
    historyApiFallback: true,
    hot: true,
    compress: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    static: {
      directory: path.join(__dirname, 'public'),
      publicPath: '/',
      serveIndex: true,
      watch: true,
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    devMiddleware: {
      writeToDisk: true,
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Handle all JavaScript files with proper MIME type
      devServer.app.use((req, res, next) => {
        if (req.url.match(/\.(js|jsx|ts|tsx|bundle)$/)) {
          res.set('Content-Type', 'application/javascript');
        }
        next();
      });

      return middlewares;
    }
  };

  return config;
}; 