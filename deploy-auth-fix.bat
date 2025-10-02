@echo off
echo ========================================
echo DEPLOYING AUTHENTICATION FIXES
echo ========================================

echo.
echo 1. Building web application...
call npm run build

echo.
echo 2. Deploying to Firebase...
call firebase deploy --only hosting

echo.
echo 3. Deployment complete!
echo.
echo Test URLs:
echo - Primary: https://props-bible-app-1c1cb.web.app
echo - Backup: https://props-bible-app-1c1cb.firebaseapp.com
echo.
echo Next steps:
echo 1. Test Google Sign-in on the deployed site
echo 2. Check Firebase Console for authorized domains
echo 3. Update Google Cloud Console OAuth settings
echo.
pause
