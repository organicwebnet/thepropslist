import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native'; // Use basic RN elements for layout
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { type Prop, type PropFormData } from '@/shared/types/props';
import { WebPropForm } from '@/platforms/web/components/WebPropForm'; // Import the web form

export default function WebEditPropScreen() {
  const router = useRouter();
  const { id: propId } = useLocalSearchParams<{ id: string }>();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();

  const [propData, setPropData] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch prop data
  useEffect(() => {
    let isMounted = true;
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
          if (doc?.data) {
            // Now correctly assign Prop to Prop | null state
            setPropData(doc.data); 
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
    return () => { isMounted = false; };
  }, [propId, firebaseInitialized, firebaseService]);

  // Handle update submission - Change return type to Promise<void>
  const handleUpdateProp = async (formData: PropFormData): Promise<void> => { 
    if (!user || !firebaseInitialized || !firebaseService?.updateDocument || !propId) {
      console.error("Update Prop Error: User, Service, or Prop ID missing.");
      alert('Error: Could not update prop. Missing information.'); 
      return; // Return void
    }

    try {
      const propDataToUpdate: Partial<Prop> = {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      delete (propDataToUpdate as any).id;

      await firebaseService.updateDocument('props', propId, propDataToUpdate);
      console.log("Prop updated with ID:", propId);
      router.replace('/(web)/props');
      // Don't return true anymore
    } catch (err) {
      console.error('Error updating prop via service:', err);
      alert('Error: Failed to update prop.');
      // Don't return false anymore
    }
  };

  const handleCancel = () => {
    router.back(); // Go back to the previous screen (web prop list)
  };

  // Render Logic (Web specific layout)
  // Using View/Text for structure, WebPropForm handles the form elements
  if (loading || !firebaseInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Stack.Screen options={{ title: 'Loading Prop...' }} />
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#111827' }}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={{ color: '#EF4444', fontSize: 18, textAlign: 'center' }}>{error}</Text>
        <View style={{ marginTop: 20 }}> 
           <button 
                onClick={() => router.back()} 
                className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-md"
            >
                Go Back
            </button>
        </View>
      </View>
    );
  }

  if (!propData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text style={{ color: 'white', fontSize: 18 }}>Prop could not be loaded.</Text>
         <View style={{ marginTop: 20 }}> 
           <button 
                onClick={() => router.back()} 
                className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md shadow-md"
            >
                Go Back
            </button>
        </View>
      </View>
    );
  }

  return (
    // Use basic View for page structure, let WebPropForm handle internals
    <View style={{ flex: 1, padding: 20, backgroundColor: '#111827' }}> 
      <Stack.Screen options={{ title: `Edit: ${propData.name}` }} />
      <WebPropForm
        initialData={propData}
        onSubmit={handleUpdateProp}
        onCancel={handleCancel}
        isSubmitting={loading}
        imageFiles={null}
        onImageChange={() => { /* Placeholder */ }}
        imagePreviews={[]}
        mode="edit"
      />
    </View>
  );
} 