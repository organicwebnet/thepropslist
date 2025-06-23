module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo',
      // 'module:@react-native/babel-preset', // This preset conflicts with 'babel-preset-expo'
      // "nativewind/babel", // Removed NativeWind preset
    ],
    plugins: [
      // [
      //   'module-resolver',
      //   {
      //     root: ['.'],
      //     extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      //     alias: {
      //       "@shared": "./src/shared",
      //       "@components": "./src/components",
      //       "@screens": "./src/screens",
      //       "@utils": "./src/utils",
      //       "@assets": "./assets",
      //       "@platforms": "./src/platforms",
      //       "@": "./src",
      //       "@contexts": "./src/contexts",
      //       "@hooks": "./src/hooks",
      //       "@services": "./src/services",
      //       "@config": "./src/config",
      //       "@types": "./src/types"
      //     }
      //   }
      // ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      // 'react-native-reanimated/plugin', // Temporarily disabled for diagnostics
      'react-native-reanimated/plugin', // This must be last!
    ],
    env: {
      production: {
        plugins: ['transform-remove-console']
      }
    }
  };
}; 