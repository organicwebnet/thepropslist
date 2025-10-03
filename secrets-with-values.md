# Secrets with Actual Values - Copy These to New Repository

## ✅ VERIFIED VALUES - These are correct:

### Critical Firebase Secrets:
- **`VITE_FIREBASE_API_KEY`**: `AIzaSyDDdMvYxnBpCmlWW-I-S96lxWknJWDaV98` ✅ (from env.example)
- **`VITE_FIREBASE_AUTH_DOMAIN`**: `props-bible-app-1c1cb.firebaseapp.com` ✅ (from env.example)
- **`VITE_FIREBASE_PROJECT_ID`**: `props-bible-app-1c1cb` ✅ (from env.example)
- **`VITE_FIREBASE_STORAGE_BUCKET`**: `props-bible-app-1c1cb.firebasestorage.app` ✅ (from env.example)
- **`VITE_FIREBASE_MESSAGING_SENDER_ID`**: `162597141271` ✅ (from env.example)
- **`VITE_FIREBASE_APP_ID`**: `1:162597141271:web:4a8f66c0880f5106695552` ✅ (from env.example)

### Google Services:
- **`VITE_GOOGLE_API_KEY`**: `AIzaSyBNVEjIgEme7TVUZeyIMkf_JnVEKkDIksI` ✅ (from google-services.json)
- **`VITE_GOOGLE_CLIENT_ID`**: `162597141271-lhl338e6m7sf4m81l5ev271k8rmqv0da.apps.googleusercontent.com` ✅ (from env.example)

### Additional Firebase Config:
- **`VITE_FIREBASE_MEASUREMENT_ID`**: `G-L01PPH8D2Z` (optional, for analytics)

## 🔧 How to Copy:

1. Go to: https://github.com/organicwebnet/thepropslist/settings/secrets/actions
2. Click "New repository secret"
3. Copy each name and value from above
4. Click "Add secret"

## ⚠️ Secrets You Still Need to Get from Old Repository:

These are not in your config files, so you'll need to get them from the old GitHub secrets:

- `FIREBASE_SERVICE_ACCOUNT` (alternative to the BASE64 one you have)
- `FIREBASE_TOKEN` (Firebase deployment token)
- `VITE_TINYMCE_API_KEY` (TinyMCE editor)
- `FEEDBACK_GITHUB_REPO` (feedback system)
- `FEEDBACK_GITHUB_TOKEN` (feedback system)
- `NETLIFY_AUTH_TOKEN` (if you use Netlify)
- `NETLIFY_SITE_ID` (if you use Netlify)

## ✅ Already Copied:
- `FIREBASE_SERVICE_ACCOUNT_BASE64` ✅

## 🎯 Priority:
1. Copy the Firebase secrets above first (these are the most critical)
2. Copy the Google services secrets
3. Get the remaining secrets from the old repository as needed

## 📝 Notes:
- All the values above are from your `env.example` and `google-services.json` files
- These are the same values that were in your old repository
- The Firebase project ID is `props-bible-app-1c1cb` (this won't change)
