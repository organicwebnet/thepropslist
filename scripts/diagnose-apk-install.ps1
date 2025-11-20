# APK Installation Diagnostic Script
# This script helps diagnose why an APK is not installing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APK Installation Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apkPath = "android\app\build\outputs\apk\release\app-release.apk"

# Check if APK exists
Write-Host "1. Checking if APK exists..." -ForegroundColor Yellow
if (Test-Path $apkPath) {
    $apkInfo = Get-Item $apkPath
    $sizeMB = [math]::Round($apkInfo.Length / 1MB, 2)
    Write-Host "   ✅ APK found: $apkPath" -ForegroundColor Green
    Write-Host "   Size: $sizeMB MB" -ForegroundColor Green
    Write-Host "   Last Modified: $($apkInfo.LastWriteTime)" -ForegroundColor Green
    
    if ($sizeMB -lt 1) {
        Write-Host "   ⚠️  WARNING: APK size is very small, may be corrupted!" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ APK not found at: $apkPath" -ForegroundColor Red
    Write-Host "   Run: npm run android:build:release" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check ADB connection
Write-Host "2. Checking ADB connection..." -ForegroundColor Yellow
$adbCheck = adb devices 2>&1
if ($LASTEXITCODE -eq 0) {
    $devices = adb devices | Select-String "device$"
    if ($devices) {
        Write-Host "   ✅ Device connected via ADB" -ForegroundColor Green
        $deviceInfo = adb shell getprop ro.product.model 2>&1
        if ($deviceInfo -and -not $deviceInfo.ToString().Contains("error")) {
            Write-Host "   Device: $deviceInfo" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️  No device connected via ADB" -ForegroundColor Yellow
        Write-Host "   You can still check APK, but installation test requires ADB" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  ADB not found or not working" -ForegroundColor Yellow
    Write-Host "   Install Android SDK Platform Tools to use ADB" -ForegroundColor Yellow
}

Write-Host ""

# Check if app is already installed
Write-Host "3. Checking if app is already installed..." -ForegroundColor Yellow
if ($devices) {
    $installed = adb shell pm list packages | Select-String "com.propsbible"
    if ($installed) {
        Write-Host "   ⚠️  App is already installed!" -ForegroundColor Yellow
        Write-Host "   This may cause installation conflicts." -ForegroundColor Yellow
        Write-Host "   Solution: Uninstall first with: adb uninstall com.propsbible" -ForegroundColor Cyan
    } else {
        Write-Host "   ✅ App is not currently installed" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Cannot check (no ADB connection)" -ForegroundColor Yellow
}

Write-Host ""

# Check device storage
Write-Host "4. Checking device storage..." -ForegroundColor Yellow
if ($devices) {
    $storage = adb shell df /data 2>&1 | Select-String "\d+%"
    if ($storage) {
        Write-Host "   Storage info: $storage" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️  Could not get storage info" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Cannot check (no ADB connection)" -ForegroundColor Yellow
}

Write-Host ""

# Check Android version
Write-Host "5. Checking device Android version..." -ForegroundColor Yellow
if ($devices) {
    $sdkVersion = adb shell getprop ro.build.version.sdk 2>&1
    $androidVersion = adb shell getprop ro.build.version.release 2>&1
    if ($sdkVersion -and -not $sdkVersion.ToString().Contains("error")) {
        Write-Host "   Android SDK: $sdkVersion" -ForegroundColor Cyan
        Write-Host "   Android Version: $androidVersion" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠️  Cannot check (no ADB connection)" -ForegroundColor Yellow
}

Write-Host ""

# Check architecture
Write-Host "6. Checking device architecture..." -ForegroundColor Yellow
if ($devices) {
    $arch = adb shell getprop ro.product.cpu.abi 2>&1
    if ($arch -and -not $arch.ToString().Contains("error")) {
        Write-Host "   Architecture: $arch" -ForegroundColor Cyan
        Write-Host "   APK supports: armeabi-v7a, arm64-v8a" -ForegroundColor Cyan
        if ($arch -match "x86") {
            Write-Host "   ⚠️  WARNING: Device is x86, but APK is built for ARM!" -ForegroundColor Red
            Write-Host "   You may need to rebuild with x86 support" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ⚠️  Cannot check (no ADB connection)" -ForegroundColor Yellow
}

Write-Host ""

# Try to get installation error
Write-Host "7. Attempting installation test..." -ForegroundColor Yellow
if ($devices) {
    Write-Host "   Attempting to install APK..." -ForegroundColor Cyan
    $installOutput = adb install -r $apkPath 2>&1
    Write-Host "   Output:" -ForegroundColor Cyan
    Write-Host $installOutput
    
    if ($installOutput -match "Success") {
        Write-Host "   ✅ Installation successful!" -ForegroundColor Green
    } elseif ($installOutput -match "INSTALL_FAILED_ALREADY_EXISTS") {
        Write-Host "   ❌ Error: App already exists with different signature" -ForegroundColor Red
        Write-Host "   Solution: adb uninstall com.propsbible" -ForegroundColor Yellow
    } elseif ($installOutput -match "INSTALL_FAILED_INSUFFICIENT_STORAGE") {
        Write-Host "   ❌ Error: Not enough storage space" -ForegroundColor Red
        Write-Host "   Solution: Free up space on device" -ForegroundColor Yellow
    } elseif ($installOutput -match "INSTALL_PARSE_FAILED") {
        Write-Host "   ❌ Error: APK parsing failed (may be corrupted)" -ForegroundColor Red
        Write-Host "   Solution: Rebuild APK with: npm run android:build:release:clean" -ForegroundColor Yellow
    } elseif ($installOutput -match "INSTALL_FAILED") {
        Write-Host "   ❌ Installation failed - see error above" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️  Installation status unclear - check output above" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Cannot test installation (no ADB connection)" -ForegroundColor Yellow
    Write-Host "   Manual installation steps:" -ForegroundColor Cyan
    Write-Host "   1. Enable 'Install unknown apps' in device settings" -ForegroundColor Cyan
    Write-Host "   2. Transfer APK to device" -ForegroundColor Cyan
    Write-Host "   3. Open APK file and tap Install" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more help, see: _docs/APK_INSTALLATION_TROUBLESHOOTING.md" -ForegroundColor Yellow

