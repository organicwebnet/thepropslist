# Authentication Troubleshooting Guide

## Critical Issues Fixed:

### 1. ✅ Missing Google OAuth Client ID
- **Problem**: Web app was missing Google OAuth client ID configuration
- **Fix**: Added `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_WEB_CLIENT_ID` to environment variables
- **Location**: `.env` file in web-app directory

### 2. ✅ Improved Error Handling
- **Problem**: Generic error messages for authentication failures
- **Fix**: Added specific error handling for:
  - SSL certificate errors (`NET::ERR_CERT_COMMON_NAME_INVALID`)
  - Domain authorization issues (`auth/unauthorized-domain`)
  - Network failures (`auth/network-request-failed`)
  - Popup blocking (`auth/popup-blocked`)
  - Account conflicts (`auth/account-exists-with-different-credential`)
- **Files Updated**:
  - `web-app/src/contexts/WebAuthContext.tsx`
  - `src/App.tsx`
  - `src/lib/firebase.ts`

### 3. ✅ Firebase Hosting Domain Configuration
- **Problem**: Redirects pointing to wrong domain causing SSL issues
- **Fix**: Updated `firebase.json` redirects to use correct Firebase hosting domain
- **Before**: `https://app.thepropslist.uk`
- **After**: `https://props-bible-app-1c1cb.web.app`

## Remaining Issues to Address:

### 1. 🔴 SSL Certificate Configuration
- **Issue**: `NET::ERR_CERT_COMMON_NAME_INVALID` error
- **Root Cause**: Domain mismatch between configured and actual domains
- **Solution**: Configure custom domain in Firebase Console or fix domain configuration

### 2. 🔴 Google OAuth Domain Authorization
- **Issue**: Domain not authorized for Google Sign-in
- **Solution**: Add authorized domains in:
  - Google Cloud Console > APIs & Services > Credentials
  - Firebase Console > Authentication > Sign-in method > Google

### 3. 🔴 Environment Variable Loading
- **Issue**: Vite may not be loading environment variables correctly
- **Solution**: Verify `.env` file is in correct location and properly formatted

## Testing Checklist:

### ✅ Basic Authentication
- [ ] Email/password sign-in works
- [ ] Google Sign-in popup opens
- [ ] Apple Sign-in works (if configured)

### 🔴 SSL Certificate
- [ ] No SSL certificate errors
- [ ] HTTPS connection is secure
- [ ] Domain matches certificate

### 🔴 Google OAuth
- [ ] Google Sign-in popup loads without errors
- [ ] User can complete Google authentication
- [ ] User profile data is retrieved correctly

### 🔴 Error Handling
- [ ] User-friendly error messages display
- [ ] Network errors are handled gracefully
- [ ] SSL errors provide clear guidance

## Emergency Workarounds:

### 1. Temporary Domain Fix
If SSL issues persist, temporarily use the Firebase hosting domain directly:
- URL: `https://props-bible-app-1c1cb.web.app`
- Update all references to use this domain

### 2. Disable Redirects
Temporarily comment out redirects in `firebase.json` to avoid domain conflicts.

### 3. Fallback Authentication
Implement email/password as primary authentication method while fixing OAuth issues.

## Next Steps:

1. **Deploy Changes**: Deploy the updated configuration to Firebase
2. **Test Authentication**: Test all authentication flows
3. **Configure Custom Domain**: Set up proper custom domain with SSL
4. **Update OAuth Settings**: Configure authorized domains in Google Console
5. **Monitor Errors**: Set up error monitoring for authentication issues

## Support Contacts:
- Firebase Support: https://firebase.google.com/support
- Google Cloud Support: https://cloud.google.com/support
- Domain/SSL Issues: Contact domain registrar or hosting provider
