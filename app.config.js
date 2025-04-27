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
      "assets/fonts/**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.propsbible"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.propsbible"
    },
    web: {
      bundler: "metro",
      favicon: "./public/icon-192.png"
    },
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
      "expo-router"
    ],
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    }
  };
}; 