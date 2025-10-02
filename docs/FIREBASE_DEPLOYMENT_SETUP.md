# Firebase Deployment Setup Guide

This guide explains how to set up Firebase deployment for GitHub Actions.

## Current Status

The CI/CD pipeline is configured to:
- ✅ **Build and test** the application (always runs)
- ⚠️ **Deploy to Firebase** (only if service account is configured)
- ✅ **Continue successfully** even without deployment

## Setting Up Firebase Deployment

### Option 1: Using Firebase Service Account (Recommended)

1. **Generate Service Account Key**:
   ```bash
   # In Firebase Console
   # Go to Project Settings > Service Accounts
   # Click "Generate new private key"
   # Download the JSON file
   ```

2. **Add to GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Add one of these secrets:
     - `FIREBASE_SERVICE_ACCOUNT_BASE64`: Base64 encoded service account JSON
     - `FIREBASE_SERVICE_ACCOUNT`: Raw service account JSON content

3. **Base64 Encoding (if using FIREBASE_SERVICE_ACCOUNT_BASE64)**:
   ```bash
   # On Windows (PowerShell)
   $content = Get-Content -Path "path/to/service-account.json" -Raw
   $encoded = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
   Write-Output $encoded
   
   # On macOS/Linux
   base64 -i path/to/service-account.json
   ```

### Option 2: Using Firebase CLI Authentication

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy manually**:
   ```bash
   firebase deploy --only hosting --project props-bible-app-1c1cb
   ```

## Current Workflow Behavior

### With Service Account Configured:
- ✅ Builds the application
- ✅ Runs all tests
- ✅ Deploys to Firebase
- ✅ Reports success

### Without Service Account:
- ✅ Builds the application
- ✅ Runs all tests
- ⏭️ Skips Firebase deployment
- ✅ Reports success (with deployment skip notice)

## Troubleshooting

### Common Issues:

1. **"No service account secret set"**:
   - Add `FIREBASE_SERVICE_ACCOUNT_BASE64` or `FIREBASE_SERVICE_ACCOUNT` to GitHub Secrets

2. **"Invalid service account JSON"**:
   - Check that the JSON is valid
   - Ensure it's properly base64 encoded (if using BASE64 option)

3. **"Permission denied"**:
   - Ensure the service account has the correct Firebase permissions
   - Check that the project ID matches

### Verification:

The workflow will show clear messages:
- ✅ "Firebase deployment will proceed" (if configured)
- ⚠️ "Skipping Firebase deployment" (if not configured)

## Benefits of This Approach

1. **Graceful Degradation**: CI/CD works even without Firebase setup
2. **Clear Feedback**: Users know exactly what's configured and what's not
3. **Easy Setup**: Simple secret configuration enables deployment
4. **No Failures**: Build and tests always run successfully

## Next Steps

1. **For Development**: The current setup works perfectly - builds and tests run
2. **For Production**: Add Firebase service account secret to enable deployment
3. **For Teams**: Share this guide with team members who need deployment access
