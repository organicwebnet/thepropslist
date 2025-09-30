import { BiometricService } from '../biometric';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the dependencies
jest.mock('expo-local-authentication');
jest.mock('@react-native-async-storage/async-storage');

const mockLocalAuthentication = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities when biometric is available', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities).toEqual({
        isAvailable: true,
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [LocalAuthentication.AuthenticationType.FINGERPRINT]
      });
    });

    it('should return unavailable when hardware is not available', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.isAvailable).toBe(false);
      expect(capabilities.hasHardware).toBe(false);
    });

    it('should return unavailable when not enrolled', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
      mockLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.isAvailable).toBe(false);
      expect(capabilities.isEnrolled).toBe(false);
    });
  });

  describe('isBiometricEnabled', () => {
    it('should return true when biometric is enabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true');

      const isEnabled = await BiometricService.isBiometricEnabled();

      expect(isEnabled).toBe(true);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('biometric_enabled');
    });

    it('should return false when biometric is disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('false');

      const isEnabled = await BiometricService.isBiometricEnabled();

      expect(isEnabled).toBe(false);
    });

    it('should return false when no value is stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const isEnabled = await BiometricService.isBiometricEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  describe('setBiometricEnabled', () => {
    it('should store true when enabling biometric', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await BiometricService.setBiometricEnabled(true);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('biometric_enabled', 'true');
    });

    it('should store false when disabling biometric', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await BiometricService.setBiometricEnabled(false);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('biometric_enabled', 'false');
    });
  });

  describe('authenticate', () => {
    it('should return success when authentication succeeds', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined
      });

      const result = await BiometricService.authenticate('Test authentication');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockLocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Test authentication',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });
    });

    it('should return failure when authentication fails', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      });

      const result = await BiometricService.authenticate('Test authentication');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should return failure when biometric is not available', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

      const result = await BiometricService.authenticate('Test authentication');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric authentication is not available on this device');
    });

    it('should handle authentication errors', async () => {
      mockLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuthentication.authenticateAsync.mockRejectedValue(new Error('Authentication error'));

      const result = await BiometricService.authenticate('Test authentication');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication error');
    });
  });

  describe('getBiometricTypeLabel', () => {
    it('should return Face ID for facial recognition', () => {
      const label = BiometricService.getBiometricTypeLabel([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ]);

      expect(label).toBe('Face ID');
    });

    it('should return Fingerprint for fingerprint authentication', () => {
      const label = BiometricService.getBiometricTypeLabel([
        LocalAuthentication.AuthenticationType.FINGERPRINT
      ]);

      expect(label).toBe('Fingerprint');
    });

    it('should return Iris for iris authentication', () => {
      const label = BiometricService.getBiometricTypeLabel([
        LocalAuthentication.AuthenticationType.IRIS
      ]);

      expect(label).toBe('Iris');
    });

    it('should return Biometric as fallback', () => {
      const label = BiometricService.getBiometricTypeLabel([]);

      expect(label).toBe('Biometric');
    });

    it('should prioritize Face ID over other types', () => {
      const label = BiometricService.getBiometricTypeLabel([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ]);

      expect(label).toBe('Face ID');
    });
  });
});

