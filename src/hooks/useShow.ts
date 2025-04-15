import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Show } from '../types';

export function useShow(showId?: string) {
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!showId) {
      setLoading(false);
      return;
    }

    const fetchShow = async () => {
      try {
        const showDoc = await getDoc(doc(db, 'shows', showId));
        if (showDoc.exists()) {
          setShow(showDoc.data() as Show);
        } else {
          setShow(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchShow();
  }, [showId]);

  return { show, loading, error };
} 