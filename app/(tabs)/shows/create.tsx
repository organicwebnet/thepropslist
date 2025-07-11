import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import ShowFormNative from '../../../src/components/ShowForm.native';
import { useShows } from '../../../src/contexts/ShowsContext';
import type { Show } from '../../../src/shared/services/firebase/types'; // Using Show from firebase/types
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../../src/styles/theme';
import LinearGradient from 'react-native-linear-gradient';

export default function CreateShowScreen() {
  const router = useRouter();
  const { addShow, isLoading: isAddingShow } = useShows();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getStyles(currentThemeColors);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (formDataFromForm: Partial<Show> & { _logoImageUri?: string | null }) => {
    setIsSubmitting(true);
    
    // Prepare data for addShow: remove fields managed by the context/backend
    // and the temporary _logoImageUri field.
    const { id, userId, createdAt, updatedAt, _logoImageUri, ...showDataForContext } = formDataFromForm;

    // For now, if _logoImageUri is present, we'll ignore it as addShow doesn't handle it directly yet.
    // A more robust solution would involve uploading the image and then setting logoImage.url.
    // If _logoImageUri is null, it means remove existing: set logoImage to null or undefined.
    if (_logoImageUri === null && showDataForContext.logoImage) {
      showDataForContext.logoImage = undefined; // Or null, depending on backend expectation for removal
    }
    // If _logoImageUri has a value, future: upload, get URL, set showDataForContext.logoImage = { id: newId, url: newUrl }

    try {
      // Asserting type for addShow, as ShowFormNative provides Partial<Show>
      // and addShow expects Omit<Show, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
      // This assumes the form provides all necessary fields for a new show.
      const newShowId = await addShow(showDataForContext as Omit<Show, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
      
      if (newShowId) {
        Alert.alert('Success', 'Show created successfully!', [
          { text: 'OK', onPress: () => router.replace(`/shows/${newShowId}` as any) }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create show. No ID returned.');
      }
    } catch (error: any) {
      console.error('Error creating show:', error);
      Alert.alert('Error Creating Show', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAddingShow || isSubmitting) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Create New Show' }} />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ShowFormNative
            mode="create"
            onSubmit={handleFormSubmit}
            onCancel={() => router.back()}
          />
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
