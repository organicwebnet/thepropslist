import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, ScrollView, Text, Alert, Platform } from 'react-native';
import ShowFormNative from '../../../src/components/ShowForm.native'; // Changed import
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import type { Show } from '../../../src/shared/services/firebase/types'; // Changed import
// Removed ShowLogo import as it's an inline type in Show interface
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid'; // For generating logo ID
// Removed Button from react-native-paper as ShowFormNative will have its own buttons

// Placeholder for the native form - REMOVED
// const NativeShowFormPlaceholder = () => (...);

export default function NewShowNativePage() {
  const { service, isInitialized, error: firebaseError } = useFirebase();
  const router = useRouter();

  const handleAddShow = async (formData: Partial<Show> & { _logoImageUri?: string | null }) => { 
    if (Platform.OS === 'web') {
        Alert.alert("Error", "Web submission from native screen");
        return;
    }
    if (!isInitialized || !service || firebaseError || !service.uploadFile || !service.addDocument) {
      Alert.alert('Error', 'Firebase not initialized or service unavailable for upload/add.');
      return;
    }
    
    const currentUser = service.auth.currentUser; 
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      const { id, _logoImageUri, ...showDataFromForm } = formData; // Separate _logoImageUri

      let finalLogoImageObject: Show['logoImage'] = showDataFromForm.logoImage; // Use Show['logoImage'] type

      if (_logoImageUri === null) { 
        finalLogoImageObject = undefined; // Set to undefined if explicitly removed
      } else if (typeof _logoImageUri === 'string' && _logoImageUri.startsWith('file://')) {
        // New URI selected, needs upload
        const fileName = _logoImageUri.split('/').pop() || `logo-${Date.now()}`;
        // It's good practice to store user-specific files in a path related to the user or the show
        // For now, let's assume a general 'show_logos' path, but this could be refined.
        // Using a temp showId or a placeholder until the actual showId is known might be tricky.
        // Best to upload to a generic path or a path based on userId, then potentially move/reference it if needed.
        const logoId = uuidv4();
        const storagePath = `show_logos/${currentUser.uid}/${logoId}-${fileName}`;
        try {
          console.log(`Uploading logo: ${_logoImageUri} to ${storagePath}`);
          const downloadURL = await service.uploadFile(storagePath, _logoImageUri);
          finalLogoImageObject = { id: logoId, url: downloadURL, caption: '' }; 
          console.log(`Logo uploaded successfully: ${downloadURL}`);
        } catch (uploadError) {
          console.error('Error uploading logo image:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload logo image. Proceeding without logo.');
          finalLogoImageObject = undefined; 
        }
      } else if (typeof _logoImageUri === 'string') {
        // This case implies _logoImageUri is an existing URL that was re-confirmed, or form was for edit mode.
        // If it was an existing URL, finalLogoImageObject would already have it from showDataFromForm.logoImage
        // No action needed here if we trust the form logic to pass the existing object if URI hasn't changed.
      }

      const dataToSave: Omit<Show, 'id' | 'acts' | 'venues' | 'contacts' | 'rehearsalAddresses' | 'storageAddresses' | 'collaborators'> & { 
        userId: string, 
        createdAt: string, 
        updatedAt: string,
        acts: [], 
        venues: [],
        contacts: [],
        rehearsalAddresses: [],
        storageAddresses: [],
        collaborators: [],
        logoImage?: Show['logoImage'], // undefined is allowed by the type
      } = { 
        name: showDataFromForm.name || 'Untitled Show',
        description: showDataFromForm.description || '',
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTouringShow: showDataFromForm.isTouringShow || false,
        stageManager: showDataFromForm.stageManager || '',
        stageManagerEmail: showDataFromForm.stageManagerEmail || '',
        stageManagerPhone: showDataFromForm.stageManagerPhone || '',
        propsSupervisor: showDataFromForm.propsSupervisor || '',
        propsSupervisorEmail: showDataFromForm.propsSupervisorEmail || '',
        propsSupervisorPhone: showDataFromForm.propsSupervisorPhone || '',
        productionCompany: showDataFromForm.productionCompany || '',
        productionContactName: showDataFromForm.productionContactName || '',
        productionContactEmail: showDataFromForm.productionContactEmail || '',
        productionContactPhone: showDataFromForm.productionContactPhone || '',
        imageUrl: showDataFromForm.imageUrl || '',
        logoImage: finalLogoImageObject, // This can now be undefined
        startDate: showDataFromForm.startDate || '', 
        endDate: showDataFromForm.endDate || '',
        status: showDataFromForm.status || 'planning',
        acts: [], 
        venues: [],
        contacts: [],
        rehearsalAddresses: [],
        storageAddresses: [],
        collaborators: []
      };

      console.log("Attempting to add show (Native) with processed logo:", dataToSave);
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
