import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// REMOVE direct imports from @react-native-firebase/firestore
// import firestore, { 
//   FirebaseFirestoreTypes, 
//   collection, 
//   query, 
//   where, 
//   onSnapshot, 
//   addDoc, 
//   doc, 
//   updateDoc, 
//   deleteDoc 
// } from '@react-native-firebase/firestore';
import { useAuth } from './AuthContext'; // Assuming AuthContext might be needed later
import { ShowsContext } from './ShowsContext';
import { useFirebase } from './FirebaseContext';
// Corrected and consolidated type imports
import type { Prop, PropFormData } from '@/shared/types/props';
import type { Show } from '@/types/index'; // Changed import path to match useShow hook
// Import FirebaseDocument type
import { FirebaseDocument } from '@/shared/services/firebase/types';
import { QueryOptions } from '../shared/services/firebase/types'; // Import QueryOptions
import { WhereFilterOp } from 'firebase/firestore'; // Import WhereFilterOp
// Removed unused import: import { useFirestoreCollectionData } from '../shared/services/firebase/useFirestoreCollectionData';

interface PropsContextType {
  props: Prop[];
  loading: boolean;
  error: Error | null;
  addProp: (propData: PropFormData) => Promise<string>;
  updateProp: (propId: string, propData: Partial<PropFormData>) => Promise<void>;
  deleteProp: (propId: string) => Promise<void>;
}

const PropsContext = createContext<PropsContextType | undefined>(undefined);

export function PropsProvider({ children }: { children: React.ReactNode }) {
  const showsContext = useContext(ShowsContext);
  const selectedShow = showsContext?.selectedShow;
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<Error | null>(null);

  // REMOVE Direct db instance memoization
  // const db = React.useMemo(() => { ... }, [firebaseInitialized, firebaseService]);

  useEffect(() => {
    let unsubscribe = () => {};

    // Check if service is ready and a show is selected
    if (firebaseInitialized && firebaseService && selectedShow) {
      setLoading(true);
      setProps([]);
      setErrorState(null);

      try {
        console.log(`PropsProvider: Setting up listener for props in showId: ${selectedShow.id}`);
        
        const queryOptions: QueryOptions = {
          where: [['showId', '==', selectedShow.id]],
        };
        // Removed unused call to useFirestoreCollectionData
        // const { data: propsData, loading: propsLoading } = useFirestoreCollectionData<Prop>(
        //   'props',
        //   queryOptions // Pass the typed options object here
        // );

        // Use the service's listenToCollection method
        unsubscribe = firebaseService.listenToCollection<Prop>(
          'props', // Collection path
          (docs: FirebaseDocument<Prop>[]) => {
            // Map FirebaseDocument array to Prop array
            const propsData: Prop[] = docs.map(docSnapshot => {
              const data = docSnapshot.data || ({} as Partial<Prop>);
              let determinedImageUrl = data.primaryImageUrl || data.imageUrl;

              // Attempt to derive from images array if no direct URL is found
              if (!determinedImageUrl && Array.isArray(data.images) && data.images.length > 0) {
                const mainImage = data.images.find(img => img.isMain === true && img.url);
                if (mainImage) {
                  determinedImageUrl = mainImage.url;
                } else if (data.images[0] && data.images[0].url) {
                  // Fallback to the first image if no main image is found
                  determinedImageUrl = data.images[0].url;
                }
              }

              return {
                id: docSnapshot.id,
                ...data, // Spread existing data
                primaryImageUrl: determinedImageUrl, // Explicitly set/override primaryImageUrl
              } as Prop;
            });
            
            console.log(`PropsProvider: Fetched ${propsData.length} props for show ${selectedShow.id}.`);
            setProps(propsData);
            setErrorState(null);
            setLoading(false);
          },
          (err: Error) => {
            console.error(`PropsProvider: Error listening to props for show ${selectedShow.id}:`, err);
            setErrorState(err);
            setLoading(false);
            setProps([]);
          },
          queryOptions // Pass the query options - Type Fixed by Edit
        );

      } catch (setupError) {
        console.error("PropsProvider: Error setting up props listener:", setupError);
        const err = setupError instanceof Error ? setupError : new Error(String(setupError));
        setErrorState(err);
        setLoading(false);
        setProps([]);
      }
    } else {
      // Handle cases where service isn't ready or no show is selected
      setProps([]); // Clear props
      setLoading(false);
      if (firebaseError) {
         console.error("PropsProvider: Error from FirebaseProvider:", firebaseError);
         setErrorState(firebaseError);
      } else if (!selectedShow && firebaseInitialized) {
         // If firebase is ready but no show is selected, it's not an error state, just empty
         setErrorState(null); 
      } else {
         // Still initializing or other state
         setErrorState(null); 
         if (!firebaseInitialized) setLoading(true); // Keep loading if firebase isn't ready
      }
    }

    return () => {
      console.log("PropsProvider: Unsubscribing props listener.");
      unsubscribe();
    };
  // Depend on service readiness and selected show ID
  }, [firebaseInitialized, firebaseService, selectedShow?.id, firebaseError]); 

  // --- CRUD Operations using FirebaseService --- 

  const addProp = useCallback(async (propData: PropFormData): Promise<string> => {
    if (!firebaseService || !selectedShow) throw new Error("Firebase service or selected show not available.");
    try {
      // Prepare data, ensuring showId is included
      const dataToSave = { 
          ...propData, 
          showId: selectedShow.id,
          // Ensure required fields for Prop type are present or defaulted if needed
          // Assuming service's addDocument handles createdAt/updatedAt
      };
      // Use service method - removing explicit generic <Prop>
      const newDoc = await firebaseService.addDocument('props', dataToSave as Omit<Prop, 'id'>); 
      console.log("PropsProvider: Added prop with ID:", newDoc.id);
      return newDoc.id; // Return the new document ID
    } catch (err) {
      console.error("PropsProvider: Error adding prop:", err);
      // Consider re-throwing a more specific error or handling it
      throw err;
    }
  }, [firebaseService, selectedShow]);

  const updateProp = useCallback(async (propId: string, propData: Partial<PropFormData>): Promise<void> => {
    if (!firebaseService) throw new Error("Firebase service not available.");
    try {
      // Use service method - assuming it handles updatedAt timestamp
      await firebaseService.updateDocument<Prop>('props', propId, propData as Partial<Prop>);
      console.log("PropsProvider: Updated prop with ID:", propId);
    } catch (err) {
      console.error("PropsProvider: Error updating prop:", err);
      throw err;
    }
  }, [firebaseService]);

  const deleteProp = useCallback(async (propId: string): Promise<void> => {
    if (!firebaseService) throw new Error("Firebase service not available.");
    try {
      // Use service method
      await firebaseService.deleteDocument('props', propId);
      console.log("PropsProvider: Deleted prop with ID:", propId);
    } catch (err) {
      console.error("PropsProvider: Error deleting prop:", err);
      throw err;
    }
  }, [firebaseService]);

  // --- Context Value --- 

  const value = {
    props,
    loading: loading || !firebaseInitialized,
    error: error, // Use the state variable directly
    addProp,
    updateProp,
    deleteProp,
  };

  return (
    <PropsContext.Provider value={value}>
      {children}
    </PropsContext.Provider>
  );
}

export function useProps() {
  const context = useContext(PropsContext);
  if (context === undefined) {
    throw new Error('useProps must be used within a PropsProvider');
  }
  return context;
} 