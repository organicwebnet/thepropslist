import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useShows } from './ShowsContext';
import type { Prop } from '../types';

interface PropsContextType {
  props: Prop[];
  loading: boolean;
}

const PropsContext = createContext<PropsContextType | undefined>(undefined);

export function PropsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedShow } = useShows();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !selectedShow) {
      setProps([]);
      setLoading(false);
      return;
    }

    const propsQuery = query(
      collection(db, 'props'),
      where('showId', '==', selectedShow.id)
    );

    const unsubscribe = onSnapshot(propsQuery, (snapshot) => {
      const propsData: Prop[] = [];
      snapshot.forEach((doc) => {
        propsData.push({
          id: doc.id,
          ...doc.data()
        } as Prop);
      });
      setProps(propsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedShow]);

  const value = {
    props,
    loading,
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