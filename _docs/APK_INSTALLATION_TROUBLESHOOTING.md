# APK Installation Troubleshooting Guide

This guide helps you diagnose and fix common APK installation issues.

## Common Installation Errors and Solutions

### 1. "App not installed" or "Installation failed"

#### Cause A: Package Conflict (Most Common)
**Problem:** An app with the same package name (`com.propsbible`) is already installed, but signed with a different key.

**Solution:**
1. **Uninstall the existing app first:**
   ```powershell
   # Via ADB (if device is connected)
   adb uninstall com.propsbible
   ```
   
   Or manually:
   - Go to Settings > Apps > Find "Props Bible" or "thepropslist"
   - Tap "Uninstall"
   - Then try installing the new APK

2. **If you can't find the app but still get the error:**
   ```powershell
   # Check if app is installed
   adb shell pm list packages | findstr propsbible
   
   # Force uninstall (requires root or ADB with proper permissions)
   adb uninstall com.propsbible
   ```

#### Cause B: Unknown Sources Not Enabled
**Problem:** Android device blocks installation from unknown sources.

**Solution:**
1. Go to **Settings > Security** (or **Settings > Apps > Special access**)
2. Enable **"Install unknown apps"** or **"Unknown sources"**
3. If prompted, select the app you're using to install (File Manager, Chrome, etc.)
4. Try installing again

**For Android 8.0+ (Oreo):**
- You need to enable "Install unknown apps" for the specific app you're using to install the APK
- Settings > Apps > [Your File Manager] > Install unknown apps > Enable

#### Cause C: Signing Key Mismatch
**Problem:** The APK is signed with a different key than a previously installed version.

**Solution:**
- Uninstall the existing app completely (see Cause A)
- Then install the new APK

#### Cause D: Corrupted APK
**Problem:** The APK file is corrupted or incomplete.

**Solution:**
1. **Rebuild the APK:**
   ```powershell
   npm run android:build:release:clean
   ```

2. **Verify APK integrity:**
   ```powershell
   # Check if APK exists and has reasonable size (should be > 10MB)
   Get-Item android\app\build\outputs\apk\release\app-release.apk | Select-Object Name, @{Name="Size (MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
   ```

3. **Transfer APK properly:**
   - Use USB file transfer (MTP mode)
   - Or use ADB push:
     ```powershell
     adb push android\app\build\outputs\apk\release\app-release.apk /sdcard/Download/app-release.apk
     ```

### 2. "App not installed as package appears to be invalid"

#### Cause: Corrupted or Incomplete APK
**Solution:**
1. Clean rebuild:
   ```powershell
   npm run android:build:release:clean
   ```

2. Verify the build completed successfully (check for errors in the build output)

3. Try installing via ADB for better error messages:
   ```powershell
   adb install -r android\app\build\outputs\apk\release\app-release.apk
   ```
   The `-r` flag replaces existing app if present.

### 3. "INSTALL_FAILED_INSUFFICIENT_STORAGE"

#### Cause: Not enough storage space on device
**Solution:**
- Free up space on your device (at least 100MB recommended)
- Check available space: Settings > Storage

### 4. "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

#### Cause: Version code conflict or incompatible update
**Solution:**
1. Uninstall existing app completely
2. Install the new APK
3. If issue persists, check version code in `android/app/build.gradle`:
   ```gradle
   versionCode 1  // Make sure this increments for each release
   ```

### 5. "INSTALL_PARSE_FAILED_NO_CERTIFICATES"

#### Cause: APK is not properly signed
**Solution:**
1. Verify signing configuration in `android/app/build.gradle`
2. Rebuild the APK:
   ```powershell
   npm run android:build:release:clean
   ```

3. Check if debug keystore exists:
   ```powershell
   Test-Path android\app\debug.keystore
   ```

### 6. Architecture Mismatch

#### Cause: APK doesn't support your device's CPU architecture
**Current Configuration:**
- The app builds for: `armeabi-v7a` and `arm64-v8a` (covers most modern devices)
- If you need x86/x86_64 (for emulators), see `android/gradle.properties`

**Solution:**
- Most physical devices use ARM architecture, so this shouldn't be an issue
- For emulators, you may need to build with x86 support

