import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, serverTimestamp, DocumentReference, CollectionReference, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

interface PropStatus {
  status: string;
  timestamp: Date;
  notes?: string;
  images?: string[];
  updatedBy: string;
}

interface MaintenanceRecord {
  type: string;
  description: string;
  date: Date;
  performedBy: string;
  cost?: number;
  images?: string[];
}

interface UsePropLifecycleProps {
  propId?: string;
  currentUser: User | null;
}

export function usePropLifecycle({ propId, currentUser }: UsePropLifecycleProps) {
  const [statusHistory, setStatusHistory] = useState<PropStatus[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!propId) {
      setLoading(false);
      return;
    }

    const statusRef = collection(db, 'props', propId, 'statusHistory') as CollectionReference<PropStatus>;
    const maintenanceRef = collection(db, 'props', propId, 'maintenanceHistory') as CollectionReference<MaintenanceRecord>;

    const unsubStatus = onSnapshot(
      statusRef,
      (snapshot) => {
        const statuses = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            timestamp: (data.timestamp as unknown as Timestamp).toDate(),
          };
        });
        setStatusHistory(statuses);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubMaintenance = onSnapshot(
      maintenanceRef,
      (snapshot) => {
        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            date: (data.date as unknown as Timestamp).toDate(),
          };
        });
        setMaintenanceHistory(records);
      },
      (err) => {
        setError(err);
      }
    );

    return () => {
      unsubStatus();
      unsubMaintenance();
    };
  }, [propId]);

  const updatePropStatus = async (
    status: string,
    notes?: string,
    images?: File[]
  ): Promise<void> => {
    if (!propId || !currentUser) {
      throw new Error('PropId and currentUser are required to update status');
    }

    try {
      const statusRef = collection(db, 'props', propId, 'statusHistory');
      const imageUrls = images?.length 
        ? await Promise.all(images.map(async (image) => {
            const formData = new FormData();
            formData.append('file', image);
            const response = await fetch(`/api/upload?path=props/${propId}/status`, {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) throw new Error('Failed to upload image');
            const { url } = await response.json();
            return url;
          }))
        : undefined;

      await addDoc(statusRef, {
        status,
        notes,
        images: imageUrls,
        timestamp: serverTimestamp(),
        updatedBy: currentUser.uid,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update status'));
      throw err;
    }
  };

  const addMaintenanceRecord = async (
    record: Omit<MaintenanceRecord, 'date' | 'performedBy'>,
    images?: File[]
  ): Promise<void> => {
    if (!propId || !currentUser) {
      throw new Error('PropId and currentUser are required to add maintenance record');
    }

    try {
      const maintenanceRef = collection(db, 'props', propId, 'maintenanceHistory');
      const imageUrls = images?.length 
        ? await Promise.all(images.map(async (image) => {
            const formData = new FormData();
            formData.append('file', image);
            const response = await fetch(`/api/upload?path=props/${propId}/maintenance`, {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) throw new Error('Failed to upload image');
            const { url } = await response.json();
            return url;
          }))
        : undefined;

      await addDoc(maintenanceRef, {
        ...record,
        images: imageUrls,
        date: serverTimestamp(),
        performedBy: currentUser.uid,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add maintenance record'));
      throw err;
    }
  };

  return {
    statusHistory,
    maintenanceHistory,
    loading,
    error,
    updatePropStatus,
    addMaintenanceRecord,
  };
} 