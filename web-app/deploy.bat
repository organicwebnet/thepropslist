@echo off
REM Props Bible Web App Deployment Script for Windows

echo 🚀 Starting deployment process...

REM Build the application
echo 📦 Building application...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Aborting deployment.
    exit /b 1
)

echo ✅ Build completed successfully

REM Deploy to Firebase Hosting
echo 🌐 Deploying to Firebase Hosting...
cd ..
call firebase deploy --only hosting:app

if %errorlevel% equ 0 (
    echo 🎉 Deployment completed successfully!
    echo 🌍 App is live at: https://props-bible-app-1c1cb.web.app
) else (
    echo ❌ Deployment failed.
    exit /b 1
)

