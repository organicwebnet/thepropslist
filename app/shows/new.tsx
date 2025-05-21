import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, ScrollView, Text, Alert, Platform } from 'react-native';
import ShowFormNative from '@/components/ShowForm.native'; // Changed import
import { useFirebase } from '@/contexts/FirebaseContext';
import { Show } from '@/types/index';
import { SafeAreaView } from 'react-native-safe-area-context';
// Removed Button from react-native-paper as ShowFormNative will have its own buttons

// Placeholder for the native form - REMOVED
// const NativeShowFormPlaceholder = () => (...);

export default function NewShowNativePage() {
  const { service, isInitialized, error: firebaseError } = useFirebase();
  const router = useRouter();

  const handleAddShow = async (showData: Partial<Show>) => { 
    if (Platform.OS === 'web') {
        Alert.alert("Error", "Web submission from native screen");
        return;
    }
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

      const dataToSave: Omit<Show, 'id' | 'acts' | 'venues' | 'contacts' | 'rehearsalAddresses' | 'storageAddresses' | 'collaborators'> & { 
        userId: string, 
        createdAt: string, 
        updatedAt: string,
        acts: [], 
        venues: [],
        contacts: [],
        rehearsalAddresses: [],
        storageAddresses: [],
        collaborators: []
      } = { 
        name: dataWithoutId.name || 'Untitled Show',
        description: dataWithoutId.description || '',
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTouringShow: dataWithoutId.isTouringShow || false,
        stageManager: dataWithoutId.stageManager || '', // Default empty string
        stageManagerEmail: dataWithoutId.stageManagerEmail || '',
        stageManagerPhone: dataWithoutId.stageManagerPhone || '',
        propsSupervisor: dataWithoutId.propsSupervisor || '',
        propsSupervisorEmail: dataWithoutId.propsSupervisorEmail || '',
        propsSupervisorPhone: dataWithoutId.propsSupervisorPhone || '',
        productionCompany: dataWithoutId.productionCompany || '',
        productionContactName: dataWithoutId.productionContactName || '',
        productionContactEmail: dataWithoutId.productionContactEmail || '',
        productionContactPhone: dataWithoutId.productionContactPhone || '',
        imageUrl: dataWithoutId.imageUrl || '',
        logoImage: dataWithoutId.logoImage || undefined,
        startDate: dataWithoutId.startDate || '', // Default empty string
        endDate: dataWithoutId.endDate || '',
        status: dataWithoutId.status || 'planning',
        acts: [], 
        venues: [],
        contacts: [],
        rehearsalAddresses: [],
        storageAddresses: [],
        collaborators: []
      };

      console.log("Attempting to add show (Native):", dataToSave);
      // Ensure dataToSave matches the expected type for addDocument, particularly non-optional fields
      const docRef = await service.addDocument('shows', dataToSave as Omit<Show, 'id'>); 
      console.log("Show added successfully (Native) with ID:", docRef.id);
      Alert.alert('Success', 'Show created successfully!');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/shows');
      }
    } catch (error) {
      console.error('Error adding show (Native):', error);
      Alert.alert('Error', `Failed to create show: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/shows');
    }
  };

  if (firebaseError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.centered}><Text style={styles.errorText}>Error initializing Firebase: {firebaseError.message}</Text></View>
      </SafeAreaView>
    );
  }

  if (!isInitialized) {
     return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.centered}><Text style={styles.loadingText}>Loading Firebase...</Text></View>
      </SafeAreaView>
    );
  }

  // REMOVED handleDummySubmit

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Add New Show</Text>
        
        <ShowFormNative 
          mode="create" 
          onSubmit={handleAddShow} 
          onCancel={handleCancel} 
        />
        
        {/* REMOVED Button container and dummy submit button */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827', 
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16, // Added horizontal padding here
    paddingBottom: 16, // Ensure padding at the bottom as well
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
      color: '#FF6B6B', 
      fontSize: 16,
  },
  loadingText: {
      color: '#E0E0E0', 
      fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16, // Added marginTop for spacing from SafeArea top
    marginBottom: 20,
    textAlign: 'center',
  },
  // REMOVED buttonContainer, button, cancelButton, buttonLabel styles as they are now in ShowFormNative
}); 