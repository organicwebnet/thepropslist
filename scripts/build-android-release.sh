#!/bin/bash
# Android Release Build Script
# This script builds a native Android release APK without using Expo

echo "Building Android Release APK..."

# Navigate to android directory
cd android

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "APK Location:"
    echo "  android/app/build/outputs/apk/release/app-release.apk"
    
    # Get file size
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        FILE_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo ""
        echo "File Size: $FILE_SIZE"
    fi
    
    echo ""
    echo "You can install this APK on any Android device for testing."
else
    echo ""
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi

# Return to project root
cd ..