### 7. Android Version Incompatibility

#### Cause: Device Android version is too old
**Check minimum SDK:**
- See `android/build.gradle` for `minSdkVersion`
- Current minimum: Check your root `build.gradle` file

**Solution:**
- Update your device's Android version, or
- Lower the `minSdkVersion` in build configuration (not recommended)

## Installation Methods

### Method 1: Direct File Installation (Recommended for Testing)
1. Transfer APK to device (USB, email, cloud storage)
2. Open file manager on device
3. Navigate to APK location
4. Tap the APK file
5. Tap "Install"

### Method 2: ADB Installation (Best for Development)
```powershell
# Basic install
adb install android\app\build\outputs\apk\release\app-release.apk

# Replace existing app
adb install -r android\app\build\outputs\apk\release\app-release.apk

# Install with more verbose output
adb install -r -d android\app\build\outputs\apk\release\app-release.apk
```

**ADB Flags:**
- `-r`: Replace existing application
- `-d`: Allow version code downgrade
- `-g`: Grant all runtime permissions

### Method 3: Check Installation Status
```powershell
# List installed packages
adb shell pm list packages | findstr propsbible

# Get app info
adb shell dumpsys package com.propsbible

# Check if app is installed
adb shell pm path com.propsbible
```

## Diagnostic Commands

### Check APK Information
```powershell
# Get APK size and details
Get-Item android\app\build\outputs\apk\release\app-release.apk | 
    Select-Object Name, Length, LastWriteTime, @{Name="Size (MB)";Expression={[math]::Round($_.Length/1MB, 2)}}

# Verify APK signature (requires Java keytool)
keytool -printcert -jarfile android\app\build\outputs\apk\release\app-release.apk
```

### Check Device Compatibility
```powershell
# Get device info
adb shell getprop ro.product.model
adb shell getprop ro.build.version.sdk
adb shell getprop ro.product.cpu.abi

# Check available storage
adb shell df /data
```

### Get Detailed Installation Error
```powershell
# Install with verbose output
adb install -r android\app\build\outputs\apk\release\app-release.apk

# Check logcat for errors
adb logcat | findstr "PackageManager"
```

## Quick Fix Checklist

1. ✅ **Uninstall existing app** (if present)
2. ✅ **Enable "Install unknown apps"** in device settings
3. ✅ **Rebuild APK** using clean build:
   ```powershell
   npm run android:build:release:clean
   ```
4. ✅ **Verify APK exists** and has reasonable size (>10MB)
5. ✅ **Try ADB install** for better error messages:
   ```powershell
   adb install -r android\app\build\outputs\apk\release\app-release.apk
   ```
6. ✅ **Check device storage** (need at least 100MB free)
7. ✅ **Check Android version** compatibility
8. ✅ **Check logcat** for detailed errors:
   ```powershell
   adb logcat | findstr -i "install\|package\|error"
   ```

## Still Having Issues?

If none of the above solutions work:

1. **Get the exact error message:**
   ```powershell
   adb install android\app\build\outputs\apk\release\app-release.apk
   ```
   Copy the full error message.

2. **Check logcat for detailed errors:**
   ```powershell
   adb logcat -c  # Clear log
   # Try installing again
   adb install android\app\build\outputs\apk\release\app-release.apk
   adb logcat -d | findstr -i "error\|exception\|failed"
   ```

3. **Verify build configuration:**
   - Check `android/app/build.gradle` for signing config
   - Verify `applicationId` is `com.propsbible`
   - Check `versionCode` and `versionName`

4. **Try building debug APK for comparison:**
   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   cd ..
   adb install android\app\build\outputs\apk\debug\app-debug.apk
   ```

## Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `INSTALL_FAILED_ALREADY_EXISTS` | App already installed | Uninstall first: `adb uninstall com.propsbible` |
| `INSTALL_FAILED_INVALID_APK` | Corrupted APK | Rebuild APK |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | Not enough space | Free up storage |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Version conflict | Uninstall and reinstall |
| `INSTALL_PARSE_FAILED_NO_CERTIFICATES` | Not signed | Check signing config |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | Installing older version | Use `-d` flag or uninstall first |

---

**Last Updated:** 2025-01-27


