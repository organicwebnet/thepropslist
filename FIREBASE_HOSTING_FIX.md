# Firebase Hosting SSL Certificate Fix

## Critical Issues Identified:

### 1. Domain Mismatch
- **Problem**: Firebase hosting redirects point to `app.thepropslist.uk` but the actual domain is `props-bible-app-1c1cb.firebaseapp.com`
- **Error**: `NET::ERR_CERT_COMMON_NAME_INVALID` with duplicated domain in URL

### 2. SSL Certificate Configuration
- **Problem**: The SSL certificate is not properly configured for the Firebase hosting domain
- **Solution**: Need to configure custom domain or fix Firebase hosting setup

## Immediate Fixes Required:

### 1. Update Firebase Hosting Configuration
The `firebase.json` file has redirects pointing to the wrong domain. Update the redirects to use the correct Firebase hosting domain:

```json
"redirects": [
  { "source": "/app/**", "destination": "https://props-bible-app-1c1cb.web.app/:splat", "type": 301 },
  { "source": "/login", "destination": "https://props-bible-app-1c1cb.web.app/login", "type": 301 },
  { "source": "/signup", "destination": "https://props-bible-app-1c1cb.web.app", "type": 301 }
]
```

### 2. Configure Custom Domain (Recommended)
1. Go to Firebase Console > Hosting
2. Add custom domain: `app.thepropslist.uk`
3. Configure SSL certificate for the custom domain
4. Update DNS records as instructed by Firebase

### 3. Update Environment Variables
Ensure all environment variables use the correct domain:
- `VITE_FIREBASE_AUTH_DOMAIN=props-bible-app-1c1cb.firebaseapp.com`
- Or use custom domain: `VITE_FIREBASE_AUTH_DOMAIN=app.thepropslist.uk`

### 4. Google OAuth Configuration
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Update authorized domains to include:
   - `props-bible-app-1c1cb.web.app`
   - `app.thepropslist.uk` (if using custom domain)
3. Update Firebase Console > Authentication > Sign-in method > Google > Authorized domains

## Testing Steps:
1. Deploy the updated configuration
2. Test Google Sign-in on both domains
3. Verify SSL certificate is valid
4. Test authentication flows

## Emergency Workaround:
If immediate fix is needed, temporarily disable the redirects in `firebase.json` and use the Firebase hosting domain directly.
