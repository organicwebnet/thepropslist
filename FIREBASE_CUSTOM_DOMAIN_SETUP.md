# Firebase Custom Domain Setup for www.thepropslist.uk

## Current Status
- **Error**: `NET::ERR_CERT_COMMON_NAME_INVALID`
- **Cause**: Custom domain not configured in Firebase Hosting
- **Location**: You're currently viewing Firebase Console > Hosting

## Step-by-Step Instructions (You're Already in the Right Place!)

### Step 1: Select the Correct Hosting Site
You have two hosting sites:
- **`props-bible-app-1c1cb`** - Your web app (target: "app")
- **`marketing-thepropslist`** - Your marketing site (target: "marketing")

**Decision**: Since `www.thepropslist.uk` is your main public site, it should point to **`marketing-thepropslist`**.

### Step 2: Add Custom Domain
1. In the Firebase Console Hosting page, click on **`marketing-thepropslist`** site
2. Look for a **"Custom domains"** tab or section
3. Click **"Add custom domain"** or **"Connect domain"** button
4. Enter: `www.thepropslist.uk`
5. Click **"Continue"** or **"Next"**

### Step 3: Configure DNS Records
Firebase will show you DNS records to add. You'll typically see:

**For www subdomain (CNAME record):**
```
Type: CNAME
Name: www
Value: [Firebase will provide, something like: marketing-thepropslist.web.app]
TTL: 3600 (or auto)
```

**For root domain (A records - if you want thepropslist.uk too):**
Firebase will provide 4 A record IP addresses if you want to configure the root domain.

### Step 4: Add DNS Records to Your Domain Registrar
1. Go to your domain registrar (where you bought `thepropslist.uk`)
2. Navigate to DNS management
3. Add the CNAME record Firebase provided
4. Save the changes

### Step 5: Wait for Verification
1. Firebase will automatically detect the DNS changes (5 minutes to 1 hour)
2. Firebase will provision an SSL certificate (1-24 hours)
3. You can check status in Firebase Console > Hosting > Custom domains

### Step 6: Verify It Works
Once the certificate is provisioned (status shows "Connected"):
- Visit `https://www.thepropslist.uk` - should work without SSL errors
- Check the certificate in browser - should show `www.thepropslist.uk`

## Optional: Add Root Domain Too
If you want `thepropslist.uk` (without www) to also work:
1. Add another custom domain: `thepropslist.uk`
2. Configure it to redirect to `www.thepropslist.uk` (Firebase will offer this option)
3. Add the A records Firebase provides

## Troubleshooting

### If DNS verification fails:
- Wait 1-2 hours for DNS propagation
- Verify DNS records using: `nslookup www.thepropslist.uk` or `dig www.thepropslist.uk`
- Check that CNAME record matches exactly what Firebase provided

### If SSL certificate takes too long:
- Can take up to 24 hours (usually 1-4 hours)
- Check Firebase Console for any error messages
- Ensure DNS is properly configured first

### If you need to point to the app site instead:
- Follow same steps but use **`props-bible-app-1c1cb`** site instead
- Update DNS records accordingly

## Quick Reference
- **Firebase Project**: `props-bible-app-1c1cb`
- **Marketing Site**: `marketing-thepropslist`
- **App Site**: `props-bible-app-1c1cb`
- **Target Domain**: `www.thepropslist.uk` → should point to `marketing-thepropslist`


