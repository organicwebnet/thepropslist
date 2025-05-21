import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTheme, Theme } from '../../../src/contexts/ThemeContext';
import { useFont, FontChoice } from '../../../src/contexts/FontContext';
import StyledText from '../../../src/components/StyledText';

// Re-define darkThemeColors locally or import from a shared constants file if it exists
// For consistency with other new files, defining it here:
const darkThemeColors = {
  background: '#111827', 
  cardBg: '#1F2937',      
  textPrimary: '#F9FAFB',  
  textSecondary: '#9CA3AF',
  inputBg: '#374151',     
  inputBorder: '#4B5563', 
  primary: '#3B82F6',     
  error: '#EF4444',       
  listItemBg: '#374151', // Slightly lighter than cardBg for list items
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { font, setFont, isLoadingFont } = useFont();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigate to auth screen or home after sign out
      // router.replace('/(auth)/login'); // Or your specific auth route
    } catch (error) {
      console.error("Error signing out from profile:", error);
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  const ThemeOptionButton = ({ value, title }: { value: Theme, title: string }) => (
    <TouchableOpacity 
        style={[styles.optionButton, theme === value && styles.optionButtonSelected]} 
        onPress={() => setTheme(value)}
    >
        <StyledText style={styles.optionButtonText}>{title}</StyledText>
    </TouchableOpacity>
  );

  // Updated FontOptionButton to use FontContext
  const FontOptionButton = ({ value, title }: { value: FontChoice, title: string }) => (
    <TouchableOpacity 
        style={[styles.optionButton, font === value && styles.optionButtonSelected]} 
        onPress={() => setFont(value)}
    >
        <StyledText style={styles.optionButtonText}>{title}</StyledText>
    </TouchableOpacity>
  );

  // Show loading indicator if font preference is still loading
  if (isLoadingFont) {
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={darkThemeColors.primary} />
              <StyledText type="secondary" style={{marginTop: 10}}>Loading preferences...</StyledText>
          </View>
      );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Profile & Settings' }} />

      <View style={styles.section}>
        <StyledText style={styles.sectionTitle}>Account</StyledText>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={20} color={darkThemeColors.textSecondary} style={styles.infoIcon} />
          <StyledText type="secondary" style={styles.infoText}>Name: {user?.displayName || 'Not set'}</StyledText>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={20} color={darkThemeColors.textSecondary} style={styles.infoIcon} />
          <StyledText type="secondary" style={styles.infoText}>Email: {user?.email || 'N/A'}</StyledText>
        </View>
         {/* Add other user details if available/needed */}
      </View>

      <View style={styles.section}>
        <StyledText style={styles.sectionTitle}>Appearance</StyledText>
        <StyledText type="secondary" style={styles.settingLabel}>Theme</StyledText>
        <View style={styles.optionsContainer}>
            <ThemeOptionButton value="light" title="Light" />
            <ThemeOptionButton value="dark" title="Dark" />
        </View>
      </View>

      <View style={styles.section}>
        <StyledText style={styles.sectionTitle}>Accessibility</StyledText>
        <StyledText type="secondary" style={styles.settingLabel}>Font</StyledText>
        <View style={styles.optionsContainer}>
            <FontOptionButton value="default" title="Default" />
            <FontOptionButton value="openDyslexic" title="OpenDyslexic" />
        </View>
        {/* Placeholder for font size, etc. */}
      </View>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="exit-outline" size={22} color={darkThemeColors.error} style={{marginRight: 10}} />
        <StyledText customColor={darkThemeColors.error} style={styles.signOutButtonText}>Sign Out</StyledText>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkThemeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.background,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkThemeColors.cardBg,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoText: {
  },
  settingLabel: {
    marginBottom: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  optionButton: {
    backgroundColor: darkThemeColors.listItemBg,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkThemeColors.inputBorder,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  optionButtonSelected: {
    backgroundColor: darkThemeColors.primary,
    borderColor: darkThemeColors.primary,
  },
  optionButtonText: {
    fontSize: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: darkThemeColors.cardBg, 
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkThemeColors.error, 
  },
  signOutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 