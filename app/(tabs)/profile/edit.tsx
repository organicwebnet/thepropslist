import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, ActivityIndicator, Image, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../src/contexts/AuthContext.tsx';
import type { UserProfile } from '../../../src/shared/types/auth.ts';
import StyledText from '../../../src/components/StyledText.tsx';
import { useTheme } from '../../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../../src/styles/theme.ts';
import { useFirebase } from '../../../src/contexts/FirebaseContext.tsx'; // For storage uploads
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, userProfile, updateUserProfile, loading: authLoading, error: authError, isGoogleSignIn } = useAuth();
  const { service: firebaseService } = useFirebase();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [jobTitle, setJobTitle] = useState(userProfile?.jobTitle || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setJobTitle(userProfile.jobTitle || '');
      setPhotoURL(userProfile.photoURL || null);
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [userProfile, user]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
      setPhotoURL(result.assets[0].uri); // Preview selected image
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }
    if (!firebaseService || !user) {
      Alert.alert('Error', 'User or Firebase service is not available.');
      return;
    }

    setIsSaving(true);
    let newPhotoURL = userProfile?.photoURL || null;

    try {
      // Upload new image if one was selected
      if (selectedImageUri) {
        const fileName = selectedImageUri.split('/').pop() || `profile-${user.uid}-${Date.now()}`;
        const storagePath = `user_photos/${user.uid}/${fileName}`;
        
        // Alert.alert("Uploading Image", "Starting profile image upload..."); // Optional: for better UX
        newPhotoURL = await firebaseService.uploadFile(storagePath, selectedImageUri);
        // Alert.alert("Upload Complete", "Profile image uploaded."); // Optional
      }

      const profileUpdates: Partial<UserProfile> = {
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim(),
      };

      if (newPhotoURL === null) {
        profileUpdates.photoURL = undefined;
      } else if (newPhotoURL) {
        profileUpdates.photoURL = newPhotoURL;
      }

      // Only include email if it has changed and user is not Google Sign-In
      if (!isGoogleSignIn && email.trim() !== user?.email) {
        profileUpdates.email = email.trim();
      }

      await updateUserProfile(profileUpdates);
      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading && !userProfile) { // Show loading only if profile is not yet available
    return (
      <View style={[styles(currentThemeColors).container, styles(currentThemeColors).centered]}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles(currentThemeColors).container}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      
      <TouchableOpacity onPress={pickImage} style={styles(currentThemeColors).avatarContainer}>
        <Image 
            source={photoURL ? { uri: photoURL } : require('../../../assets/icon.png')} 
            style={styles(currentThemeColors).avatar} 
        />
        <View style={styles(currentThemeColors).cameraIconContainer}>
            <Ionicons name="camera" size={24} color={currentThemeColors.card} />
        </View>
      </TouchableOpacity>

      <StyledText style={styles(currentThemeColors).label}>Display Name</StyledText>
      <TextInput
        style={styles(currentThemeColors).input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Enter your display name"
        placeholderTextColor={currentThemeColors.textSecondary}
      />

      <StyledText style={styles(currentThemeColors).label}>Job Title</StyledText>
      <TextInput
        style={styles(currentThemeColors).input}
        value={jobTitle}
        onChangeText={setJobTitle}
        placeholder="Enter your job title (optional)"
        placeholderTextColor={currentThemeColors.textSecondary}
      />

      <StyledText style={styles(currentThemeColors).label}>Email Address</StyledText>
      <TextInput
        style={styles(currentThemeColors).input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email address"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isGoogleSignIn}
        selectTextOnFocus={!isGoogleSignIn}
        placeholderTextColor={currentThemeColors.textSecondary}
      />
      {!isGoogleSignIn && <StyledText style={styles(currentThemeColors).infoText}>Changing email might require re-authentication.</StyledText>}
      {isGoogleSignIn && <StyledText style={styles(currentThemeColors).infoText}>Email cannot be changed for Google accounts.</StyledText>}

      <Button 
        title={isSaving ? 'Saving...' : 'Save Changes'} 
        onPress={handleSave} 
        disabled={isSaving || authLoading}
        color={currentThemeColors.primary} 
      />
      {authError && <StyledText style={styles(currentThemeColors).errorText}>Error: {authError.message}</StyledText>}
    </View>
  );
}

const styles = (themeColors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: themeColors.background,
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
  },
  avatarContainer: {
    marginBottom: 30,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: themeColors.border,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: themeColors.primary,
    padding: 8,
    borderRadius: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: themeColors.text,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 12,
    marginBottom: 20,
    borderRadius: 5,
    fontSize: 16,
    color: themeColors.text,
    backgroundColor: themeColors.card,
  },
  infoText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
  },
  errorText: {
    color: themeColors.error,
    marginTop: 10,
    textAlign: 'center',
  },
}); 