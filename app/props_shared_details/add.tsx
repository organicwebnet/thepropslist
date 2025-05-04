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
  const { showId: showIdFromParams } = useLocalSearchParams<{ showId?: string }>(); 
  const showId = showIdFromParams || 'TEST_NO_PARAM'; // Use param if available, else placeholder

  const handleAddNewProp = async (formData: PropFormData): Promise<boolean> => {
    if (!user || !firebaseInitialized || !firebaseService?.addDocument || !showId || showId === 'TEST_NO_PARAM') { 
       console.error("Add Prop Error: User, Service, or Show ID missing.", { userId: user?.uid, firebaseInitialized, showId });
       const alertMessage = showId === 'TEST_NO_PARAM' 
         ? 'Could not add prop. Show ID parameter missing in navigation.'
         : 'Could not add prop. Missing required context (User, Show ID, or Service).';
       Alert.alert('Error', alertMessage);
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
      return true; // Indicate success
    } catch (error) {
      console.error("Add Prop Error:", error);
      Alert.alert('Error', 'An error occurred while adding the prop.');
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
    justifyContent: 'center', // Center loading text
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
}); 