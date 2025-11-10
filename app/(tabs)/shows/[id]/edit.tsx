import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import ShowFormNative from '../../../../src/components/ShowForm.native';
import { useShows } from '../../../../src/contexts/ShowsContext';
import { usePermissions } from '../../../../src/hooks/usePermissions';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { Permission } from '../../../../src/shared/permissions';
import type { Show } from '../../../../src/shared/services/firebase/types';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../../../src/styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import { useFirebase } from '../../../../src/platforms/mobile/contexts/FirebaseContext';

export default function EditShowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const showId = params.id;
  const { updateShow, isLoading: isUpdatingShow } = useShows();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getStyles(currentThemeColors);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const { service: firebaseService, isInitialized } = useFirebase();

  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate user is available
  if (!user) {
    return null; // Will redirect via auth guard
  }

  // Check permissions on mount
  const canEditShows = hasPermission(Permission.EDIT_SHOWS);

  useEffect(() => {
    if (!canEditShows) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to edit shows.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [canEditShows, router]);

  // Fetch show data
  useEffect(() => {
    if (!showId || !firebaseService || !isInitialized) return;

    const fetchShow = async () => {
      try {
        setLoading(true);
        const showDoc = await firebaseService.getDocument<Show>('shows', showId);
        
        if (showDoc && showDoc.data) {
          setShow(showDoc.data);
        } else {
          setError('Show not found');
          Alert.alert('Error', 'Show not found', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching show:', err);
        setError(err.message || 'Failed to load show');
        Alert.alert('Error', 'Failed to load show', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchShow();
  }, [showId, firebaseService, isInitialized, router]);

  const handleFormSubmit = async (formDataFromForm: Partial<Show> & { _logoImageUri?: string | null }) => {
    if (!user || !showId) {
      Alert.alert('Error', 'You must be logged in to edit a show.');
      return;
    }

    // Check permission before updating
    if (!canEditShows) {
      Alert.alert(
        'Permission Denied',
        'You do not have permission to edit shows.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for updateShow: remove fields managed by the context/backend
      // and the temporary _logoImageUri field.
      const { id, userId, createdAt, updatedAt, _logoImageUri, ...showDataForContext } = formDataFromForm;

      // Handle logo image
      if (_logoImageUri === null && showDataForContext.logoImage) {
        showDataForContext.logoImage = undefined; // Remove logo
      }
      // If _logoImageUri has a value, future: upload, get URL, set showDataForContext.logoImage = { id: newId, url: newUrl }

      // Update the show
      await updateShow(showId, showDataForContext as Partial<Show>);
      
      Alert.alert('Success', 'Show updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating show:', error);
      Alert.alert('Error Updating Show', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading || isUpdatingShow || isSubmitting) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <Stack.Screen
          options={{
            title: 'Edit Show',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
        </View>
      </LinearGradient>
    );
  }

  if (error || !show) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <Stack.Screen
          options={{
            title: 'Edit Show',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Show not found'}</Text>
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
      <Stack.Screen
        options={{
          title: 'Edit Show',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <ShowFormNative
          mode="edit"
          initialData={show}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

