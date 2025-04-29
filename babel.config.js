module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            "@shared": "./src/shared",
            "@components": "./src/components",
            "@screens": "./src/screens",
            "@utils": "./src/utils",
            "@assets": "./assets",
            "@platforms": "./src/platforms",
            // Add other aliases from tsconfig.json if needed
          }
        }
      ],
      "react-native-reanimated/plugin",
      "@babel/plugin-proposal-export-namespace-from",
    ],
    env: {
      production: {
        plugins: ['transform-remove-console']
      }
    }
  };
}; 