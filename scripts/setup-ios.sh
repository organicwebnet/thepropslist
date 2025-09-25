#!/bin/bash

# iOS Setup Script for The Props List
# Run this script on macOS to set up iOS development

echo "🍎 Setting up iOS development for The Props List..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS for iOS development"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the Mac App Store"
    exit 1
fi

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Install iOS dependencies
echo "📱 Installing iOS dependencies..."
npx expo install expo-camera expo-image-picker expo-notifications expo-location expo-av expo-print expo-sharing expo-file-system expo-document-picker expo-media-library expo-local-authentication expo-splash-screen

# Prebuild iOS project
echo "🔨 Generating iOS project files..."
npx expo prebuild --platform ios --clean

# Install CocoaPods dependencies
echo "📦 Installing CocoaPods dependencies..."
cd ios && pod install && cd ..

echo "✅ iOS setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your GoogleService-Info.plist to the ios/ directory"
echo "2. Update your .env file with iOS Firebase configuration"
echo "3. Run 'npx expo run:ios' to start the iOS simulator"
echo ""
echo "For detailed instructions, see _docs/IOS_SETUP.md"

