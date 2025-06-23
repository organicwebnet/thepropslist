import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../../src/styles/theme';
import { usePacking } from '../../../src/hooks/usePacking';

export default function CreateBoxScreen() {
  const router = useRouter();
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getStyles(currentThemeColors);

  const { operations, loading: packingHookLoading, error: packingHookError } = usePacking(showId);

  const [boxName, setBoxName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBox = async () => {
    if (!boxName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for the box.');
      return;
    }
    if (!showId) {
      Alert.alert('Error', 'Show ID is missing. Cannot create box.');
      return;
    }

    setIsSaving(true);
    try {
      // Props array is empty for a new box
      const newBoxId = await operations.createBox([], boxName.trim(), description.trim());
      if (newBoxId) {
        Alert.alert('Success', 'Box created successfully!', [
          { text: 'OK', onPress: () => router.replace(`/packing/box/${newBoxId}?showId=${showId}`) }
        ]);
      } else {
        Alert.alert('Error', packingHookError?.message || 'Failed to create box. No ID returned.');
      }
    } catch (error: any) {
      console.error('Error creating box:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred while creating the box.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (packingHookLoading && !isSaving) { // Show loading only if packing hook is initially loading
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Create New Box' }} />
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Box Name*</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Act I Props, Kitchenware"
            value={boxName}
            onChangeText={setBoxName}
            placeholderTextColor={currentThemeColors.textSecondary || '#ccc'}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional: Add any details about the box contents or handling instructions."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor={currentThemeColors.textSecondary || '#ccc'}
          />

          {packingHookError && !isSaving && (
            <Text style={styles.errorText}>Error with packing context: {packingHookError.message}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : {}]}
            onPress={handleSaveBox}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={styles.saveButtonText.color} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color={styles.saveButtonText.color} style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save Box</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
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
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: themeColors.card,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: themeColors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: themeColors.background, // Slightly different background for input
    color: themeColors.text,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top', // For Android
  },
  saveButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: themeColors.primary, // Or a disabled color from theme
    opacity: 0.7,
  },
  saveButtonText: {
    color: themeColors.card, // Assuming primary button text is light/contrasting
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
}); 