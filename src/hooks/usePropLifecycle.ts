import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, CollectionReference, Timestamp, addDoc } from 'firebase/firestore';
import { useFirebase } from '@/contexts/FirebaseContext';
import { User } from 'firebase/auth';
import type { PropStatusUpdate, MaintenanceRecord } from '@/types/lifecycle';

// Local interface matching Firestore data for status history
interface PropStatusFirestoreData {
  status: string;
  timestamp: Timestamp; // Expect Firestore Timestamp
  notes?: string;
  images?: string[];
  updatedBy: string;
}

// Local interface matching state for status history
interface PropStatusState {
  status: string;
  timestamp: Date; // State uses Date object
  notes?: string;
  images?: string[];
  updatedBy: string;
}

interface UsePropLifecycleProps {
  propId?: string;
  currentUser: User | null;
}

export function usePropLifecycle({ propId, currentUser }: UsePropLifecycleProps) {
  const { service } = useFirebase();
  const [statusHistory, setStatusHistory] = useState<PropStatusState[]>([]); // Use state type
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!propId || !service?.getFirestoreJsInstance) {
      setLoading(false);
      return;
    }
    const firestore = service.getFirestoreJsInstance();

    // Cast reference to expect Firestore data structure
    const statusRef = collection(firestore, 'props', propId, 'statusHistory') as CollectionReference<PropStatusFirestoreData>; 
    const maintenanceRef = collection(firestore, 'props', propId, 'maintenanceHistory'); // Assuming MaintenanceRecord matches Firestore structure for dates (Timestamps)

    const unsubStatus = onSnapshot(
      statusRef,
      (snapshot) => {
        const statuses = snapshot.docs.map(doc => {
          const data = doc.data();
          // Map Firestore data to State structure
          return {
            status: data.status,
            notes: data.notes,
            images: data.images,
            updatedBy: data.updatedBy,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(), // Convert Timestamp to Date
          };
        });
        setStatusHistory(statuses); // Set state with correct type
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
           // Map Firestore data (Timestamps) to MaintenanceRecord structure (strings)
          return {
            id: doc.id, // Add id from doc
            type: data.type,
            description: data.description,
            performedBy: data.performedBy,
            cost: data.cost,
            notes: data.notes,
            createdBy: data.createdBy,
            // Convert Timestamps to ISO strings
            date: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString(), 
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            estimatedReturnDate: data.estimatedReturnDate?.toDate ? data.estimatedReturnDate.toDate().toISOString() : undefined,
            repairDeadline: data.repairDeadline?.toDate ? data.repairDeadline.toDate().toISOString() : undefined,
          } as MaintenanceRecord; // Assert type
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
  }, [propId, service]);

  const updatePropStatus = async (
    status: string,
    notes?: string,
    images?: File[]
  ): Promise<void> => {
    if (!propId || !currentUser || !service?.getFirestoreJsInstance) {
      throw new Error('PropId, currentUser, and Firebase service are required to update status');
    }
    const firestore = service.getFirestoreJsInstance();

    try {
      const statusRef = collection(firestore, 'props', propId, 'statusHistory');
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
    record: Omit<MaintenanceRecord, 'id' | 'date' | 'createdAt' | 'performedBy' | 'createdBy'>, // Adjust Omit based on what's passed vs generated
    images?: File[]
  ): Promise<void> => {
    if (!propId || !currentUser || !service?.getFirestoreJsInstance || !service.addDocument) {
      throw new Error('PropId, currentUser, and Firebase service are required to add maintenance record');
    }

    try {
      // Assuming service.addDocument takes path and data
      await service.addDocument(`props/${propId}/maintenanceHistory`, { 
        ...record,
        // images: imageUrls, // Add if image upload implemented
        date: serverTimestamp(), 
        performedBy: currentUser.uid,
        // Assuming createdBy and createdAt are handled by service/Firestore or need serverTimestamp
        // createdBy: currentUser.uid, 
        // createdAt: serverTimestamp(),
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