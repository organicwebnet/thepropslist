module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Runtime and module transformations
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true
      }],
      '@babel/plugin-transform-modules-commonjs',

      // Import and export transformations
      'babel-plugin-transform-import-meta',
      '@babel/plugin-proposal-export-namespace-from',
      '@babel/plugin-proposal-object-rest-spread',

      // Path resolution
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.mjs'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@utils': './src/utils'
        }
      }]
    ]
  };
}; 