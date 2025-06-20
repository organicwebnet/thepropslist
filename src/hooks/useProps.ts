import { useState, useEffect, useCallback } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext.tsx';
import type { Prop } from '../shared/types/props.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { QueryOptions, FirebaseDocument } from '../shared/services/firebase/types.ts';
import { isWithinInterval, addDays, parseISO } from 'date-fns';
import { OfflineSyncManager } from '../platforms/mobile/features/offline/OfflineSyncManager';

export function useProps(showId: string | undefined) {
  const { service } = useFirebase();
  const { user } = useAuth();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize OfflineSyncManager (mobile only)
  const offlineSyncManager = service?.firestore ? OfflineSyncManager.getInstance(service.firestore) : null;
  useEffect(() => {
    if (offlineSyncManager) {
      offlineSyncManager.initialize().catch(console.error);
    }
  }, [offlineSyncManager]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (!showId || !service?.listenToCollection) {
      setLoading(false);
      setProps([]);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    const queryOptions: QueryOptions = {
      where: [['showId', '==', showId]],
    };

    unsubscribe = service.listenToCollection<Prop>(
      'props',
      (docs: FirebaseDocument<Prop>[]) => {
        const propsData = docs.map(docSnapshot => {
          const data = docSnapshot.data || ({} as Partial<Prop>);
          const createdAtTimestamp = data.createdAt;
          const updatedAtTimestamp = data.updatedAt;

          return {
            ...data,
            id: docSnapshot.id,
            createdAt: createdAtTimestamp && typeof (createdAtTimestamp as any).toDate === 'function' ? (createdAtTimestamp as any).toDate() : (createdAtTimestamp ? new Date(createdAtTimestamp as any) : new Date()),
            updatedAt: updatedAtTimestamp && typeof (updatedAtTimestamp as any).toDate === 'function' ? (updatedAtTimestamp as any).toDate() : (updatedAtTimestamp ? new Date(updatedAtTimestamp as any) : new Date()),
          } as Prop;
        });
        setProps(propsData);
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
      },
      queryOptions
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showId, service, user]);

  const addProp = useCallback(async (propData: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!service?.addDocument || !user?.uid) throw new Error('Service or user not available');
    const dataToSave = { 
        ...propData, 
        userId: user.uid, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    if (offlineSyncManager) {
      await offlineSyncManager.queueOperation('create', 'props', dataToSave);
      return { id: 'offline', data: dataToSave };
    } else {
      const newDocRef = await service.addDocument('props', dataToSave as any as Omit<Prop, 'id'>);
      return newDocRef;
    }
  }, [service, user, offlineSyncManager]);

  const updateProp = useCallback(async (propId: string, updates: Partial<Prop>) => {
     if (!service?.updateDocument) throw new Error('Service not available');
     const dataToUpdate = { 
       ...updates, 
       updatedAt: serverTimestamp()
      };
     if (offlineSyncManager) {
       await offlineSyncManager.queueOperation('update', 'props', { ...dataToUpdate, id: propId });
     } else {
       await service.updateDocument('props', propId, dataToUpdate as any as Partial<Omit<Prop, 'id'>>);
     }
  }, [service, offlineSyncManager]);

  const deleteProp = useCallback(async (propId: string) => {
     if (!service?.deleteDocument) throw new Error('Service not available');
     if (offlineSyncManager) {
       await offlineSyncManager.queueOperation('delete', 'props', { id: propId });
     } else {
       await service.deleteDocument('props', propId);
     }
  }, [service, offlineSyncManager]);

  // Helper: Get deliveries due within the next week (status 'on_order' and estimatedDeliveryDate within 7 days)
  const getUpcomingDeliveries = () => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    return props.filter(
      (prop) =>
        prop.status === 'on_order' &&
        prop.estimatedDeliveryDate &&
        isWithinInterval(parseISO(prop.estimatedDeliveryDate), { start: now, end: weekFromNow })
    );
  };

  // Helper: Get props/materials that need to be bought (status 'to_buy')
  const getShoppingListProps = () => {
    return props.filter((prop) => prop.status === 'to_buy');
  };

  return { props, loading, error, addProp, updateProp, deleteProp, getUpcomingDeliveries, getShoppingListProps };
} 