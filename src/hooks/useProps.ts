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

    console.log('=== PROPS LOADING DEBUG ===');
    console.log('1. Fetching props for showId:', showId);

    // Use onSnapshot for real-time updates
    const propsQuery = query(
      collection(db, 'props'),
      where('showId', '==', showId)
    );

    console.log('2. Created query:', propsQuery);

    const unsubscribe = onSnapshot(propsQuery, 
      (snapshot) => {
        console.log('3. Props snapshot received. Size:', snapshot.size);
        console.log('4. Empty snapshot?', snapshot.empty);
        
        if (snapshot.empty) {
          console.log('5. No props found for this show');
          setProps([]);
          setLoading(false);
          return;
        }

        const propsData = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() } as Prop;
          console.log('6. Prop data:', {
            id: data.id,
            name: data.name,
            showId: data.showId,
            userId: data.userId
          });
          return data;
        });
        
        console.log('7. Final props data count:', propsData.length);
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