import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { NativePropForm } from '@/components/NativePropForm.tsx'; // Import the form
import { useFirebase } from '@/contexts/FirebaseContext.tsx'; // Import Firebase hook
import { useAuth } from '@/contexts/AuthContext.tsx'; // Import Auth hook
import { type Prop, type PropFormData } from '@/shared/types/props.ts';
import { FirebaseDocument } from '@/shared/services/firebase/types.ts';

// TODO: Import and use NativePropForm, fetch prop data

export default function EditPropScreen() {
  const router = useRouter();
  const { id: propId } = useLocalSearchParams<{ id: string }>(); // Get prop ID from route
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();

  const [propData, setPropData] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch prop data using getDocument
  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component
    
    const fetchProp = async () => {
      if (!propId || !firebaseInitialized || !firebaseService?.getDocument) {
        if (firebaseInitialized && isMounted) { 
            setError('Failed to load prop data: Invalid ID or service unavailable.');
            setLoading(false);
        }
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const doc = await firebaseService.getDocument<Prop>('props', propId);
        if (isMounted) { 
          if (doc && doc.data) {
            setPropData(doc.data as Prop);
          } else {
            setError('Prop not found.');
            setPropData(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching prop:", err);
        if (isMounted) {
            setError('Failed to load prop data.');
            setLoading(false);
        }
      }
    };

    fetchProp();

    // Cleanup function
    return () => {
        isMounted = false;
    };

  }, [propId, firebaseInitialized, firebaseService]);

  // Handle update submission
  const handleUpdateProp = async (formData: PropFormData): Promise<boolean> => {
    if (!user || !firebaseInitialized || !firebaseService?.updateDocument || !propId) { 
       console.error("Update Prop Error: User, Service, or Prop ID missing.");
       Alert.alert('Error', 'Could not update prop. Missing information.');
       return false;
    }
    
    try {
      const propDataToUpdate: Partial<Prop> = {
        ...formData, // NativePropForm now provides the full updated data
        userId: user.uid, // Ensure userId is set correctly
        updatedAt: new Date().toISOString(), 
      };
      // Remove id if it accidentally got included in formData
      delete (propDataToUpdate as any).id; 
      
      await firebaseService.updateDocument('props', propId, propDataToUpdate);
      console.log("Prop updated with ID:", propId);
      return true;
    } catch (err) {
      console.error('Error updating prop via service:', err);
      Alert.alert('Error', 'Failed to update prop.');
      return false;
    }
  };

  // --- Render Logic --- 
  if (loading || !firebaseInitialized) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Loading Prop...' }} />
            <View style={styles.container}><ActivityIndicator size="large" color="#FFFFFF" /></View>
        </SafeAreaView>
    );
  }

  if (error) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Error' }} />
            <View style={styles.container}><Text style={styles.errorText}>{error}</Text></View>
        </SafeAreaView>
    );
  }

  if (!propData) {
     // Should be caught by error state, but added as safeguard
     return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Not Found' }} />
            <View style={styles.container}><Text style={styles.text}>Prop could not be loaded.</Text></View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Edit: ${propData.name}` }} />
      <NativePropForm 
          initialData={propData} // Pass fetched prop data
          onFormSubmit={handleUpdateProp}
          submitButtonText="Save Changes"
          // showAddAnotherButton is false by default
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
  errorText: {
    color: '#EF4444', // Red color for errors
    fontSize: 18,
    textAlign: 'center',
  },
}); 