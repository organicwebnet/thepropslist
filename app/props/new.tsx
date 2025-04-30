// This file will be renamed to add.tsx
// Content remains the same for now.
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { NativePropForm } from '@/components/NativePropForm';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { type Prop, type PropFormData } from '@/shared/types/props';

export default function AddPropScreen() {
  const router = useRouter();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();
  const { showId } = useLocalSearchParams<{ showId?: string }>();

  const handleAddNewProp = async (formData: PropFormData): Promise<boolean> => {
    if (!user || !firebaseInitialized || !firebaseService?.addDocument || !showId) {
       console.error("Add Prop Error: User, Service, or Show ID missing.", { userId: user?.uid, firebaseInitialized, showId });
       Alert.alert('Error', 'Could not add prop. Missing required context (User, Show ID, or Service).');
       return false;
    }
    
    try {
      const propDataToAdd: Omit<Prop, 'id'> = {
        ...formData,
        userId: user.uid,
        showId: showId,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
      };
      const docRef = await firebaseService.addDocument('props', propDataToAdd);
      console.log("Prop added with ID:", docRef.id);
      return true;
    } catch (error) { 
      console.error('Error adding prop via service:', error);
      Alert.alert('Error', 'Failed to add prop.');
      return false;
    }
  };

  if (!firebaseInitialized) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Add New Prop' }} />
            <View style={styles.container}><Text style={styles.text}>Loading...</Text></View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Add New Prop' }} />
      <NativePropForm 
          onFormSubmit={handleAddNewProp}
          submitButtonText="Add Prop"
          showAddAnotherButton={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
}); 