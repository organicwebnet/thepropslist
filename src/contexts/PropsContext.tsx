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
// import { useAuth } from './AuthContext.tsx'; // Removed unused import
import { ShowsContext } from './ShowsContext.tsx';
import { useFirebase } from './FirebaseContext.tsx';
// import { Platform } from 'react-native'; // Removed unused import
// Corrected and consolidated type imports
import type { Prop, PropFormData } from '../shared/types/props.ts';
// import type { Show } from '../types/index.ts'; // Removed unused import
// import type { StorageReference } from 'firebase/storage'; // Removed unused import
// Import FirebaseDocument type
import { FirebaseDocument } from '../shared/services/firebase/types.ts';
import { QueryOptions } from '../shared/services/firebase/types.ts'; // Import QueryOptions
// import { WhereFilterOp } from 'firebase/firestore'; // Removed unused import
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
    let unsubscribe = () => {
      // This is a no-op function, it will be replaced by the actual unsubscribe later
    };

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
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [firebaseInitialized, firebaseService, selectedShow, firebaseError]);

  // --- CRUD Operations using FirebaseService --- 

  const addProp = useCallback(async (propData: PropFormData): Promise<string> => {
    if (!firebaseService || !selectedShow) throw new Error("Firebase service or selected show not available.");
    try {
      // Prepare data, ensuring showId is included
      const dataToSave: Partial<Prop> = { // Use Partial<Prop> for more flexibility before final type assertion
          ...propData, 
          showId: selectedShow.id,
          // createdAt and updatedAt are typically handled by Firestore or backend triggers
      };

      // Remove undefined fields to prevent Firestore errors
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key as keyof Partial<Prop>] === undefined) {
          delete dataToSave[key as keyof Partial<Prop>];
        }
      });

      // Use service method
      const newDoc = await firebaseService.addDocument('props', dataToSave as Omit<Prop, 'id'>); 
      console.log("PropsProvider: Added prop with ID:", newDoc.id);
      return newDoc.id; // Return the new document ID
    } catch (err) {
      console.error("PropsProvider: Error adding prop:", err);
      throw err;
    }
  }, [firebaseService, selectedShow]);

  const updateProp = useCallback(async (propId: string, propData: Partial<PropFormData>): Promise<void> => {
    if (!firebaseService) throw new Error("Firebase service not available.");
    try {
      // Prepare data for update
      const dataToUpdate: Partial<Prop> = { ...propData }; // Use Partial<Prop>

      // Remove undefined fields to prevent Firestore errors
      Object.keys(dataToUpdate).forEach(key => {
        if (dataToUpdate[key as keyof Partial<Prop>] === undefined) {
          delete dataToUpdate[key as keyof Partial<Prop>];
        }
      });

      // Use service method - assuming it handles updatedAt timestamp
      await firebaseService.updateDocument<Prop>('props', propId, dataToUpdate as Partial<Prop>);
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