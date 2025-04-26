import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Prop } from '@shared/types';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function useProps(showId: string | undefined) {
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!showId) {
      setLoading(false);
      return;
    }

    const propsRef = collection(db, 'props');
    const propsQuery = query(propsRef, where('showId', '==', showId));
    
    const unsubscribe = onSnapshot(
      propsQuery,
      (snapshot) => {
        const propsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Prop[];
        setProps(propsData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showId]);

  return { props, loading, error };
} 