module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo',
      // 'module:@react-native/babel-preset', // Removed to avoid conflict with babel-preset-expo
      "nativewind/babel", // Re-enabled NativeWind preset
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            "@shared": "./src/shared",
            "@components": "./src/components",
            "@screens": "./src/screens",
            "@utils": "./src/utils",
            "@assets": "./assets",
            "@platforms": "./src/platforms",
            "@": "./src",
            "@contexts": "./src/contexts",
            "@hooks": "./src/hooks",
            "@services": "./src/services",
            "@config": "./src/config",
            "@types": "./src/types"
          }
        }
      ],
      ['module:react-native-dotenv', { // Added react-native-dotenv plugin
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true
      }],
      // This must be last!
      "react-native-reanimated/plugin"
    ],
    env: {
      production: {
        plugins: ['transform-remove-console']
      }
    }
  };
}; 