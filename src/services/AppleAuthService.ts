import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

interface AppleAuthConfig {
  clientId: string;
  redirectUri: string;
  responseType: AuthSession.ResponseType;
  scopes: string[];
  additionalParameters?: Record<string, string>;
}

interface AppleAuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
  error?: string;
}

export class AppleAuthService {
  private config: AppleAuthConfig;

  constructor() {
    this.config = {
      clientId: 'com.propsbible', // Your bundle identifier
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'propsbible',
        path: 'auth',
      }),
      responseType: AuthSession.ResponseType.Code,
      scopes: ['name', 'email'],
    };
  }

  /**
   * Initiates Apple Sign-In flow
   * @returns Promise<AppleAuthResult>
   */
  async signIn(): Promise<AppleAuthResult> {
    try {
      if (Platform.OS !== 'ios') {
        return {
          success: false,
          error: 'Apple Sign-In is only available on iOS devices',
        };
      }

      // Generate a random state parameter for security
      const state = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(),
        { encoding: Crypto.CryptoEncoding.BASE64URL }
      );

      // Create the authorization request
      const request = new AuthSession.AuthRequest({
        clientId: this.config.clientId,
        scopes: this.config.scopes,
        redirectUri: this.config.redirectUri,
        responseType: this.config.responseType,
        state,
        additionalParameters: {
          response_mode: 'form_post',
          ...this.config.additionalParameters,
        },
      });

      // Start the authentication flow
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      });

      if (result.type === 'success') {
        // Handle successful authentication
        return await this.handleAuthSuccess(result);
      } else if (result.type === 'cancel') {
        return {
          success: false,
          error: 'User cancelled Apple Sign-In',
        };
      } else {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Handles successful authentication result
   * @param result AuthSession.AuthSessionResult
   * @returns Promise<AppleAuthResult>
   */
  private async handleAuthSuccess(
    result: AuthSession.AuthSessionResult
  ): Promise<AppleAuthResult> {
    try {
      if (result.type !== 'success' || !result.params) {
        return {
          success: false,
          error: 'Invalid authentication result',
        };
      }

      const { code, state, user } = result.params;

      if (!code) {
        return {
          success: false,
          error: 'No authorization code received',
        };
      }

      // Parse user information if provided
      let userInfo;
      if (user) {
        try {
          userInfo = JSON.parse(user);
        } catch (e) {
          console.warn('Failed to parse user info:', e);
        }
      }

      return {
        success: true,
        user: {
          id: userInfo?.sub || 'unknown',
          email: userInfo?.email,
          name: userInfo?.name ? {
            firstName: userInfo.name.firstName,
            lastName: userInfo.name.lastName,
          } : undefined,
        },
      };
    } catch (error) {
      console.error('Error handling auth success:', error);
      return {
        success: false,
        error: 'Failed to process authentication result',
      };
    }
  }

  /**
   * Checks if Apple Sign-In is available on the current device
   * @returns boolean
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Gets the current configuration
   * @returns AppleAuthConfig
   */
  getConfig(): AppleAuthConfig {
    return { ...this.config };
  }
}

// Export a singleton instance
export const appleAuthService = new AppleAuthService();
