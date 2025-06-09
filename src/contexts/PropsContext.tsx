import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ShowsContext } from './ShowsContext.tsx';
import { useFirebase } from './FirebaseContext.tsx';
import type { Prop, PropFormData } from '../shared/types/props.ts';
import { FirebaseDocument } from '../shared/services/firebase/types.ts';
import { QueryOptions } from '../shared/services/firebase/types.ts'; // Import QueryOptions
import { useAuth } from './AuthContext.tsx';

interface PropsContextType {
  props: Prop[];
  loading: boolean;
  error: Error | null;
  addProp: (propData: PropFormData) => Promise<string>;
  updateProp: (propId: string, propData: Partial<PropFormData>) => Promise<void>;
  deleteProp: (propId: string) => Promise<void>;
  getPropById: (propId: string) => Prop | undefined;
  updatePropLocally: (propId: string, updates: Partial<Prop>) => void;
}

const PropsContext = createContext<PropsContextType | undefined>(undefined);

export function PropsProvider({ children }: { children: React.ReactNode }) {
  const showsContext = useContext(ShowsContext);
  const selectedShow = showsContext?.selectedShow;
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const { user } = useAuth();
  
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<Error | null>(null);

  
  useEffect(() => {
    let unsubscribe = () => {
      /* no-op */
    };

    if (firebaseInitialized && firebaseService && selectedShow && user) {
      setLoading(true);
      setProps([]);
      setErrorState(null);

      try {
        const queryOptions: QueryOptions = {
          where: [
            ['showId', '==', selectedShow.id],
            ['userId', '==', user.uid],
          ],
        };
        unsubscribe = firebaseService.listenToCollection<Prop>(
          'props',
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
                  determinedImageUrl = data.images[0].url;
                }
              }

              return {
                id: docSnapshot.id,
                ...data, // Spread existing data
                primaryImageUrl: determinedImageUrl, // Explicitly set/override primaryImageUrl
              } as Prop;
            });
            setProps(propsData);
            setErrorState(null);
            setLoading(false);
          },
          (err: Error) => {
            setErrorState(err);
            setLoading(false);
          },
          queryOptions
        );

      } catch (setupError) {
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
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [firebaseInitialized, firebaseService, selectedShow, user, firebaseError]);

  // --- CRUD Operations using FirebaseService --- 

  const addProp = useCallback(async (propData: PropFormData): Promise<string> => {
    if (!firebaseService || !selectedShow) throw new Error("Firebase service or selected show not available.");
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
    return newDoc.id; // Return the new document ID
  }, [firebaseService, selectedShow]);

  const updateProp = useCallback(async (propId: string, propData: Partial<PropFormData>): Promise<void> => {
    if (!firebaseService) throw new Error("Firebase service not available.");
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
  }, [firebaseService]);

  const deleteProp = useCallback(async (propId: string): Promise<void> => {
    if (!firebaseService) throw new Error("Firebase service not available.");
    // Use service method
    await firebaseService.deleteDocument('props', propId);
  }, [firebaseService]);

  // New function to get a prop by ID from local state
  const getPropById = useCallback((propId: string): Prop | undefined => {
    return props.find(p => p.id === propId);
  }, [props]);

  // New function to update a prop in local state
  const updatePropLocally = useCallback((propId: string, updates: Partial<Prop>): void => {
    setProps(currentProps =>
      currentProps.map(p =>
        p.id === propId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
  }, []); // No direct dependency on props here, setProps handles it correctly

  const value = {
    props,
    loading: loading || !firebaseInitialized,
    error: error, // Use the state variable directly
    addProp,
    updateProp,
    deleteProp,
    getPropById,
    updatePropLocally,
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