import React, { useState /*, useContext */ } from 'react';
import { View, ActivityIndicator, Alert, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
// import { NativePropForm } from '@/src/components/NativePropForm'; 
import { NativePropForm } from '../../src/components/NativePropForm.tsx'; // Corrected path to include src
// import { useProps } from '@/src/contexts/PropsContext'; 
import { useProps } from '../../src/contexts/PropsContext.tsx'; // Corrected path to include src
// import type { PropFormData } from '@/src/shared/types/props'; 
import type { PropFormData } from '../../src/shared/types/props.ts'; // Corrected path to include src
// import { ThemeContext } from '@/src/contexts/ThemeContext'; 
import { useTheme } from '../../src/contexts/ThemeContext.tsx'; // Corrected path to include src
// import { lightTheme, darkTheme } from '@/src/theme'; 
import { lightTheme, darkTheme } from '../../src/theme.ts'; // Corrected path to include src

export default function CreatePropScreen() {
  const router = useRouter();
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const { addProp, loading: propsLoading, error: propsError } = useProps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const { themeName, resolvedScheme } = useContext(ThemeContext);
  // const currentThemeColors = resolvedScheme === 'dark' ? darkTheme.colors : lightTheme.colors;
  const { theme } = useTheme();
  const currentThemeColors = theme === 'dark' ? darkTheme.colors : lightTheme.colors;

  if (!showId) {
    Alert.alert('Error', 'Show ID is missing. Cannot create prop.');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/shows'); // Fallback to shows tab
    return (
      <View style={[styles.centered, { backgroundColor: currentThemeColors.background }]}>
        <Text style={{ color: currentThemeColors.error }}>Missing Show ID.</Text>
      </View>
    );
  }

  const handleFormSubmit = async (data: PropFormData): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      // Ensure showId is included if your addProp function expects it directly
      // or if it's handled within addProp via context/other means.
      // For now, assuming addProp itself knows how to get/use selectedShow.id if needed
      // or that showId is primarily for initial context/filtering, not direct prop data.
      // The Prop type itself requires showId, so addProp MUST handle this.

      const newPropId = await addProp(data); // addProp from context uses selectedShow.id internally

      if (newPropId) {
        Alert.alert('Success', 'Prop added successfully!');
        // Navigate to the new prop's detail screen or back to list
        // router.replace(`/propsTab/${newPropId}`); // Assuming props list is in propsTab
        router.replace({ pathname: `/props_shared_details/${newPropId}` as any, params: { entityType: 'prop' } });
        return true;
      } else {
        Alert.alert('Error', propsError?.message || 'Failed to add prop. No ID returned.');
        return false;
      }
    } catch (e: any) {
      console.error("CreatePropScreen Error:", e);
      Alert.alert('Error', e.message || 'An unexpected error occurred.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: currentThemeColors.background }]}>
      <Stack.Screen options={{ title: 'Add New Prop' }} />
      {isSubmitting || propsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
          <Text style={{color: currentThemeColors.text, marginTop: 10}}>Saving Prop...</Text>
        </View>
      ) : (
        <NativePropForm
          onFormSubmit={handleFormSubmit}
          submitButtonText="Add Prop"
          // initialData can be an empty object or have defaults if needed
          initialData={{ 
            name: '',
            description: '',
            category: 'Other', // Default category
            price: 0,
            quantity: 1,
            source: 'owned', // Default source
            status: 'confirmed', // Default status
            // Ensure all required fields in PropFormData are initialized if NativePropForm expects them
          }}
          showAddAnotherButton={true} // Allow adding multiple props quickly
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add any other styles needed for this screen
}); 