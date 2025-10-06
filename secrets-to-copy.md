# Secrets to Copy from Old Repository

## Instructions:
1. Go to: https://github.com/organicwebnet/thepropslist/settings/secrets/actions
2. For each secret below, click on it, reveal the value, and copy it
3. Go to: https://github.com/organicwebnet/thepropslist/settings/secrets/actions
4. Click "New repository secret" and paste the name and value
5. Check off each secret as you copy it

## Critical Firebase Secrets (Copy These First):
- [ ] `FIREBASE_SERVICE_ACCOUNT` - Alternative Firebase service account
- [ ] `FIREBASE_TOKEN` - Firebase deployment token
- [ ] `VITE_FIREBASE_API_KEY` - Firebase API key
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- [ ] `VITE_FIREBASE_PROJECT_ID` - Firebase project ID (should be: props-bible-app-1c1cb)
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- [ ] `VITE_FIREBASE_APP_ID` - Firebase app ID

## Google Services:
- [ ] `VITE_GOOGLE_API_KEY` - Google API key
- [ ] `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Other Services:
- [ ] `VITE_TINYMCE_API_KEY` - TinyMCE editor API key
- [ ] `FEEDBACK_GITHUB_REPO` - Feedback repository
- [ ] `FEEDBACK_GITHUB_TOKEN` - Feedback GitHub token
- [ ] `NETLIFY_AUTH_TOKEN` - Netlify authentication token
- [ ] `NETLIFY_SITE_ID` - Netlify site ID

## Already Copied:
- [x] `FIREBASE_SERVICE_ACCOUNT_BASE64` - ✅ Already copied

## Notes:
- Copy the critical Firebase secrets first - these are needed for deployments
- The Google services secrets are needed for authentication
- Other secrets can be copied as needed for specific features
- All secret names must match exactly (case-sensitive)

## Quick Links:
- **Old Repository Secrets**: https://github.com/organicwebnet/thepropslist/settings/secrets/actions
- **New Repository Secrets**: https://github.com/organicwebnet/thepropslist/settings/secrets/actions
