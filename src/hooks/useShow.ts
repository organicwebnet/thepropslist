import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, DocumentData, Unsubscribe } from 'firebase/firestore';
// import { db } from '../lib/firebase';
import { useFirebase } from '../contexts/FirebaseContext.tsx';
import type { Show } from '../types/index.ts'; // Corrected import path
import { useAuth } from '../contexts/AuthContext.tsx'; // Keep if user context is needed

export function useShow(showId: string | undefined) {
  const { service } = useFirebase();
  const { user } = useAuth(); // Keep if user context is needed
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const fetchShow = async () => {
      if (!showId || !service?.firestore || !service.listenToDocument) {
        setShow(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Option 1: Fetch once using service.getDocument
        // const showData = await service.getDocument<Show>('shows', showId);
        // Need to handle the returned FirebaseDocument<T> type
        // setShow(showData?.data ?? null);
        // setLoading(false);

        // Option 2: Listen for real-time updates using service.listenToDocument
        unsubscribe = service.listenToDocument<Show>(
          `shows/${showId}`, // Combined path
          (docWrapper) => {
            // Assuming onNext provides FirebaseDocument<T>
            console.log(`[useShow Listener] Received data for ${showId}:`, docWrapper?.data);
            setShow(docWrapper?.data ?? null);
            setLoading(false);
          },
          (err) => {
            console.error(`[useShow Listener] Error listening to show ${showId}:`, err);
            setError(err);
            setLoading(false);
            // console.error(`Error listening to show ${showId}:`, err);
          }
        );

      } catch (err) {
        setError(err as Error);
        setLoading(false);
        console.error(`Error fetching show ${showId}:`, err);
      }
    };

    fetchShow();

    // Cleanup listener on unmount or when showId/service changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showId, service]); // Add service to dependency array

  // Add functions for CRUD operations if needed, using service
  const updateShow = useCallback(async (updates: Partial<Show>) => {
    if (!showId || !service?.firestore || !service.updateDocument) throw new Error('Service or showId not available');
    await service.updateDocument('shows', showId, updates);
  }, [showId, service]);

  const deleteShow = useCallback(async () => {
    if (!showId || !service?.firestore || !service.deleteDocument) throw new Error('Service or showId not available');
    await service.deleteDocument('shows', showId);
    setShow(null); // Clear local state after deletion
  }, [showId, service]);

  return { show, loading, error, updateShow, deleteShow };
} 