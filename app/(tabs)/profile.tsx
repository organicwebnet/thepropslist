import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { BiometricService, BiometricCapabilities } from '../../src/services/biometric';

export default function ProfileScreen() {
  const { user, userProfile, signOut } = useAuth();
  const [showBiometricSettings, setShowBiometricSettings] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const [enabled, capabilities] = await Promise.all([
        BiometricService.isBiometricEnabled(),
        BiometricService.getCapabilities()
      ]);
      setBiometricEnabled(enabled);
      setBiometricCapabilities(capabilities);
    } catch (error) {
      console.error('Error checking biometric status:', error);
    }
  };

  const handleBiometricSettings = () => {
    setShowBiometricSettings(true);
  };

  const handleToggleBiometric = async () => {
    if (!biometricCapabilities?.isAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device. Please ensure you have set up fingerprint or face recognition in your device settings.'
      );
      return;
    }

    setLoading(true);
    try {
      if (biometricEnabled) {
        // Disable biometric
        await BiometricService.setBiometricEnabled(false);
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric sign-in has been disabled.');
      } else {
        // Enable biometric - test authentication first
        const result = await BiometricService.authenticate(
          'Enable biometric sign-in for The Props List'
        );

        if (result.success) {
          await BiometricService.setBiometricEnabled(true);
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric sign-in has been enabled!');
        } else {
          // Log specific error information for debugging
          console.error('Biometric authentication failed in settings:', {
            error: result.error,
            errorCode: result.errorCode,
            timestamp: new Date().toISOString()
          });
          
          Alert.alert(
            'Authentication Failed',
            result.error || 'Biometric authentication failed. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    // TODO: Navigate to edit profile screen
    console.log('Edit profile pressed');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings screen
    console.log('Settings pressed');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Text style={styles.avatarText}>Photo</Text>
            ) : (
              <Ionicons name="person" size={48} color="#6b7280" />
            )}
          </View>
          <Text style={styles.userName}>
            {userProfile?.displayName || user?.displayName || 'User'}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || 'No email'}
          </Text>
          {userProfile?.role && (
            <Text style={styles.userRole}>
              Role: {userProfile.role}
            </Text>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleBiometricSettings}>
            <Ionicons name="finger-print" size={24} color="#10B981" />
            <Text style={styles.menuText}>Biometric Sign-In</Text>
            <View style={styles.menuRight}>
              <Text style={[styles.menuText, { color: biometricEnabled ? '#10B981' : '#6b7280', fontSize: 14 }]}>
                {biometricEnabled ? 'Enabled' : 'Disabled'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={24} color="#c084fc" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Biometric Settings Modal */}
      <Modal
        visible={showBiometricSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBiometricSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Biometric Sign-In</Text>
              <TouchableOpacity onPress={() => setShowBiometricSettings(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.biometricInfo}>
                <Ionicons 
                  name="finger-print" 
                  size={48} 
                  color={biometricCapabilities?.isAvailable ? "#10B981" : "#6b7280"} 
                />
                <Text style={styles.biometricTitle}>
                  {biometricCapabilities?.isAvailable 
                    ? BiometricService.getBiometricTypeLabel(biometricCapabilities.supportedTypes)
                    : 'Biometric Not Available'
                  }
                </Text>
                <Text style={styles.biometricDescription}>
                  {biometricCapabilities?.isAvailable
                    ? 'Use your fingerprint or face to sign in quickly and securely'
                    : 'Please set up fingerprint or face recognition in your device settings first'
                  }
                </Text>
              </View>

              {biometricCapabilities?.isAvailable && (
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    biometricEnabled ? styles.toggleButtonEnabled : styles.toggleButtonDisabled
                  ]}
                  onPress={handleToggleBiometric}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons 
                        name={biometricEnabled ? "finger-print" : "finger-print-outline"} 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.toggleButtonText}>
                        {biometricEnabled ? 'Disable' : 'Enable'} Biometric Sign-In
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    backgroundColor: '#c084fc',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#a3a3a3',
    fontSize: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#a3a3a3',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#c084fc',
    fontWeight: '600',
  },
  menuSection: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    gap: 24,
  },
  biometricInfo: {
    alignItems: 'center',
    gap: 12,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  biometricDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  toggleButtonEnabled: {
    backgroundColor: '#ef4444',
  },
  toggleButtonDisabled: {
    backgroundColor: '#10B981',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 