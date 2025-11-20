import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Switch, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { BiometricService, BiometricCapabilities } from '../../src/services/biometric';
import { SubscriptionStatus } from '../../src/components/SubscriptionStatus';
import { useTheme } from '../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../src/styles/theme';
import type { NotificationPreferences } from '../../src/shared/types/auth';
import { NotificationPreferencesService } from '../../src/services/notificationPreferences';
import * as ImagePicker from 'expo-image-picker';
import { useFirebase } from '../../src/platforms/mobile/contexts/FirebaseContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userProfile, signOut, updateUserProfile } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const styles = getStyles(colors);
  const [showBiometricSettings, setShowBiometricSettings] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    NotificationPreferencesService.getDefaultPreferences()
  );
  const [savedNotificationPreferences, setSavedNotificationPreferences] = useState<NotificationPreferences>(
    NotificationPreferencesService.getDefaultPreferences()
  );
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const { service: firebaseService } = useFirebase();

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  useEffect(() => {
    if (userProfile) {
      const prefs = {
        ...NotificationPreferencesService.getDefaultPreferences(),
        ...(userProfile.notificationPreferences || {}),
      };
      setNotificationPreferences(prefs);
      setSavedNotificationPreferences(prefs);
    } else {
      // Set defaults if no user profile yet
      const defaults = NotificationPreferencesService.getDefaultPreferences();
      setNotificationPreferences(defaults);
      setSavedNotificationPreferences(defaults);
    }
  }, [userProfile]);

  useEffect(() => {
    if (showEditProfile) {
      setEditingDisplayName(userProfile?.displayName || user?.displayName || '');
    }
  }, [showEditProfile, userProfile, user]);

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
    setShowEditProfile(true);
  };

  const handleCloseEditProfile = () => {
    setShowEditProfile(false);
    setEditingDisplayName('');
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to update your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];
        await handleUpdateProfileImage(uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleUpdateProfileImage = async (imageUri: string) => {
    if (!user || !firebaseService) {
      Alert.alert('Error', 'Unable to update profile image. Please try again.');
      return;
    }

    setSavingProfile(true);
    try {
      // Upload to Firebase Storage using the service's uploadFile method
      const storagePath = `profileImages/${user.uid}`;
      const downloadURL = await firebaseService.uploadFile(storagePath, imageUri);

      // Update user profile
      await updateUserProfile({
        photoURL: downloadURL,
      });

      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', error.message || 'Failed to update profile photo. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editingDisplayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile({
        displayName: editingDisplayName.trim(),
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setShowEditProfile(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSettings = () => {
    // TODO: Navigate to settings screen
    console.log('Settings pressed');
  };

  const handleNotificationSettings = () => {
    setShowNotificationSettings(true);
    setNotificationError(null);
  };

  const handleCloseNotificationSettings = () => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = JSON.stringify(notificationPreferences) !== JSON.stringify(savedNotificationPreferences);
    
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved notification preference changes. Do you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              // Reset to saved preferences
              setNotificationPreferences(savedNotificationPreferences);
              setShowNotificationSettings(false);
              setNotificationError(null);
            }
          }
        ]
      );
    } else {
      setShowNotificationSettings(false);
      setNotificationError(null);
    }
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification preferences to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            const defaults = NotificationPreferencesService.getDefaultPreferences();
            setNotificationPreferences(defaults);
          }
        }
      ]
    );
  };

  const handleSaveNotificationPreferences = async () => {
    if (!user) {
      setNotificationError('You must be logged in to save preferences');
      return;
    }
    
    // Validate preferences object
    if (!notificationPreferences || typeof notificationPreferences !== 'object') {
      setNotificationError('Invalid notification preferences');
      return;
    }
    
    setSavingNotifications(true);
    setNotificationError(null);
    
    try {
      await updateUserProfile({
        notificationPreferences,
      });
      // Update saved preferences to match current
      setSavedNotificationPreferences(notificationPreferences);
      Alert.alert('Success', 'Notification preferences saved successfully!');
      setShowNotificationSettings(false);
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      const errorMessage = error?.message || 'Failed to save notification preferences. Please try again.';
      setNotificationError(errorMessage);
      // Also show alert for immediate feedback
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingNotifications(false);
    }
  };

  const toggleNotificationPreference = (key: keyof NotificationPreferences) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
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
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={handleEditProfile}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={24} color={colors.card || '#fff'} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Image 
                source={{ uri: user.photoURL }} 
                style={styles.avatarImage}
                resizeMode="cover"
              />
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

        {/* Subscription Status */}
        <SubscriptionStatus 
          onUpgradePress={() => {
            router.push('/(tabs)/subscription' as any);
          }}
        />

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleBiometricSettings}
            accessibilityLabel="Biometric sign-in settings"
            accessibilityRole="button"
          >
            <Ionicons name="finger-print" size={24} color="#10B981" />
            <Text style={styles.menuText}>Biometric Sign-In</Text>
            <View style={styles.menuRight}>
              <Text style={[styles.menuText, { color: biometricEnabled ? '#10B981' : colors.textSecondary, fontSize: 14 }]}>
                {biometricEnabled ? 'Enabled' : 'Disabled'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleNotificationSettings}
            accessibilityLabel="Notification settings"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleSettings}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/feedback' as any)}
            accessibilityLabel="Feedback"
            accessibilityRole="button"
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
            <Text style={styles.menuText}>Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleLogout}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={24} color={colors.error || '#ef4444'} />
            <Text style={[styles.menuText, { color: colors.error || '#ef4444' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
              <TouchableOpacity 
                onPress={() => setShowBiometricSettings(false)}
                accessibilityLabel="Close biometric settings"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.biometricInfo}>
                <Ionicons 
                  name="finger-print" 
                  size={32} 
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

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationSettings}
        transparent
        animationType="slide"
        onRequestClose={handleCloseNotificationSettings}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity 
                onPress={handleCloseNotificationSettings}
                accessibilityLabel="Close notification settings"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {notificationError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error || '#ef4444'} />
                <Text style={styles.errorText}>{notificationError}</Text>
              </View>
            )}

            <ScrollView style={styles.notificationScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                {/* Prop-related notifications */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>Props</Text>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="cube-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Prop Status Updates</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.propStatusUpdates ?? true}
                      onValueChange={() => toggleNotificationPreference('propStatusUpdates')}
                      accessibilityLabel="Enable prop status update notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="build-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Maintenance Reminders</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.maintenanceReminders ?? true}
                      onValueChange={() => toggleNotificationPreference('maintenanceReminders')}
                      accessibilityLabel="Enable maintenance reminder notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Show-related notifications */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>Shows</Text>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Show Reminders</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.showReminders ?? true}
                      onValueChange={() => toggleNotificationPreference('showReminders')}
                      accessibilityLabel="Enable show reminder notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Shopping-related notifications */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>Shopping</Text>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="bag-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Item Assigned to Me</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.shoppingItemAssigned ?? true}
                      onValueChange={() => toggleNotificationPreference('shoppingItemAssigned')}
                      accessibilityLabel="Enable shopping item assigned notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Item Approved</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.shoppingItemApproved ?? true}
                      onValueChange={() => toggleNotificationPreference('shoppingItemApproved')}
                      accessibilityLabel="Enable shopping item approved notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="close-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Item Rejected</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.shoppingItemRejected ?? true}
                      onValueChange={() => toggleNotificationPreference('shoppingItemRejected')}
                      accessibilityLabel="Enable shopping item rejected notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="star-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Option Selected</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.shoppingOptionSelected ?? true}
                      onValueChange={() => toggleNotificationPreference('shoppingOptionSelected')}
                      accessibilityLabel="Enable shopping option selected notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>New Option Added</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.shoppingOptionAdded ?? true}
                      onValueChange={() => toggleNotificationPreference('shoppingOptionAdded')}
                      accessibilityLabel="Enable new shopping option added notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Task-related notifications */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>Tasks</Text>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Task Assigned to Me</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.taskAssigned ?? true}
                      onValueChange={() => toggleNotificationPreference('taskAssigned')}
                      accessibilityLabel="Enable task assigned notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Task Due Soon</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.taskDueSoon ?? true}
                      onValueChange={() => toggleNotificationPreference('taskDueSoon')}
                      accessibilityLabel="Enable task due soon notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Task Due Today</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.taskDueToday ?? true}
                      onValueChange={() => toggleNotificationPreference('taskDueToday')}
                      accessibilityLabel="Enable task due today notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* General notifications */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>General</Text>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Comments</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.comments ?? true}
                      onValueChange={() => toggleNotificationPreference('comments')}
                      accessibilityLabel="Enable comment notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>System Notifications</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.systemNotifications ?? true}
                      onValueChange={() => toggleNotificationPreference('systemNotifications')}
                      accessibilityLabel="Enable system notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Subscription-related notifications */}
                <View style={styles.notificationSection}>
                  <Text style={styles.sectionTitle}>Subscription</Text>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Expiring Soon (7 days)</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.subscriptionExpiringSoon ?? true}
                      onValueChange={() => toggleNotificationPreference('subscriptionExpiringSoon')}
                      accessibilityLabel="Enable subscription expiring soon notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Expiring Today</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.subscriptionExpiringToday ?? true}
                      onValueChange={() => toggleNotificationPreference('subscriptionExpiringToday')}
                      accessibilityLabel="Enable subscription expiring today notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="close-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Expired</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.subscriptionExpired ?? true}
                      onValueChange={() => toggleNotificationPreference('subscriptionExpired')}
                      accessibilityLabel="Enable subscription expired notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="card-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Payment Failed</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.subscriptionPaymentFailed ?? true}
                      onValueChange={() => toggleNotificationPreference('subscriptionPaymentFailed')}
                      accessibilityLabel="Enable subscription payment failed notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.notificationItem}>
                    <View style={styles.notificationItemLeft}>
                      <Ionicons name="arrow-up-circle-outline" size={20} color={colors.primary} />
                      <Text style={styles.notificationItemText}>Upgrade Available</Text>
                    </View>
                    <Switch
                      value={notificationPreferences.subscriptionUpgradeAvailable ?? true}
                      onValueChange={() => toggleNotificationPreference('subscriptionUpgradeAvailable')}
                      accessibilityLabel="Enable subscription upgrade available notifications"
                      accessibilityRole="switch"
                      trackColor={{ false: colors.textSecondary, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetToDefaults}
                    accessibilityLabel="Reset notification preferences to defaults"
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                    <Text style={styles.resetButtonText}>Reset to Defaults</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, savingNotifications && styles.saveButtonDisabled]}
                    onPress={handleSaveNotificationPreferences}
                    disabled={savingNotifications}
                    accessibilityLabel="Save notification preferences"
                    accessibilityRole="button"
                  >
                    {savingNotifications ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="white" />
                        <Text style={styles.saveButtonText}>Save Preferences</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditProfile}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity 
                onPress={handleCloseEditProfile}
                accessibilityLabel="Close edit profile"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Profile Photo Section */}
              <View style={styles.editProfilePhotoSection}>
                <Text style={styles.sectionTitle}>Profile Photo</Text>
                <View style={styles.editPhotoContainer}>
                  <View style={styles.editAvatar}>
                    {user?.photoURL ? (
                      <Image 
                        source={{ uri: user.photoURL }} 
                        style={styles.editAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={48} color="#6b7280" />
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handlePickImage}
                    disabled={savingProfile}
                    accessibilityLabel="Change profile photo"
                    accessibilityRole="button"
                  >
                    <Ionicons name="camera" size={20} color="white" />
                    <Text style={styles.changePhotoButtonText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Display Name Section */}
              <View style={styles.editProfileSection}>
                <Text style={styles.sectionTitle}>Display Name</Text>
                <TextInput
                  style={styles.nameInput}
                  value={editingDisplayName}
                  onChangeText={setEditingDisplayName}
                  placeholder="Enter your display name"
                  placeholderTextColor={colors.textSecondary}
                  editable={!savingProfile}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  accessibilityLabel="Save profile changes"
                  accessibilityRole="button"
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  menuSection: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
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
    backgroundColor: colors.card,
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
    color: colors.text,
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
    color: colors.text,
    textAlign: 'center',
  },
  biometricDescription: {
    fontSize: 14,
    color: colors.textSecondary,
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
  notificationScrollView: {
    maxHeight: '80%',
  },
  notificationSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  notificationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  notificationItemText: {
    fontSize: 15,
    color: colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (colors.error || '#ef4444') + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.error || '#ef4444',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  editProfilePhotoSection: {
    marginBottom: 24,
  },
  editPhotoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  editAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  editAvatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  changePhotoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileSection: {
    marginBottom: 24,
  },
  nameInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginTop: 8,
  },
}); 