import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { ShowsContext } from './ShowsContext';
import type { Prop } from '@shared/types/props';

interface PropsContextType {
  props: Prop[];
  loading: boolean;
  error: FirestoreError | Error | null;
}

const PropsContext = createContext<PropsContextType | undefined>(undefined);

export function PropsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const showsContext = useContext(ShowsContext);
  const selectedShow = showsContext ? showsContext.selectedShow : null;
  
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(!!user && !!selectedShow);
  const [error, setErrorState] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!user || !selectedShow) {
      setProps([]);
      setLoading(false);
      setErrorState(null);
      return;
    }

    setLoading(true);
    setProps([]);
    setErrorState(null);

    let unsubscribe = () => {};
    try {
      console.log(`PropsProvider: Fetching props for showId: ${selectedShow.id}`);
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
  }, [user, selectedShow]);

  const value = {
    props,
    loading,
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