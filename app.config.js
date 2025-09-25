const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const iosPlist = process.env.GOOGLE_SERVICES_PLIST || './ios/GoogleService-Info.plist';
  const hasIosPlist = fs.existsSync(path.resolve(__dirname, iosPlist));
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
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "This app needs access to camera to take photos of props and scan QR codes.",
        NSPhotoLibraryUsageDescription: "This app needs access to photo library to select and save prop images.",
        NSMicrophoneUsageDescription: "This app needs access to microphone for video recording of prop setup instructions.",
        NSLocationWhenInUseUsageDescription: "This app needs access to location to help with venue and prop location tracking.",
        NSContactsUsageDescription: "This app needs access to contacts to help with team member management.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure authentication.",
        UIBackgroundModes: ["background-fetch", "remote-notification"]
      },
      ...(hasIosPlist ? { googleServicesFile: iosPlist } : {})
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
      "expo-router",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ]
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