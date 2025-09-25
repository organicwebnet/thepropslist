# iOS Quick Start Guide

## Prerequisites
- macOS with Xcode 14.0+
- CocoaPods installed (`sudo gem install cocoapods`)

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up iOS (macOS only)
```bash
# Run the setup script
chmod +x scripts/setup-ios.sh
./scripts/setup-ios.sh
```

### 3. Configure Firebase
1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in the `ios/` directory
3. Update your `.env` file with iOS Firebase values

### 4. Run on iOS Simulator
```bash
npm run ios
# or
npx expo run:ios
```

## Available Commands

```bash
# Development
npm run ios              # Run on iOS simulator
npm run ios:device       # Run on physical iOS device
npm run ios:simulator    # Run on iOS simulator (explicit)

# Building
npm run prebuild:ios     # Generate iOS project files
eas build --platform ios # Build for production

# Development server
npm start                # Start Expo dev server
npm run start:clear      # Start with cleared cache
```

## Troubleshooting

### "GoogleService-Info.plist not found"
- Ensure the file is in `ios/GoogleService-Info.plist`
- Check your `.env` file has `GOOGLE_SERVICES_PLIST=./ios/GoogleService-Info.plist`

### "Build failed"
```bash
cd ios && pod install && cd ..
npm run prebuild:ios
```

### "Simulator not found"
- Open Xcode and install iOS simulators
- Or run: `xcrun simctl list devices`

## Next Steps
- See [_docs/IOS_SETUP.md](IOS_SETUP.md) for detailed setup instructions
- See [README.md](../../README.md) for full project documentation

