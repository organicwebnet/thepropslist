import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BiometricService, BiometricCapabilities } from '../services/biometric';

interface BiometricSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

export function BiometricSetupModal({ 
  visible, 
  onClose, 
  onSetupComplete 
}: BiometricSetupModalProps): React.JSX.Element {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingCapabilities, setCheckingCapabilities] = useState(true);

  useEffect(() => {
    if (visible) {
      checkBiometricCapabilities();
    }
  }, [visible]);

  const checkBiometricCapabilities = async () => {
    try {
      setCheckingCapabilities(true);
      const caps = await BiometricService.getCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      Alert.alert('Error', 'Failed to check biometric capabilities');
    } finally {
      setCheckingCapabilities(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (!capabilities?.isAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device. Please ensure you have set up fingerprint or face recognition in your device settings.'
      );
      return;
    }

    setLoading(true);
    try {
      // Test biometric authentication
      const result = await BiometricService.authenticate(
        'Enable biometric sign-in for The Props List'
      );

      if (result.success) {
        // Enable biometric authentication
        await BiometricService.setBiometricEnabled(true);
        Alert.alert(
          'Success',
          'Biometric sign-in has been enabled! You can now use your fingerprint or face to sign in quickly.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSetupComplete();
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Authentication Failed',
          result.error || 'Biometric authentication failed. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Biometric Setup',
      'You can enable biometric sign-in later in your profile settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Skip',
          onPress: onClose
        }
      ]
    );
  };

  const getBiometricTypeLabel = () => {
    if (!capabilities?.supportedTypes) return 'Biometric';
    return BiometricService.getBiometricTypeLabel(capabilities.supportedTypes);
  };

  if (!visible) return <></>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons 
              name="finger-print" 
              size={48} 
              color="#10B981" 
              style={styles.icon}
            />
            <Text style={styles.title}>Enable Biometric Sign-In</Text>
            <Text style={styles.subtitle}>
              Sign in quickly and securely with your {getBiometricTypeLabel().toLowerCase()}
            </Text>
          </View>

          {checkingCapabilities ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Checking device capabilities...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {capabilities?.isAvailable ? (
                <View style={styles.availableContainer}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.benefitText}>Quick and secure access</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.benefitText}>No need to remember passwords</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.benefitText}>Works with your device's security</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.unavailableContainer}>
                  <Ionicons name="warning" size={24} color="#F59E0B" />
                  <Text style={styles.unavailableText}>
                    {!capabilities?.hasHardware 
                      ? 'Your device does not support biometric authentication'
                      : !capabilities?.isEnrolled
                      ? 'Please set up fingerprint or face recognition in your device settings first'
                      : 'Biometric authentication is not available'
                    }
                  </Text>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (!capabilities?.isAvailable || loading) && styles.disabledButton
                  ]}
                  onPress={handleEnableBiometric}
                  disabled={!capabilities?.isAvailable || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="finger-print" size={20} color="white" />
                      <Text style={styles.primaryButtonText}>
                        Enable {getBiometricTypeLabel()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleSkip}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  availableContainer: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  unavailableText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#92400E',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

