# Android Release Build Guide

This guide explains how to build a native Android release APK for testing without using Expo.

## Quick Start

### Option 1: Using npm script (Windows)
```powershell
npm run android:build:release
```

### Option 2: Using PowerShell script
```powershell
.\scripts\build-android-release.ps1
```

### Option 3: Using Gradle directly (Windows)
```powershell
cd android
.\gradlew.bat assembleRelease
cd ..
```

### Option 4: Using Gradle directly (Linux/Mac)
```bash
cd android
./gradlew assembleRelease
cd ..
```

## Build Output Location

The release APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Installing the APK

### On Android Device:
1. Enable "Install from Unknown Sources" in your device settings
2. Transfer the APK to your device (via USB, email, or cloud storage)
3. Open the APK file on your device and tap "Install"

### Via ADB (Android Debug Bridge):
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Build Configuration

### Current Setup
- **Package Name:** `com.propsbible`
- **Version Code:** 1
- **Version Name:** 1.0.0
- **Signing:** Currently using debug keystore (fine for testing)

### Signing Configuration

The release build configuration now supports production keystore signing. By default, it falls back to debug keystore if no release keystore is configured (acceptable for development/testing).

**For Production:**
See the comprehensive guide: [`android/RELEASE_KEYSTORE_SETUP.md`](../../android/RELEASE_KEYSTORE_SETUP.md)

**Quick Setup:**
1. Generate a release keystore (see detailed guide above)
2. Add keystore properties to `android/gradle.properties`:
   ```properties
   MYAPP_RELEASE_STORE_FILE=release.keystore
   MYAPP_RELEASE_KEY_ALIAS=propsbible-release
   MYAPP_RELEASE_STORE_PASSWORD=your-store-password
   MYAPP_RELEASE_KEY_PASSWORD=your-key-password
   ```

The build system will automatically use the release keystore when these properties are configured.

## Build Variants

### Release APK (Recommended for Testing)
```powershell
npm run android:build:release
```
- **Location:** `android/app/build/outputs/apk/release/app-release.apk`
- **Size:** ~20-50 MB (depending on assets)
- **Optimised:** Yes (minified, obfuscated if ProGuard enabled)

### Debug APK
```powershell
cd android
.\gradlew.bat assembleDebug
```
- **Location:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Size:** Larger (includes debug symbols)
- **Optimised:** No

## Troubleshooting

### Build Fails with "SDK not found"
1. Ensure Android SDK is installed
2. Set `ANDROID_HOME` environment variable:
   ```powershell
   $env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"
   ```

### Build Fails with "Gradle sync failed"
1. Clean the build:
   ```powershell
   cd android
   .\gradlew.bat clean
   cd ..
   ```

2. Rebuild:
   ```powershell
   npm run android:build:release:clean
   ```

### Build is Slow
- First build takes longer (downloads dependencies)
- Subsequent builds are faster
- Use `--parallel` flag if available

### APK is Too Large
- ProGuard/R8 is already configured in `android/app/build.gradle`
- To enable minification, set `android.enableProguardInReleaseBuilds=true` in `android/gradle.properties`
- Resource shrinking is already enabled by default for release builds
- Current configuration:
  ```gradle
  buildTypes {
      release {
          shrinkResources true  // Already enabled
          minifyEnabled enableProguardInReleaseBuilds  // Controlled by gradle.properties
          proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
          crunchPngs true  // Already enabled
      }
  }
  ```

## File Size Information

After building, you can check the APK size:
```powershell
Get-Item android\app\build\outputs\apk\release\app-release.apk | Select-Object Name, @{Name="Size (MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
```

## Next Steps

1. **Test the APK** on a physical device
2. **Set up proper signing** for production releases
3. **Configure ProGuard** if needed for code obfuscation
4. **Build AAB** for Google Play Store (if needed):
   ```powershell
   cd android
   .\gradlew.bat bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Notes

- The APK is signed with debug keystore (acceptable for testing)
- For production, you must use a release keystore
- Keep your release keystore secure and backed up
- Never commit keystore files to version control

---

**Last Updated:** 2025-01-27





