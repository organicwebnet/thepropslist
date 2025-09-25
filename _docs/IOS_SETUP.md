# iOS Setup Guide - The Props List

This guide will help you set up iOS support for The Props List app.

## Prerequisites

### macOS Requirements
- **macOS**: macOS 10.15 (Catalina) or later
- **Xcode**: Version 14.0 or later (download from Mac App Store)
- **iOS Simulator**: Included with Xcode
- **CocoaPods**: `sudo gem install cocoapods`

### Development Tools
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Expo CLI**: `npm install -g @expo/cli`

## Setup Instructions

### 1. Firebase iOS Configuration

#### Step 1: Create iOS App in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `props-bible-app-1c1cb`
3. Click "Add app" and select iOS
4. Enter bundle identifier: `com.propsbible`
5. Download the `GoogleService-Info.plist` file

#### Step 2: Configure GoogleService-Info.plist
1. Copy the downloaded `GoogleService-Info.plist` to `ios/GoogleService-Info.plist`
2. Update your `.env` file with iOS-specific values:

```bash
# Copy from env.ios.example
cp env.ios.example .env

# Edit .env and add your iOS Firebase values
GOOGLE_SERVICES_PLIST=./ios/GoogleService-Info.plist
```

### 2. iOS Development Setup

#### Step 1: Install iOS Dependencies
```bash
# Install iOS-specific packages
npx expo install expo-camera expo-image-picker expo-notifications expo-location expo-av expo-print expo-sharing expo-file-system expo-document-picker expo-media-library expo-local-authentication expo-splash-screen
```

#### Step 2: Prebuild iOS Project
```bash
# Generate iOS project files
npx expo prebuild --platform ios

# Install CocoaPods dependencies
cd ios && pod install && cd ..
```

### 3. Running on iOS

#### Option 1: iOS Simulator (Recommended for Development)
```bash
# Start the development server
npx expo start

# Press 'i' to open iOS simulator
# Or run directly:
npx expo run:ios
```

#### Option 2: Physical iOS Device
1. Connect your iOS device via USB
2. Trust the computer on your device
3. Run: `npx expo run:ios --device`

### 4. Building for Production

#### Development Build
```bash
# Build development version
eas build --platform ios --profile development
```

#### Production Build
```bash
# Build production version
eas build --platform ios --profile production
```

## iOS-Specific Features

### Permissions
The app requests the following permissions on iOS:

- **Camera**: For taking photos of props and scanning QR codes
- **Photo Library**: For selecting and saving prop images
- **Microphone**: For video recording of prop setup instructions
- **Location**: For venue and prop location tracking
- **Contacts**: For team member management
- **Face ID**: For secure authentication

### Background Modes
- **Background Fetch**: For syncing data when app is backgrounded
- **Remote Notifications**: For push notifications

## Troubleshooting

### Common Issues

#### 1. "GoogleService-Info.plist not found"
- Ensure the file is in the `ios/` directory
- Check that `GOOGLE_SERVICES_PLIST` environment variable is set correctly

#### 2. "Build failed with CocoaPods"
```bash
cd ios
pod deintegrate
pod install
cd ..
```

#### 3. "Simulator not found"
- Open Xcode and install iOS simulators
- Or run: `xcrun simctl list devices`

#### 4. "Permission denied"
- Check that all required permissions are in `app.config.js`
- Test permissions in iOS Settings > Privacy & Security

### Build Errors

#### Metro bundler issues
```bash
npx expo start --clear
```

#### Cache issues
```bash
npx expo start --clear --reset-cache
```

## Testing Checklist

### Basic Functionality
- [ ] App launches successfully
- [ ] Authentication works (email/password and Google)
- [ ] Props CRUD operations work
- [ ] Shows management works
- [ ] Task boards work
- [ ] Camera integration works
- [ ] QR code scanning works
- [ ] File upload/download works
- [ ] Offline sync works

### iOS-Specific Features
- [ ] Face ID authentication works
- [ ] Push notifications work
- [ ] Background sync works
- [ ] All permissions are properly requested
- [ ] App works on different iOS versions (iOS 13+)
- [ ] App works on different device sizes (iPhone, iPad)

## Deployment

### App Store Preparation
1. Update version number in `app.config.js`
2. Build production version: `eas build --platform ios --profile production`
3. Submit to App Store: `eas submit --platform ios`

### TestFlight Distribution
1. Build preview version: `eas build --platform ios --profile preview`
2. Upload to TestFlight for internal testing

## Support

For issues specific to iOS development:
- Check [Expo iOS documentation](https://docs.expo.dev/workflow/ios-simulator/)
- Check [React Native iOS documentation](https://reactnative.dev/docs/running-on-device)
- Check [Firebase iOS documentation](https://firebase.google.com/docs/ios/setup)

