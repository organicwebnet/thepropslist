import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, FirestoreError, Firestore } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { ShowsContext } from './ShowsContext';
import { useFirebase } from './FirebaseContext';
import type { Prop } from '@shared/types/props';

interface PropsContextType {
  props: Prop[];
  loading: boolean;
  error: FirestoreError | Error | null;
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
      
      // Get Firestore instance from service
      const db = firebaseService.firestore() as Firestore; 
      
      const propsQuery = query(
        collection(db, 'props'),
        where('showId', '==', selectedShow.id)
      );

      unsubscribe = onSnapshot(propsQuery, (snapshot) => {
        const propsData: Prop[] = [];
        snapshot.forEach((doc) => {
          propsData.push({
            id: doc.id,
            ...doc.data()
          } as Prop);
        });
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
  }, [firebaseInitialized, firebaseService, selectedShow, firebaseError]);

  const value = {
    props,
    // Adjust loading based on firebase init and local loading
    loading: loading || !firebaseInitialized,
    error,
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