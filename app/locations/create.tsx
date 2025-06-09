import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Building } from 'lucide-react-native';

import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../src/styles/theme.ts';
import { useLocations } from '../../src/hooks/useLocations.ts';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import StyledText from '../../src/components/StyledText.tsx';

export default function CreateLocationScreen() {
  const router = useRouter();
  const { selectedShow } = useShows();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const s = styles(currentThemeColors);

  // Ensure selectedShow and its id are available
  const showId = selectedShow?.id;
  const { operations, loading: locationsHookLoading, error: locationsHookError } = useLocations(showId); 

  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveLocation = async () => {
    if (!locationName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for the location.');
      return;
    }
    if (!showId) {
      Alert.alert('Error', 'Show ID is missing. Cannot create location. Please select a show first.');
      return;
    }

    setIsSaving(true);
    try {
      const newLocationId = await operations.createLocation(locationName.trim(), showId, description.trim());
      if (newLocationId) {
        Alert.alert('Success', 'Location created successfully!', [
          // Navigate to a locations list screen or back, depending on desired flow
          { text: 'OK', onPress: () => router.back() } 
        ]);
      } else {
        Alert.alert('Error', locationsHookError?.message || 'Failed to create location. No ID returned.');
      }
    } catch (error: any) {
      console.error('Error creating location:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred while creating the location.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!selectedShow) {
    return (
      <View style={s.centeredMessageContainer}>
        <StyledText style={s.centeredMessageText}>Please select a show first to create a location.</StyledText>
      </View>
    );
  }

  // Loading state from the hook itself (initial data fetch for the show, though not directly used here)
  if (locationsHookLoading && !isSaving) { 
    return (
      <View style={s.centeredMessageContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      <Stack.Screen options={{ title: 'Create New Location' }} />
      <ScrollView contentContainerStyle={s.scrollContentContainer}>
        <View style={s.formContainer}>
          <StyledText style={s.label}>Location Name*</StyledText>
          <TextInput
            style={s.input}
            placeholder="e.g., Shelf A1, Props Table West"
            value={locationName}
            onChangeText={setLocationName}
            placeholderTextColor={currentThemeColors.textSecondary || '#ccc'}
          />

          <StyledText style={s.label}>Description (Optional)</StyledText>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Details about the location, e.g., 'Top shelf, behind the painting station'"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor={currentThemeColors.textSecondary || '#ccc'}
          />

          {locationsHookError && !isSaving && (
            <StyledText style={s.errorText}>Error with locations context: {locationsHookError.message}</StyledText>
          )}

          <TouchableOpacity
            style={[s.saveButton, isSaving ? s.saveButtonDisabled : {}]}
            onPress={handleSaveLocation}
            disabled={isSaving || !showId} // Also disable if no showId for safety
          >
            {isSaving ? (
              <ActivityIndicator color={s.saveButtonText.color} />
            ) : (
              <>
                <Building size={20} color={s.saveButtonText.color} style={s.buttonIcon} />
                <StyledText style={s.saveButtonText}>Save Location</StyledText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (themeColors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: themeColors.background,
  },
  centeredMessageText: {
    fontSize: 16,
    textAlign: 'center',
    color: themeColors.text,
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
    backgroundColor: themeColors.inputBackground, 
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
    minHeight: 80, // Use minHeight for better multiline experience
    textAlignVertical: 'top', 
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