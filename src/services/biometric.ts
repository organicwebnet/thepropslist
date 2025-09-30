import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export class BiometricService {
  private static readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

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
} 