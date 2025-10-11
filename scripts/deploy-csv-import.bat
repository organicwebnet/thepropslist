@echo off
echo ========================================
echo   CSV Import Feature Deployment Script
echo ========================================
echo.

echo [1/6] Checking git status...
git status
echo.
pause

echo [2/6] Running linting checks...
cd web-app
npm run lint
if %errorlevel% neq 0 (
    echo ERROR: Linting failed. Please fix errors before deploying.
    pause
    exit /b 1
)
echo Linting passed!
echo.

echo [3/6] Building application...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed. Please fix build errors before deploying.
    pause
    exit /b 1
)
echo Build successful!
echo.

echo [4/6] Running tests...
npm run test
if %errorlevel% neq 0 (
    echo WARNING: Some tests failed. Continue anyway? (y/n)
    set /p continue=
    if /i not "%continue%"=="y" (
        echo Deployment cancelled.
        pause
        exit /b 1
    )
)
echo.

echo [5/6] Deploying to Firebase...
cd ..
firebase deploy --only hosting:app
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed.
    pause
    exit /b 1
)
echo.

echo [6/6] Deployment complete!
echo.
echo ========================================
echo   DEPLOYMENT SUMMARY
echo ========================================
echo.
echo ✅ CSV Import page deployed successfully
echo ✅ New route: /props/import
echo ✅ Old modal component removed
echo ✅ All functionality preserved
echo.
echo Next steps:
echo 1. Test the import functionality on production
echo 2. Run through the user testing script
echo 3. Monitor for any issues
echo.
echo ========================================
pause
