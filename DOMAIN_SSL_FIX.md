# Fix for www.thepropslist.uk SSL Certificate Error

## Problem
- **Error**: `NET::ERR_CERT_COMMON_NAME_INVALID`
- **Cause**: The domain `www.thepropslist.uk` is not properly configured as a custom domain in Firebase Hosting
- **Current State**: DNS is pointing to Firebase, but Firebase is serving the default certificate for `firebaseapp.com` instead of a certificate for `www.thepropslist.uk`

## Security Warning Note (CVE-2025-55182)
- **Status**: ✅ **NOT AFFECTED** - You're using React 18.2.0, which is safe
- **Details**: The vulnerability only affects React 19.x with Server Components
- **Your Setup**: React 18.2.0 + Vite (not Next.js) = No risk
- **Action**: You can dismiss the Firebase warning - it's a general advisory

## Solution: Configure Custom Domain in Firebase Hosting

### Step 1: Identify Which Firebase Hosting Site to Use

Based on your `firebase.json`, you have two hosting sites:
1. **"app"** target → `props-bible-app-1c1cb` (web app at `web-app/dist`)
2. **"marketing"** target → `marketing-thepropslist` (marketing site at `marketing/`)

**Decision**: `www.thepropslist.uk` should likely point to the **"marketing"** site since it's your main public-facing site.

### Step 2: Add Custom Domain in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `props-bible-app-1c1cb`
3. Navigate to **Hosting** in the left sidebar
4. Click on the **"marketing-thepropslist"** site (or the site you want to use)
5. Click **"Add custom domain"** or go to the **"Custom domains"** tab
6. Enter: `www.thepropslist.uk`
7. Firebase will show you DNS records to add

### Step 3: Configure DNS Records

Firebase will provide you with DNS records. Typically you need:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: www
Value: [Firebase will provide this, something like: marketing-thepropslist.web.app]
TTL: 3600 (or auto)
```

**Option B: A Record (if CNAME not supported)**
Firebase will provide A record IP addresses if needed.

### Step 4: Add Root Domain (Optional but Recommended)

You should also configure `thepropslist.uk` (without www) to redirect to `www.thepropslist.uk`:

1. In Firebase Hosting, add another custom domain: `thepropslist.uk`
2. Configure it to redirect to `www.thepropslist.uk`
3. Add the DNS records Firebase provides (usually A records for the root domain)

### Step 5: Wait for SSL Certificate Provisioning

After adding DNS records:
1. Firebase will automatically detect the DNS changes (can take a few minutes to hours)
2. Firebase will provision an SSL certificate for your custom domain (usually takes 1-24 hours)
3. You can check the status in Firebase Console > Hosting > Custom domains

### Step 6: Verify the Fix

Once the certificate is provisioned:
1. Visit `https://www.thepropslist.uk` - should load without SSL errors
2. Visit `https://thepropslist.uk` - should redirect to www version
3. Check that the certificate shows `www.thepropslist.uk` in the certificate details

## Alternative: Quick Check via Firebase CLI

You can also check your current hosting configuration via CLI:

```powershell
cd c:\projects\thepropslist
firebase hosting:sites:list
firebase hosting:sites:get marketing-thepropslist
```

## Troubleshooting

### If DNS is already configured but certificate isn't provisioning:
1. Verify DNS records are correct using: `nslookup www.thepropslist.uk`
2. Check Firebase Console for any error messages
3. Ensure DNS propagation has completed (can take up to 48 hours)

### If you need to point to the "app" site instead:
1. Follow the same steps but use the **"app"** site (`props-bible-app-1c1cb`)
2. Update DNS records accordingly

### If you want both www and non-www:
1. Add both `www.thepropslist.uk` and `thepropslist.uk` as custom domains
2. Configure one to redirect to the other (recommended: root → www)

## Current Configuration Summary

- **Firebase Project**: `props-bible-app-1c1cb`
- **Hosting Sites**:
  - `props-bible-app-1c1cb` (app target)
  - `marketing-thepropslist` (marketing target)
- **Expected Domain**: `www.thepropslist.uk` → should point to `marketing-thepropslist`

## Next Steps After Fix

1. ✅ Add custom domain in Firebase Console
2. ✅ Update DNS records
3. ✅ Wait for SSL certificate (1-24 hours)
4. ✅ Test the site
5. ✅ Update any hardcoded URLs if needed (though most references use `thepropslist.uk` without www)


