import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export interface StoredCredentials {
  email: string;
  password: string;
}

export class BiometricService {
  private static readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private static readonly CREDENTIALS_STORAGE_KEY = 'biometric_credentials';

  static async getCapabilities(): Promise<BiometricCapabilities> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes
    };
  }

  static async isBiometricEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, enabled.toString());
  }

  static async authenticate(
    reason = 'Please authenticate to continue'
  ): Promise<{ success: boolean; error?: string; errorCode?: string }> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.isAvailable) {
        let errorMessage = 'Biometric authentication is not available on this device';
        if (!capabilities.hasHardware) {
          errorMessage = 'Device does not have biometric hardware';
        } else if (!capabilities.isEnrolled) {
          errorMessage = 'No biometric data enrolled on this device';
        }
        
        return {
          success: false,
          error: errorMessage,
          errorCode: !capabilities.hasHardware ? 'NO_HARDWARE' : 'NOT_ENROLLED'
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        return { success: true };
      } else {
        let errorMessage = 'Authentication failed';
        let errorCode = 'AUTH_FAILED';
        
        if (result.error) {
          errorMessage = result.error;
          // Map common error codes to more specific messages
          if (result.error.includes('UserCancel')) {
            errorMessage = 'Authentication was cancelled by user';
            errorCode = 'USER_CANCELLED';
          } else if (result.error.includes('SystemCancel')) {
            errorMessage = 'Authentication was cancelled by system';
            errorCode = 'SYSTEM_CANCELLED';
          } else if (result.error.includes('AuthenticationFailed')) {
            errorMessage = 'Biometric authentication failed - please try again';
            errorCode = 'AUTH_FAILED';
          } else if (result.error.includes('UserFallback')) {
            errorMessage = 'User chose to use password instead';
            errorCode = 'USER_FALLBACK';
          } else if (result.error.includes('NotEnrolled')) {
            errorMessage = 'No biometric data enrolled on this device';
            errorCode = 'NOT_ENROLLED';
          } else if (result.error.includes('NotAvailable')) {
            errorMessage = 'Biometric authentication is not available';
            errorCode = 'NOT_AVAILABLE';
          }
        }
        
        return {
          success: false,
          error: errorMessage,
          errorCode
        };
      }
    } catch (error) {
      let errorMessage = 'Authentication error';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('LocalAuthentication')) {
          errorCode = 'LOCAL_AUTH_ERROR';
        } else if (error.message.includes('Permission')) {
          errorCode = 'PERMISSION_ERROR';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode
      };
    }
  }

  static getBiometricTypeLabel(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  }

  /**
   * Store user credentials securely for biometric sign-in
   */
  static async storeCredentials(email: string, password: string): Promise<void> {
    try {
      const credentials: StoredCredentials = { email, password };
      const credentialsJson = JSON.stringify(credentials);
      await SecureStore.setItemAsync(this.CREDENTIALS_STORAGE_KEY, credentialsJson);
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw new Error('Failed to store credentials securely');
    }
  }

  /**
   * Retrieve stored credentials for biometric sign-in
   */
  static async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const credentialsJson = await SecureStore.getItemAsync(this.CREDENTIALS_STORAGE_KEY);
      if (!credentialsJson) {
        return null;
      }
      return JSON.parse(credentialsJson) as StoredCredentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  /**
   * Check if credentials are stored
   */
  static async hasStoredCredentials(): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials();
      return credentials !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear stored credentials
   */
  static async clearStoredCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.CREDENTIALS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }

  /**
   * Authenticate with biometric and return stored credentials if successful
   */
  static async authenticateAndGetCredentials(
    reason = 'Sign in to The Props List'
  ): Promise<{ success: boolean; credentials?: StoredCredentials; error?: string; errorCode?: string }> {
    try {
      // First check if credentials are stored
      const hasCredentials = await this.hasStoredCredentials();
      if (!hasCredentials) {
        return {
          success: false,
          error: 'No stored credentials found. Please sign in with email and password first.',
          errorCode: 'NO_CREDENTIALS'
        };
      }

      // Authenticate with biometric
      const authResult = await this.authenticate(reason);
      if (!authResult.success) {
        return authResult;
      }

      // Retrieve credentials
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        return {
          success: false,
          error: 'Failed to retrieve stored credentials',
          errorCode: 'CREDENTIALS_RETRIEVAL_FAILED'
        };
      }

      return {
        success: true,
        credentials
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
        errorCode: 'UNKNOWN_ERROR'
      };
    }
  }
} 