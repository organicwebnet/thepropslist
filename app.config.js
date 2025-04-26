const appJson = require('./app.json');

module.exports = ({ config }) => {
  return {
    ...appJson.expo,
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
    // Make sure expo-router configuration is preserved
    scheme: "propsbible",
    plugins: [
      ...((appJson.expo && appJson.expo.plugins) || []),
      "expo-router"
    ],
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    }
  };
}; 