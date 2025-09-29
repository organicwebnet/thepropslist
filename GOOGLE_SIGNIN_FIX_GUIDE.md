# Google Sign-In Fix Guide

## Issue: Developer Error in Google Sign-In

The "Developer Error" is typically caused by incorrect configuration in Firebase Console or missing SHA-1 fingerprints.

## Steps to Fix:

### 1. Add SHA-1 Fingerprint to Firebase Console

**Your Debug SHA-1 Fingerprint:**
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `props-bible-app-1c1cb`
3. Go to **Project Settings** (gear icon)
4. Scroll down to **Your apps** section
5. Find your Android app (`com.propsbible`)
6. Click **Add fingerprint**
7. Paste the SHA-1 fingerprint above
8. Click **Save**

### 2. Get the Correct Web Client ID

**Steps:**
1. In Firebase Console, go to **Authentication**
2. Click **Sign-in method** tab
3. Click on **Google** provider
4. Scroll down to **Web SDK configuration**
5. Copy the **Web client ID** (it should look like: `162597141271-xxxxxxxxxx.apps.googleusercontent.com`)

### 3. Set Environment Variable

Create or update your `.env` file in the project root:

```bash
# Add this line to your .env file
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id-from-firebase-console
```

**Important:** Replace `your-web-client-id-from-firebase-console` with the actual Web Client ID from step 2.

### 4. Clean and Rebuild

After making these changes:

```bash
# Clean the project
npx expo run:android --clear

# Or if using development build
npx expo start --clear
```

## Common Issues:

### Issue 1: Wrong Client ID
- **Problem:** Using Android client ID instead of Web client ID
- **Solution:** Use the Web client ID from Firebase Console > Authentication > Google > Web SDK configuration

### Issue 2: Missing SHA-1 Fingerprint
- **Problem:** SHA-1 fingerprint not added to Firebase Console
- **Solution:** Add the debug SHA-1 fingerprint to Firebase Console

### Issue 3: Package Name Mismatch
- **Problem:** Package name in Firebase doesn't match app
- **Solution:** Ensure package name is `com.propsbible` in both places

## Verification:

After following these steps, Google Sign-In should work without the "Developer Error". The app will:
1. Show the Google Sign-In dialog
2. Allow you to select a Google account
3. Successfully authenticate with Firebase

## Production Build:

For production builds, you'll also need to:
1. Generate a release keystore
2. Get the SHA-1 fingerprint of the release keystore
3. Add that SHA-1 fingerprint to Firebase Console as well

## Debugging:

If you still get errors, check:
1. Firebase Console logs
2. Android Studio logcat for detailed error messages
3. Ensure all environment variables are set correctly
4. Verify the google-services.json file is up to date

