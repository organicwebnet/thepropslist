import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, ScrollView, Text, Alert } from 'react-native';
import ShowForm from '@/components/ShowForm.tsx';
import { useFirebase } from '@/contexts/FirebaseContext.tsx';
import { Show } from '@/shared/services/firebase/types.ts';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewShowPage() {
  const { service, isInitialized, error: firebaseError } = useFirebase();
  const router = useRouter();

  const handleAddShow = async (showData: Show) => {
    if (!isInitialized || !service || firebaseError) {
      Alert.alert('Error', 'Firebase not initialized or service unavailable.');
      return;
    }
    
    const currentUser = service.auth().currentUser; 
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      const { id, ...dataWithoutId } = showData;
      const dataToSave: Omit<Show, 'id'> & { userId: string, createdAt: string, updatedAt: string } = { 
        ...dataWithoutId,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("Attempting to add show:", dataToSave);
      await service.addDocument('shows', dataToSave); 
      console.log("Show added successfully");
      Alert.alert('Success', 'Show created successfully!');
      router.push('/shows'); // Navigate back to the shows list
    } catch (error) {
      console.error('Error adding show:', error);
      Alert.alert('Error', `Failed to create show: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    router.back(); // Or router.push('/shows');
  };

  if (firebaseError) {
    return (
      <View style={styles.centered}><Text style={styles.errorText}>Error initializing Firebase: {firebaseError.message}</Text></View>
    );
  }

  if (!isInitialized) {
     return (
      <View style={styles.centered}><Text>Loading Firebase...</Text></View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.container}>
        {/* Title is now handled within ShowForm */}
        <ShowForm 
          mode="create" 
          onSubmit={handleAddShow} 
          onCancel={handleCancel} 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827', // bg-gray-900
  },
  container: {
    flex: 1,
    // Padding potentially handled by ShowForm
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111827', // Match safeArea
  },
  errorText: {
      color: 'red',
  },
  // Removed unused title style
}); 