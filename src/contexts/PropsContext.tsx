import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useAuth } from './AuthContext';
import { ShowsContext } from './ShowsContext';
import { useFirebase } from './FirebaseContext';
import type { Prop, PropFormData } from '@shared/types/props';
import type { CustomFirestore } from '../shared/services/firebase/types';

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
  // const { user } = useAuth(); // Keep user check commented out for now
  const showsContext = useContext(ShowsContext);
  const selectedShow = showsContext ? showsContext.selectedShow : null;
  // Get Firebase service and init status
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(/*!!user &&*/ !!selectedShow && firebaseInitialized); // Adjust loading state
  const [error, setErrorState] = useState<Error | null>(null);

  // Firestore instance memoization
  const db = React.useMemo(() => {
    if (firebaseInitialized && firebaseService) {
      // Use the specific RNFirebase type or keep CustomFirestore if it matches
      return firebaseService.firestore() as FirebaseFirestoreTypes.Module;
    }
    return null;
  }, [firebaseInitialized, firebaseService]);

  useEffect(() => {
    // Wait for Firebase to be initialized AND a show to be selected
    if (!firebaseInitialized || !firebaseService || !selectedShow) {
      if (firebaseError) {
        console.error("Error from FirebaseProvider:", firebaseError);
        setErrorState(firebaseError);
      }
      // Clear props if deps aren't ready
      setProps([]);
      setLoading(false); 
      setErrorState(firebaseError); // Reflect potential firebase init error
      return;
    }

    setLoading(true);
    setProps([]);
    setErrorState(null);

    let unsubscribe = () => {};
    try {
      console.log(`PropsProvider: Fetching props for showId: ${selectedShow.id}`);
      
      // Use RNFirebase query methods
      const propsQuery = db!
        .collection('props')
        .where('showId', '==', selectedShow.id);

      // Use onSnapshot method from the query object
      unsubscribe = propsQuery.onSnapshot(
        (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          const propsData: Prop[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prop));
          console.log(`PropsProvider: Fetched ${propsData.length} props.`);
          setProps(propsData);
          setErrorState(null);
          setLoading(false);
        },
        (err: Error) => { // Use generic Error or RNFirebase specific error type
          console.error("PropsProvider: Error fetching props:", err);
          setErrorState(err);
          setLoading(false);
          setProps([]);
        }
      );

    } catch (queryError) {
      console.error("PropsProvider: Error setting up props query:", queryError);
      const setupError = queryError instanceof Error ? queryError : new Error(String(queryError));
      setErrorState(setupError);
      setLoading(false);
      setProps([]);
    }

    return () => {
      console.log("PropsProvider: Unsubscribing props listener.");
      unsubscribe();
    };
  // Depend on firebase init, service, and selected show
  }, [db, selectedShow]);

  // --- CRUD Operations --- 

  const addProp = useCallback(async (propData: PropFormData): Promise<string> => {
    if (!db || !selectedShow) throw new Error("Database service or selected show not available.");
    try {
      const dataToSave = { ...propData, showId: selectedShow.id };
      // Use RNFirebase add method
      const docRef = await db.collection('props').add(dataToSave);
      console.log("PropsProvider: Added prop with ID:", docRef.id);
      return docRef.id;
    } catch (err) {
      console.error("PropsProvider: Error adding prop:", err);
      throw err;
    }
  }, [db, selectedShow]);

  const updateProp = useCallback(async (propId: string, propData: Partial<PropFormData>): Promise<void> => {
    if (!db) throw new Error("Database service not available.");
    try {
      // Get doc ref and use RNFirebase update method
      const propRef = db.collection('props').doc(propId);
      await propRef.update(propData);
      console.log("PropsProvider: Updated prop with ID:", propId);
    } catch (err) {
      console.error("PropsProvider: Error updating prop:", err);
      throw err;
    }
  }, [db]);

  const deleteProp = useCallback(async (propId: string): Promise<void> => {
    if (!db) throw new Error("Database service not available.");
    try {
      // Get doc ref and use RNFirebase delete method
      const propRef = db.collection('props').doc(propId);
      await propRef.delete();
      console.log("PropsProvider: Deleted prop with ID:", propId);
    } catch (err) {
      console.error("PropsProvider: Error deleting prop:", err);
      throw err;
    }
  }, [db]);

  // --- Context Value --- 

  const value = {
    props,
    // Adjust loading based on firebase init and local loading
    loading: loading || !firebaseInitialized,
    error,
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