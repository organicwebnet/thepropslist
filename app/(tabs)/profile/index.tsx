import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext.tsx';
import { useTheme, Theme as ThemeName } from '../../../src/contexts/ThemeContext.tsx';
import { useFont, FontChoice } from '../../../src/contexts/FontContext.tsx';
import StyledText from '../../../src/components/StyledText.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../../src/theme.ts';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme: themeName, setTheme } = useTheme();
  const { font, setFont, isLoadingFont } = useFont();

  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error("Error signing out from profile:", error);
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  const ThemeOptionButton = ({ value, title }: { value: ThemeName, title: string }) => (
    <TouchableOpacity 
        style={[styles(currentThemeColors).optionButton, themeName === value && styles(currentThemeColors).optionButtonSelected]} 
        onPress={() => setTheme(value)}
    >
        <StyledText style={styles(currentThemeColors).optionButtonText}>{title}</StyledText>
    </TouchableOpacity>
  );

  const FontOptionButton = ({ value, title }: { value: FontChoice, title: string }) => (
    <TouchableOpacity 
        style={[styles(currentThemeColors).optionButton, font === value && styles(currentThemeColors).optionButtonSelected]} 
        onPress={() => setFont(value)}
    >
        <StyledText style={styles(currentThemeColors).optionButtonText}>{title}</StyledText>
    </TouchableOpacity>
  );

  if (isLoadingFont) {
      return (
          <View style={styles(currentThemeColors).loadingContainer}>
              <ActivityIndicator size="large" color={currentThemeColors.primary} />
              <StyledText type="secondary" style={{marginTop: 10, color: currentThemeColors.text}}>Loading preferences...</StyledText>
          </View>
      );
  }

  return (
    <ScrollView style={styles(currentThemeColors).container}>
      <Stack.Screen options={{ title: 'Profile & Settings' }} />

      <View style={styles(currentThemeColors).section}>
        <StyledText style={styles(currentThemeColors).sectionTitle}>Account</StyledText>
        <View style={styles(currentThemeColors).infoItem}>
          <Ionicons name="person-outline" size={20} color={currentThemeColors.text} style={styles(currentThemeColors).infoIcon} />
          <StyledText type="secondary" style={{color: currentThemeColors.text}}>Name: {user?.displayName || 'Not set'}</StyledText>
        </View>
        <View style={styles(currentThemeColors).infoItem}>
          <Ionicons name="mail-outline" size={20} color={currentThemeColors.text} style={styles(currentThemeColors).infoIcon} />
          <StyledText type="secondary" style={{color: currentThemeColors.text}}>Email: {user?.email || 'N/A'}</StyledText>
        </View>
      </View>

      <View style={styles(currentThemeColors).section}>
        <StyledText style={styles(currentThemeColors).sectionTitle}>Appearance</StyledText>
        <StyledText type="secondary" style={{...styles(currentThemeColors).settingLabel, color: currentThemeColors.text}}>Theme</StyledText>
        <View style={styles(currentThemeColors).optionsContainer}>
            <ThemeOptionButton value="light" title="Light" />
            <ThemeOptionButton value="dark" title="Dark" />
        </View>
      </View>

      <View style={styles(currentThemeColors).section}>
        <StyledText style={styles(currentThemeColors).sectionTitle}>Accessibility</StyledText>
        <StyledText type="secondary" style={{...styles(currentThemeColors).settingLabel, color: currentThemeColors.text}}>Font</StyledText>
        <View style={styles(currentThemeColors).optionsContainer}>
            <FontOptionButton value="default" title="Default" />
            <FontOptionButton value="openDyslexic" title="OpenDyslexic" />
        </View>
      </View>
      
      <TouchableOpacity style={styles(currentThemeColors).signOutButton} onPress={handleSignOut}>
        <Ionicons name="exit-outline" size={22} color={currentThemeColors.error} style={{marginRight: 10}} />
        <StyledText customColor={currentThemeColors.error} style={styles(currentThemeColors).signOutButtonText}>Sign Out</StyledText>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
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
    color: themeColors.text,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 15,
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
    backgroundColor: themeColors.card,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  optionButtonSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  optionButtonText: {
    fontSize: 14,
    color: themeColors.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: themeColors.card,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.error,
  },
  signOutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 