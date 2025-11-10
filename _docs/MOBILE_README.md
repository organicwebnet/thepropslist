# Props Bible Mobile App

This is the mobile version of Props Bible, built with React Native and Expo.

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on Android:
```bash
npm run android
```

4. Run on iOS (macOS only):
```bash
npm run ios
```

## Project Structure

```
src/
├── platforms/
│   └── mobile/
│       ├── navigation/
│       ├── screens/
│       └── entry.tsx
├── shared/
│   ├── components/
│   ├── hooks/
│   └── services/
└── contexts/
```

## Development

- The mobile app uses React Native with Expo for cross-platform development
- TypeScript is used for type safety
- React Navigation handles the navigation
- Firebase provides the backend services

## Building for Production

### Using EAS Build (Recommended for Expo)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure your project:
```bash
eas build:configure
```

3. Build for Android:
```bash
eas build --platform android
```

4. Build for iOS:
```bash
eas build --platform ios
```

### Building Native Android APK

For building native Android APKs without EAS, see the [Android Release Build Guide](_docs/ANDROID_RELEASE_BUILD_GUIDE.md).

**Important:** Before building for production, you must set up a release keystore. See [Release Keystore Setup Guide](../android/RELEASE_KEYSTORE_SETUP.md) for detailed instructions.

## Testing

Run tests with:
```bash
npm test
```

## Troubleshooting

1. If you encounter build errors:
   - Clean the build cache: `expo start -c`
   - Verify Android/iOS environment setup
   - Check the logs in the Expo development client

2. For TypeScript errors:
   - Run `npm run lint` to check for issues
   - Verify imports and type definitions

3. For Android emulator issues:
   - Ensure Android Studio is properly configured
   - Check that ANDROID_HOME is set correctly
   - Verify that the emulator is running 