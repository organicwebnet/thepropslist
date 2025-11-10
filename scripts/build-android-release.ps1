# Android Release Build Script
# This script builds a native Android release APK without using Expo

Write-Host "Building Android Release APK..." -ForegroundColor Green

# Navigate to android directory
Set-Location android

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
.\gradlew.bat clean

# Build release APK
Write-Host "Building release APK..." -ForegroundColor Yellow
.\gradlew.bat assembleRelease

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build successful!" -ForegroundColor Green
    Write-Host "`nAPK Location:" -ForegroundColor Cyan
    Write-Host "  android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor White
    
    # Get file size
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $fileSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "`nFile Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    }
    
    Write-Host "`nYou can install this APK on any Android device for testing." -ForegroundColor Green
} else {
    Write-Host "`n❌ Build failed! Check the error messages above." -ForegroundColor Red
    exit 1
}

# Return to project root
Set-Location ..






