import React, { useState, useEffect } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native'; // Keep basic RN elements, Added TouchableOpacity, Removed ActivityIndicator
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '../../../../src/contexts/FirebaseContext.tsx';
import { useAuth } from '../../../../src/contexts/AuthContext.tsx';
import { useShows } from '../../../../src/contexts/ShowsContext.tsx'; // Added useShows
import { type Prop, type PropFormData } from '../../../../src/shared/types/props.ts'; 
import type { Show as SharedShow } from '../../../../src/shared/services/firebase/types.ts'; // Changed import for Show type
// import { WebPropForm } from '@/platforms/web/components/WebPropForm'; // Removed WebPropForm
import { PropForm } from '../../../../src/components/PropForm.tsx'; // Added PropForm

export default function WebEditPropScreen() {
  console.log("Currently rendering: WebEditPropScreen"); // DEBUG LOG
  const router = useRouter();
  const { id: propId } = useLocalSearchParams<{ id: string }>();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();
  const { getShowById } = useShows(); // Added getShowById

  const [propData, setPropData] = useState<Prop | null>(null);
  const [selectedShow, setSelectedShow] = useState<SharedShow | null>(null); // Added state for show
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Added isSubmitting state
  const [error, setError] = useState<string | null>(null);

  // Fetch prop data AND associated show data
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!propId || !firebaseInitialized || !firebaseService?.getDocument || !getShowById) {
        if (firebaseInitialized && isMounted) {
          setError('Failed to load data: Invalid ID or service unavailable.');
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch prop first
        const propDoc = await firebaseService.getDocument<Prop>('props', propId);
        let fetchedProp: Prop | null = null;
        if (propDoc?.data) {
          fetchedProp = propDoc.data;
        } else {
          if (isMounted) setError('Prop not found.');
        }

        if (fetchedProp && fetchedProp.showId) {
          // If prop found and has showId, fetch show
          const showData = await getShowById(fetchedProp.showId);
          if (showData) {
            if (isMounted) {
              setPropData(fetchedProp);
              setSelectedShow(showData);
            }
          } else {
            if (isMounted) setError(`Associated show (ID: ${fetchedProp.showId}) not found.`);
          }
        } else if (fetchedProp) {
           if (isMounted) setError('Prop data is missing the required Show ID.');
        } // Error already set if prop not found

        if (isMounted) setLoading(false);

      } catch (err) {
        console.error("Error fetching prop or show data:", err);
        if (isMounted) {
          setError('Failed to load required data.');
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [propId, firebaseInitialized, firebaseService, getShowById]);

  // Handle update submission - Needs adjustment for PropForm data structure
  const handleUpdateProp = async (formData: PropFormData): Promise<void> => { 
    if (!user || !firebaseInitialized || !firebaseService?.updateDocument || !propId) {
      console.error("Update Prop Error: User, Service, or Prop ID missing.");
      alert('Error: Could not update prop. Missing information.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Transform formData similar to create, but keep existing fields if not in formData
      const now = new Date().toISOString();
      const propDataToUpdate: Partial<Prop> = {
        ...(propData || {}), // Start with existing data
        ...formData,        // Override with form data
        // Ensure correct types
        act: formData.act ? Number(formData.act) : propData?.act, // Keep existing if undefined
        scene: formData.scene ? Number(formData.scene) : propData?.scene,
        quantity: Number(formData.quantity) || propData?.quantity || 1,
        price: Number(formData.price) || propData?.price || 0,
        length: formData.length ? Number(formData.length) : propData?.length,
        width: formData.width ? Number(formData.width) : propData?.width,
        height: formData.height ? Number(formData.height) : propData?.height,
        depth: formData.depth ? Number(formData.depth) : propData?.depth,
        weight: formData.weight ? Number(formData.weight) : propData?.weight,
        travelWeight: formData.travelWeight ? Number(formData.travelWeight) : propData?.travelWeight,
        preShowSetupDuration: formData.preShowSetupDuration ? Number(formData.preShowSetupDuration) : propData?.preShowSetupDuration,
        updatedAt: now,
        // Ensure userId is present (shouldn't change, but good practice)
        userId: propData?.userId || user.uid,
        showId: propData?.showId, // Keep original showId
      };
      
      // Remove fields that shouldn't be directly updated this way or are meta
      delete (propDataToUpdate as any).id;
      delete (propDataToUpdate as any).createdAt; 
      // Add other potential fields to remove if necessary

      console.log("Submitting update with data:", propDataToUpdate);
      await firebaseService.updateDocument('props', propId, propDataToUpdate);
      console.log("Prop updated with ID:", propId);
      router.push(`/props/${propId}`); // Go back to the detail view for this prop

    } catch (err) {
      console.error('Error updating prop via service:', err);
      alert('Error: Failed to update prop.');
      setError('Failed to update prop. Please try again.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back(); // Go back to the previous screen (detail or list)
  };

  // Loading State
  if (loading || !firebaseInitialized) {
    return (
      <View className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100 flex justify-center items-center">
        <Stack.Screen options={{ title: 'Loading...' }} />
        <Text>Loading Prop and Show Data...</Text>
      </View>
    );
  }

  // Error State
  if (error || !propData || !selectedShow) {
    return (
      <View className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
        <Stack.Screen options={{ title: 'Error' }} />
        <TouchableOpacity onPress={handleCancel} className="mb-4 text-blue-400 hover:text-blue-300">
          <Text>&larr; Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold mb-6 text-red-500">Error</Text>
        <Text className="text-red-400">{error || 'Could not load the required prop or show data.'}</Text>
      </View>
    );
  }

  // Main Render - Use structure from new.tsx
  return (
    <View className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
      <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', textAlign: 'center', padding: 10 }}>
        DEBUG: WEB EDIT SCREEN ACTIVE
      </Text>
      <Stack.Screen options={{ title: `Edit: ${propData.name}` }} />
      <View className="max-w-5xl mx-auto">
        <TouchableOpacity onPress={handleCancel} className="mb-4 text-blue-400 hover:text-blue-300">
            <Text>&larr; Cancel</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold mb-6">Edit Prop: {propData.name}</Text>
        <PropForm 
          initialData={propData} // Pass fetched prop data
          show={selectedShow}      // Pass fetched show data
          onSubmit={handleUpdateProp}
          mode="edit"
          disabled={isSubmitting}   // Use isSubmitting state
          onCancel={handleCancel}
        />
      </View>
    </View>
  );
} 