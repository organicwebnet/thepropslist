import React from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import ShowFormNative from '../../src/components/ShowForm.native';
import { useShows } from '../../src/contexts/ShowsContext';
import type { Show } from '../../src/types';

export default function NewShowScreen() {
  const router = useRouter();
  const { addShow, isLoading } = useShows();

  const handleSubmit = async (formData: Partial<Show>) => {
    // Ensure all required fields for a new show are present if ShowFormNative provides Partial<Show>
    // The addShow function in ShowsContext expects Omit<Show, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    // We need to transform formData to match that, or ensure ShowFormNative provides enough data.
    const showDataForContext = formData as Omit<Show, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

    const newShowId = await addShow(showDataForContext);
    if (newShowId) {
      Alert.alert('Show Created', 'The new show has been added successfully.');
      router.back();
    } else {
      Alert.alert('Error', 'Failed to create the show. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Create New Show' }} />
      <ShowFormNative
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={{}} 
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          {/* Optional: Add an ActivityIndicator here if form doesn't have its own */}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 