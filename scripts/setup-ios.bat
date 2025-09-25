@echo off
REM iOS Setup Script for The Props List (Windows)
REM This script prepares the project for iOS development on macOS

echo 🍎 Preparing iOS development for The Props List...

REM Check if we're on Windows
if not "%OS%"=="Windows_NT" (
    echo ❌ This script is for Windows. Use setup-ios.sh on macOS
    exit /b 1
)

echo 📱 Installing iOS dependencies...
npx expo install expo-camera expo-image-picker expo-notifications expo-location expo-av expo-print expo-sharing expo-file-system expo-document-picker expo-media-library expo-local-authentication expo-splash-screen

echo ✅ iOS dependencies installed!
echo.
echo ⚠️  IMPORTANT: iOS development requires macOS
echo.
echo Next steps (on macOS):
echo 1. Copy this project to a Mac
echo 2. Run: chmod +x scripts/setup-ios.sh
echo 3. Run: ./scripts/setup-ios.sh
echo 4. Add your GoogleService-Info.plist to the ios/ directory
echo 5. Update your .env file with iOS Firebase configuration
echo 6. Run: npx expo run:ios
echo.
echo For detailed instructions, see _docs/IOS_SETUP.md

