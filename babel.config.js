module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // The expo-router/babel plugin is deprecated and included in babel-preset-expo
      // require.resolve("expo-router/babel"), 
      ['module-resolver', {
        root: ['.'],
        extensions: [
          '.ios.js',
          '.android.js',
          '.web.js',
          '.js',
          '.ios.tsx',
          '.android.tsx',
          '.web.tsx',
          '.tsx',
          '.jsx',
          '.ts',
          '.json'
        ],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@utils': './src/utils',
          '@assets': './assets',
          '@shared': './src/shared',
          '@platforms': './src/platforms'
        }
      }],
      '@babel/plugin-proposal-export-namespace-from',
      'react-native-reanimated/plugin',
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true
      }]
    ],
    env: {
      production: {
        plugins: ['transform-remove-console']
      }
    }
  };
}; 