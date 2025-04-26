import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Show } from '../types';

export function useShow(showId: string | undefined) {
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!showId) {
      setLoading(false);
      return;
    }

    const showRef = doc(db, 'shows', showId);
    
    const unsubscribe = onSnapshot(
      showRef,
      (doc) => {
        if (doc.exists()) {
          setShow({ id: doc.id, ...doc.data() } as Show);
        } else {
          setShow(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showId]);

  return { show, loading, error };
} 