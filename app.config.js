module.exports = ({ config }) => {
  return {
    name: "The Props List",
    slug: "props-bible",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#18181b"
    },
    assetBundlePatterns: [
      "**/*",
      "assets/fonts/**/*",
      "assets/images/**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.propsbible",
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './ios/GoogleService-Info.plist'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#18181b"
      },
      package: "com.propsbible",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      edgeToEdgeEnabled: true,
      statusBar: {
        backgroundColor: "#18181b",
        style: "light",
        translucent: true
      }
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
      "@react-native-firebase/app",
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