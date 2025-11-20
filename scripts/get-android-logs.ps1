# Script to capture Android device logs for debugging
# Usage: .\scripts\get-android-logs.ps1

Write-Host "Checking for connected Android devices..." -ForegroundColor Cyan

# Check if device is connected
$devices = adb devices
if ($devices -match "device$") {
    Write-Host "Device found! Capturing logs..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop logging" -ForegroundColor Yellow
    Write-Host ""
    
    # Clear logcat buffer
    adb logcat -c
    
    # Start logcat with filters for the app
    adb logcat -v time | Select-String -Pattern "propsbible|ReactNative|ReactNativeJS|AndroidRuntime|FATAL|ERROR|MainApplication|MainActivity" -Context 2,2
} else {
    Write-Host "No Android device found!" -ForegroundColor Red
    Write-Host "Please connect your device via USB and enable USB debugging." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To check devices: adb devices" -ForegroundColor Cyan
}

