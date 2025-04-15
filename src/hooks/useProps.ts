import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Prop } from '../types';

export function useProps(showId?: string) {
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!showId) {
      console.log('No showId provided to useProps');
      setLoading(false);
      return;
    }

    console.log('Fetching props for showId:', showId);

    // Use onSnapshot for real-time updates
    const propsQuery = query(
      collection(db, 'props'),
      where('showId', '==', showId)
    );

    const unsubscribe = onSnapshot(propsQuery, 
      (snapshot) => {
        console.log('Props snapshot received:', snapshot.size, 'documents');
        const propsData = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() } as Prop;
          console.log('Prop data:', data);
          return data;
        });
        console.log('Final props data:', propsData);
        setProps(propsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching props:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showId]);

  return { props, loading, error };
} 