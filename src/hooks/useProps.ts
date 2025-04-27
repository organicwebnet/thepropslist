import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/contexts/FirebaseContext';
import type { Prop } from '@/shared/types/props';
import { useAuth } from '../contexts/AuthContext';

export function useProps(showId: string | undefined) {
  const { service } = useFirebase();
  const { user } = useAuth();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!showId || !service?.firestore) {
      setLoading(false);
      setProps([]);
      return;
    }
    const firestore = service.firestore();

    const propsRef = collection(firestore, 'props');
    const propsQuery = query(propsRef, where('showId', '==', showId));
    
    setLoading(true);
    const unsubscribe = onSnapshot(
      propsQuery,
      (snapshot) => {
        const propsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt?.toDate) ? doc.data().createdAt.toDate() : new Date(),
          updatedAt: (doc.data().updatedAt?.toDate) ? doc.data().updatedAt.toDate() : new Date(),
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
  }, [showId, service, user]);

  const addProp = useCallback(async (propData: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!service?.firestore || !service.addDocument || !user?.uid) throw new Error('Service or user not available');
    const firestore = service.firestore();
    const propsCollectionRef = collection(firestore, 'props');
    const dataToSave = { 
        ...propData, 
        userId: user.uid, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp() 
    };
    return await service.addDocument('props', dataToSave);
  }, [service, user]);

  const updateProp = useCallback(async (propId: string, updates: Partial<Prop>) => {
     if (!service?.firestore || !service.updateDocument) throw new Error('Service not available');
     const dataToUpdate = { ...updates, updatedAt: serverTimestamp() };
     await service.updateDocument('props', propId, dataToUpdate);
  }, [service]);

  const deleteProp = useCallback(async (propId: string) => {
     if (!service?.firestore || !service.deleteDocument) throw new Error('Service not available');
     await service.deleteDocument('props', propId);
  }, [service]);

  return { props, loading, error, addProp, updateProp, deleteProp };
} 