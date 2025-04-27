import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, FirestoreError, Firestore, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { ShowsContext } from './ShowsContext';
import { useFirebase } from './FirebaseContext';
import type { Prop, PropFormData } from '@shared/types/props';

interface PropsContextType {
  props: Prop[];
  loading: boolean;
  error: FirestoreError | Error | null;
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
  const [error, setErrorState] = useState<FirestoreError | Error | null>(null);

  // Firestore instance memoization (ensure db is available)
  const db = React.useMemo(() => {
    if (firebaseInitialized && firebaseService) {
      return firebaseService.firestore() as Firestore;
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
      
      const propsQuery = query(
        collection(db!, 'props'),
        where('showId', '==', selectedShow.id)
      );

      unsubscribe = onSnapshot(propsQuery, (snapshot) => {
        const propsData: Prop[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prop));
        console.log(`PropsProvider: Fetched ${propsData.length} props.`);
        setProps(propsData);
        setErrorState(null);
        setLoading(false);
      }, (err) => {
        console.error("PropsProvider: Error fetching props:", err);
        const fetchError = err instanceof Error ? err : new Error(String(err));
        setErrorState(fetchError as FirestoreError | Error);
        setLoading(false);
        setProps([]);
      });

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
  }, [db, selectedShow, firebaseError]);

  // --- CRUD Operations --- 

  const addProp = useCallback(async (propData: PropFormData): Promise<string> => {
    if (!db || !selectedShow) throw new Error("Database service or selected show not available.");
    try {
      const dataToSave = { ...propData, showId: selectedShow.id };
      const docRef = await addDoc(collection(db!, 'props'), dataToSave);
      console.log("PropsProvider: Added prop with ID:", docRef.id);
      return docRef.id;
    } catch (err) {
      console.error("PropsProvider: Error adding prop:", err);
      throw err; // Re-throw error for handling in the component
    }
  }, [db, selectedShow]);

  const updateProp = useCallback(async (propId: string, propData: Partial<PropFormData>): Promise<void> => {
    if (!db) throw new Error("Database service not available.");
    try {
      const propRef = doc(db!, 'props', propId);
      await updateDoc(propRef, propData);
      console.log("PropsProvider: Updated prop with ID:", propId);
    } catch (err) {
      console.error("PropsProvider: Error updating prop:", err);
      throw err;
    }
  }, [db]);

  const deleteProp = useCallback(async (propId: string): Promise<void> => {
    if (!db) throw new Error("Database service not available.");
    try {
      const propRef = doc(db!, 'props', propId);
      await deleteDoc(propRef);
      console.log("PropsProvider: Deleted prop with ID:", propId);
      // Note: The onSnapshot listener should automatically update the local state
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