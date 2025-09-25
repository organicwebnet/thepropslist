# Apple Sign-In Setup Guide

This document provides comprehensive instructions for setting up Apple Sign-In for both the web app and mobile app.

## Overview

Apple Sign-In has been implemented to provide iOS users with a seamless, privacy-focused authentication experience. The implementation includes:

- **Web App**: Firebase Auth integration with Apple OAuth provider
- **Mobile App**: Native Apple Sign-In using Expo AuthSession
- **Privacy Features**: Support for Apple's private email relay and name hiding
- **Error Handling**: Comprehensive error handling for all Apple Sign-In scenarios

## Prerequisites

### Apple Developer Account
- Active Apple Developer Program membership
- Access to Apple Developer Console
- App ID registered for your application

### Firebase Project
- Firebase project with Authentication enabled
- Apple provider configured in Firebase Console

## Web App Setup

### 1. Apple Developer Console Configuration

1. **Create App ID** (if not already created):
   - Go to [Apple Developer Console](https://developer.apple.com/account/)
   - Navigate to "Certificates, Identifiers & Profiles"
   - Create a new App ID with identifier: `com.propsbible`
   - Enable "Sign In with Apple" capability

2. **Create Service ID**:
   - Create a new Service ID (e.g., `com.propsbible.web`)
   - Configure domains and redirect URLs:
     - Primary App ID: `com.propsbible`
     - Domains: `app.thepropslist.uk`, `thepropslist.uk`
     - Return URLs: `https://app.thepropslist.uk/__/auth/handler`

3. **Create Private Key**:
   - Generate a new private key for "Sign In with Apple"
   - Download the `.p8` file
   - Note the Key ID and Team ID

### 2. Firebase Console Configuration

1. **Enable Apple Provider**:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Apple provider
   - Configure with:
     - Service ID: `com.propsbible.web`
     - Apple Team ID: Your Apple Team ID
     - Key ID: From the private key you created
     - Private Key: Content of the `.p8` file

2. **Configure Authorized Domains**:
   - Add `app.thepropslist.uk` to authorized domains
   - Add `thepropslist.uk` to authorized domains

### 3. Domain Verification

1. **Download Verification File**:
   - From Apple Developer Console, download the domain verification file
   - Upload to your web server at `/.well-known/apple-app-site-association`

2. **Verify Domain**:
   - Ensure the file is accessible at the correct URL
   - Verify in Apple Developer Console

## Mobile App Setup

### 1. iOS Configuration

1. **Enable Capability**:
   - Open your iOS project in Xcode
   - Go to "Signing & Capabilities"
   - Add "Sign In with Apple" capability

2. **Bundle Identifier**:
   - Ensure bundle identifier matches: `com.propsbible`
   - This must match your Apple Developer App ID

### 2. Expo Configuration

The following packages have been added to support Apple Sign-In:

```json
{
  "expo-auth-session": "^5.0.0",
  "expo-crypto": "^12.0.0",
  "expo-web-browser": "^12.0.0",
  "expo-build-properties": "^0.10.0"
}
```

### 3. App Configuration

The `app.config.js` has been updated with:

```javascript
plugins: [
  "@react-native-firebase/app",
  "expo-router",
  [
    "expo-build-properties",
    {
      ios: {
        useFrameworks: "static"
      }
    }
  ]
]
```

## Implementation Details

### Web App Implementation

#### WebAuthContext Updates
- Added `signInWithApple()` function
- Handles Apple's privacy features (private email relay, name hiding)
- Proper error handling for all Apple Sign-In scenarios

#### UI Components
- Apple Sign-In button added to both Login and Signup pages
- Follows Apple's Human Interface Guidelines
- Proper accessibility attributes

### Mobile App Implementation

#### AppleAuthService
- Native Apple Sign-In implementation using Expo AuthSession
- Platform-specific availability checking
- Comprehensive error handling
- Support for Apple's privacy features

#### AuthForm Updates
- Apple Sign-In button added to mobile authentication form
- iOS-specific availability checking
- Integration with existing authentication flow

## Testing

### Web App Tests
Comprehensive test suite covering:
- Successful Apple Sign-In flow
- Error handling (cancellation, network errors)
- Privacy features (private email relay)
- Accessibility compliance
- Provider configuration

### Mobile App Tests
- Platform availability checking
- Authentication flow testing
- Error handling scenarios
- Integration with Firebase Auth

## Security Considerations

### Privacy Features
- **Private Email Relay**: Apple provides a private email address that forwards to the user's real email
- **Name Hiding**: Users can choose to hide their real name
- **Data Minimization**: Only request necessary scopes (email, name)

### Error Handling
- Graceful handling of user cancellation
- Network error recovery
- Invalid configuration detection
- Proper error messages for users

## Troubleshooting

### Common Issues

1. **"Apple Sign-In is only available on iOS devices"**
   - This is expected behavior on Android/Web
   - The button should be hidden or disabled on non-iOS platforms

2. **"Invalid client" error**
   - Check Service ID configuration in Apple Developer Console
   - Verify bundle identifier matches exactly
   - Ensure domains are properly configured

3. **"Invalid redirect URI" error**
   - Verify return URLs in Apple Developer Console
   - Check Firebase configuration
   - Ensure HTTPS is used for production

4. **Domain verification failed**
   - Verify the `.well-known/apple-app-site-association` file is accessible
   - Check file content matches Apple's requirements
   - Ensure proper HTTP headers

### Debug Mode
Enable debug logging by setting:
```javascript
// In development
console.log('Apple Sign-In debug info:', result);
```

## Production Deployment

### Checklist
- [ ] Apple Developer Console configured
- [ ] Firebase Apple provider enabled
- [ ] Domain verification completed
- [ ] Private key securely stored
- [ ] Authorized domains configured
- [ ] HTTPS enabled for production
- [ ] Error monitoring configured
- [ ] User acceptance testing completed

### Monitoring
- Monitor Apple Sign-In success rates
- Track error patterns
- Monitor private email relay usage
- User feedback collection

## Support

For issues related to Apple Sign-In:
1. Check Apple Developer documentation
2. Review Firebase Auth documentation
3. Check implementation against this guide
4. Test with Apple's test environment

## References

- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Firebase Apple Auth](https://firebase.google.com/docs/auth/web/apple)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple/overview/)
