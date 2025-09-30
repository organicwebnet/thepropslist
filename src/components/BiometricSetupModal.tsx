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
import { useTranslation } from '../hooks/useTranslation';
import { analytics } from '../lib/analytics';
import { errorReporting } from '../lib/errorReporting';
import { useAuth } from '../contexts/AuthContext';

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
  const { t, tWithParams } = useTranslation();
  const { user } = useAuth();
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
      
      // Track biometric setup offered
      if (user?.uid) {
        await analytics.trackBiometricSetupOffered({
          user_id: user.uid,
          platform: 'mobile',
          biometric_type: caps.isAvailable ? BiometricService.getBiometricTypeLabel(caps.supportedTypes) : undefined,
          device_capabilities: {
            has_hardware: caps.hasHardware,
            is_enrolled: caps.isEnrolled,
            supported_types: caps.supportedTypes.map(type => type.toString()),
          },
        });
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      
      // Report error
      if (user?.uid && error instanceof Error) {
        await errorReporting.reportBiometricCapabilityError(error, {
          user_id: user.uid,
          platform: 'mobile',
          biometric_type: undefined,
          device_capabilities: undefined,
        });
      }
      
      Alert.alert(t('common.error'), 'Failed to check biometric capabilities');
    } finally {
      setCheckingCapabilities(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (!capabilities?.isAvailable) {
      Alert.alert(
        t('biometric.setup.unavailable'),
        t('biometric.setup.not_enrolled')
      );
      return;
    }

    setLoading(true);
    try {
      // Test biometric authentication
      const result = await BiometricService.authenticate(
        t('biometric.setup.prompt')
      );

      if (result.success) {
        // Enable biometric authentication
        await BiometricService.setBiometricEnabled(true);
        
        // Track successful setup
        if (user?.uid) {
          await analytics.trackBiometricSetupCompleted({
            user_id: user.uid,
            platform: 'mobile',
            biometric_type: BiometricService.getBiometricTypeLabel(capabilities.supportedTypes),
            device_capabilities: {
              has_hardware: capabilities.hasHardware,
              is_enrolled: capabilities.isEnrolled,
              supported_types: capabilities.supportedTypes.map(type => type.toString()),
            },
            success: true,
          });
        }
        
        Alert.alert(
          t('common.success'),
          t('biometric.setup.success'),
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
        // Track failed setup
        if (user?.uid) {
          await analytics.trackBiometricSetupCompleted({
            user_id: user.uid,
            platform: 'mobile',
            biometric_type: BiometricService.getBiometricTypeLabel(capabilities.supportedTypes),
            device_capabilities: {
              has_hardware: capabilities.hasHardware,
              is_enrolled: capabilities.isEnrolled,
              supported_types: capabilities.supportedTypes.map(type => type.toString()),
            },
            success: false,
            error_message: result.error || 'Authentication failed',
          });
          
          // Report authentication error with specific error code
          if (result.errorCode) {
            await errorReporting.reportBiometricAuthenticationError(
              new Error(result.error || 'Authentication failed'),
              {
                user_id: user.uid,
                platform: 'mobile',
                biometric_type: BiometricService.getBiometricTypeLabel(capabilities.supportedTypes),
                device_capabilities: {
                  has_hardware: capabilities.hasHardware,
                  is_enrolled: capabilities.isEnrolled,
                  supported_types: capabilities.supportedTypes.map(type => type.toString()),
                },
                error_code: result.errorCode,
              }
            );
          }
        }
        
        Alert.alert(
          t('biometric.auth.failed'),
          result.error || t('biometric.setup.failed')
        );
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
      
      // Report error
      if (user?.uid && error instanceof Error && capabilities) {
        await errorReporting.reportBiometricError(error, {
          user_id: user.uid,
          platform: 'mobile',
          biometric_type: BiometricService.getBiometricTypeLabel(capabilities.supportedTypes),
          device_capabilities: {
            has_hardware: capabilities.hasHardware,
            is_enrolled: capabilities.isEnrolled,
            supported_types: capabilities.supportedTypes.map(type => type.toString()),
          },
          operation: 'setup',
        });
      }
      
      Alert.alert(t('common.error'), 'Failed to enable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      t('biometric.setup.skip'),
      'You can enable biometric sign-in later in your profile settings.',
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.skip'),
          onPress: async () => {
            // Track skipped setup
            if (user?.uid && capabilities) {
              await analytics.trackBiometricSetupSkipped({
                user_id: user.uid,
                platform: 'mobile',
                biometric_type: capabilities.isAvailable ? BiometricService.getBiometricTypeLabel(capabilities.supportedTypes) : undefined,
                device_capabilities: {
                  has_hardware: capabilities.hasHardware,
                  is_enrolled: capabilities.isEnrolled,
                  supported_types: capabilities.supportedTypes.map(type => type.toString()),
                },
              });
            }
            onClose();
          }
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
            <Text style={styles.title}>{t('biometric.setup.title')}</Text>
            <Text style={styles.subtitle}>
              {tWithParams('biometric.setup.description', { type: getBiometricTypeLabel().toLowerCase() })}
            </Text>
          </View>

          {checkingCapabilities ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>{t('biometric.setup.checking')}</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {capabilities?.isAvailable ? (
                <View style={styles.availableContainer}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.benefitText}>{t('biometric.setup.benefits.quick')}</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.benefitText}>{t('biometric.setup.benefits.secure')}</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.benefitText}>{t('biometric.setup.benefits.device_security')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.unavailableContainer}>
                  <Ionicons name="warning" size={24} color="#F59E0B" />
                  <Text style={styles.unavailableText}>
                    {!capabilities?.hasHardware 
                      ? t('biometric.setup.no_hardware')
                      : !capabilities?.isEnrolled
                      ? t('biometric.setup.not_enrolled')
                      : t('biometric.setup.not_available')
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
                        {tWithParams('biometric.setup.enable', { type: getBiometricTypeLabel() })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleSkip}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>{t('biometric.setup.skip')}</Text>
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

