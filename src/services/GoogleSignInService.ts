import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { getAuth } from '@react-native-firebase/auth';

export class GoogleSignInService {
  private static instance: GoogleSignInService;
  private isConfigured = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): GoogleSignInService {
    if (!GoogleSignInService.instance) {
      GoogleSignInService.instance = new GoogleSignInService();
    }
    return GoogleSignInService.instance;
  }

  public async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      // For Android, we need the web client ID (not the Android client ID)
      // The web client ID should be from the Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '162597141271-lhl338e6m7sf4m81l5ev271k8rmqv0da.apps.googleusercontent.com';
      
      if (!webClientId) {
        throw new Error('Google Web Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment variables.');
      }

      await GoogleSignin.configure({
        webClientId: webClientId, // This MUST be the web client ID from Firebase Console
        offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
        hostedDomain: '', // specifies a hosted domain restriction
        forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
        accountName: '', // [Android] specifies an account name on the device that should be used
        iosClientId: webClientId, // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
      });

      this.isConfigured = true;
      console.log('Google Sign-In configured successfully with web client ID:', webClientId);
    } catch (error) {
      console.error('Failed to configure Google Sign-In:', error);
      throw error;
    }
  }

  public async signIn(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Ensure Google Sign-In is configured
      await this.configure();

      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the users ID token
      const signInResult = await GoogleSignin.signIn();
      
      // Validate that we have an idToken - this is critical to prevent crashes
      if (!signInResult || !signInResult.idToken) {
        console.error('Google Sign-In failed: No ID token received');
        return {
          success: false,
          error: 'Google Sign-In failed: No authentication token received. Please try again.'
        };
      }

      const { idToken, user } = signInResult;

      // Validate idToken is not empty
      if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
        console.error('Google Sign-In failed: Invalid ID token');
        return {
          success: false,
          error: 'Google Sign-In failed: Invalid authentication token. Please try again.'
        };
      }

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Validate credential was created successfully
      if (!googleCredential) {
        console.error('Google Sign-In failed: Failed to create credential');
        return {
          success: false,
          error: 'Google Sign-In failed: Failed to create authentication credential. Please try again.'
        };
      }

      // Sign-in the user with the credential
      let auth;
      try {
        auth = getAuth();
        if (!auth) {
          throw new Error('Firebase Auth is not initialized');
        }
      } catch (authError: any) {
        console.error('Firebase Auth initialization error:', authError);
        return {
          success: false,
          error: 'Firebase authentication is not available. Please restart the app and try again.'
        };
      }

      const result = await signInWithCredential(auth, googleCredential);
      
      // Validate sign-in result
      if (!result || !result.user) {
        console.error('Google Sign-In failed: No user returned from Firebase');
        return {
          success: false,
          error: 'Google Sign-In failed: Authentication completed but no user data was received. Please try again.'
        };
      }

      return {
        success: true,
        user: {
          ...result.user,
          googleUser: user
        }
      };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      // Handle specific error codes
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          error: 'Sign-in was cancelled by the user'
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: 'Sign-in is already in progress'
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: 'Google Play Services is not available on this device'
        };
      } else if (error.code === 'auth/network-request-failed') {
        return {
          success: false,
          error: 'Network error. Please check your internet connection and try again.'
        };
      } else if (error.code === 'auth/invalid-credential') {
        return {
          success: false,
          error: 'Invalid authentication credentials. Please try signing in again.'
        };
      } else if (error.message) {
        // Return a user-friendly error message
        return {
          success: false,
          error: error.message.includes('DEVELOPER_ERROR') 
            ? 'Google Sign-In configuration error. Please contact support.'
            : error.message
        };
      } else {
        return {
          success: false,
          error: 'Google Sign-In failed. Please try again.'
        };
      }
    }
  }

  public async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google Sign-Out error:', error);
      throw error;
    }
  }

  public async isSignedIn(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Error checking Google Sign-In status:', error);
      return false;
    }
  }

  public async getCurrentUser(): Promise<any> {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const googleSignInService = GoogleSignInService.getInstance();
