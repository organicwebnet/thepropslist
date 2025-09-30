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
      const { idToken, user } = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      const auth = getAuth();
      const result = await signInWithCredential(auth, googleCredential);

      return {
        success: true,
        user: {
          ...result.user,
          googleUser: user
        }
      };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);

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
      } else {
        return {
          success: false,
          error: error.message || 'Google Sign-In failed'
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
