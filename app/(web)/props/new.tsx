import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useShows } from '@/contexts/ShowsContext.tsx';
import type { PropFormData, Prop, Show as SharedShow } from '@/shared/types/props.ts';
import { PropForm } from '@/components/PropForm.tsx';

export default function WebNewPropPage() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();
  const { getShowById } = useShows();

  const [selectedShow, setSelectedShow] = useState<SharedShow | null>(null);
  const [isLoadingShow, setIsLoadingShow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showIdParam = searchParams.showId;
  const showId = typeof showIdParam === 'string' ? showIdParam : undefined;

  useEffect(() => {
    if (showId && firebaseInitialized) {
      const fetchShow = async () => {
        setIsLoadingShow(true);
        setError(null);
        try {
          const showData = await getShowById(showId);
          console.log(`[WebNewPropPage] Show data received from getShowById for ${showId}:`, showData);
          if (showData) {
            setSelectedShow(showData);
          } else {
            console.error(`Web Add Prop Error: Show with ID ${showId} not found.`);
            setError('Could not find the specified show.');
          }
        } catch (fetchError: any) {
          console.error(`Error fetching show ${showId}:`, fetchError);
          setError(fetchError.message || 'Error loading show data.');
        }
        setIsLoadingShow(false);
      };
      fetchShow();
    } else if (firebaseInitialized) {
      setError('Show ID is missing in URL query parameters. Cannot add prop without a show context.');
      setIsLoadingShow(false);
    }
  }, [showId, firebaseInitialized, getShowById]);

  const handleCreateSubmit = async (formData: PropFormData) => {
    if (!user || !firebaseService?.addDocument || !showId || !selectedShow) {
      setError('Cannot create prop. Missing User, Service, Show ID, or Show Data.');
      console.error("Web Add Prop Error:", { userId: user?.uid, firebaseInitialized, showId, selectedShowExists: !!selectedShow });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const finalData: Omit<Prop, 'id'> = {
         ...formData, 
         act: formData.act ? Number(formData.act) : undefined,
         scene: formData.scene ? Number(formData.scene) : undefined,
         quantity: Number(formData.quantity) || 1,
         price: Number(formData.price) || 0,
         length: formData.length ? Number(formData.length) : undefined,
         width: formData.width ? Number(formData.width) : undefined,
         height: formData.height ? Number(formData.height) : undefined,
         depth: formData.depth ? Number(formData.depth) : undefined,
         weight: formData.weight ? Number(formData.weight) : undefined,
         travelWeight: formData.travelWeight ? Number(formData.travelWeight) : undefined,
         preShowSetupDuration: formData.preShowSetupDuration ? Number(formData.preShowSetupDuration) : undefined,
         userId: user.uid,
         showId: showId,
         createdAt: now, 
         updatedAt: now,
      };

      const newDoc = await firebaseService.addDocument('props', finalData);
      console.log('Prop created successfully with ID:', newDoc.id);
      
      router.push(`/(web)/props?showId=${showId}`); 

    } catch (err: any) {
      console.error('Failed to create prop:', err);
      setError(err.message || 'Failed to create prop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!firebaseInitialized || isLoadingShow) {
     return (
      <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100 flex justify-center items-center">
         <p>Loading Show Info...</p>
      </div>
     );
  }

  if (error || !selectedShow) {
     return (
       <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
          <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
              &larr; Back
          </button>
          <h1 className="text-2xl font-bold mb-6 text-red-500">Error</h1>
          <p className="text-red-400">{error || 'Could not load the selected show.'}</p>
       </div>
     );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
            &larr; Cancel
        </button>
        <h1 className="text-2xl font-bold mb-6">Add Prop to {selectedShow.name}</h1>

        <PropForm 
          onSubmit={handleCreateSubmit} 
          show={selectedShow}
          mode="create"
          disabled={isSubmitting}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
} 