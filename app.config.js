module.exports = ({ config }) => {
  return {
    name: "Props Bible",
    slug: "props-bible",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*",
      "assets/fonts/**/*",
      "assets/images/**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.propsbible",
      // googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './ios/GoogleService-Info.plist' // Comment out if file doesn't exist
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.propsbible",
      // googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json' // Temporarily disabled
    },
    web: {
      bundler: "metro",
      favicon: "./public/icon.png"
    },
    jsEngine: "hermes",
    hooks: {
      postPublish: [
        {
          file: 'sentry-expo/upload-sourcemaps',
          config: {
            organization: 'props-bible',
            project: 'props-bible',
            authToken: process.env.SENTRY_AUTH_TOKEN,
          },
        },
      ],
    },
    scheme: "propsbible",
    plugins: [
      // "@react-native-firebase/app", // Temporarily disabled
      "expo-router"
    ],
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    },
    extra: {
      "eas": {
        "projectId": "2f290c3d-90db-4054-ae40-b68113f8c621"
      }
    }
  };
}; 