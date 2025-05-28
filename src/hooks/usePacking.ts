import { useState, useEffect, useCallback, useMemo } from 'react';
// Web SDK imports - aliased to avoid conflicts and clarify usage
import {
  collection as webCollection,
  query as webQuery,
  where as webWhere,
  onSnapshot as webOnSnapshot,
  doc as webDoc, // Keep if other parts of the file might use it, though operations use service methods
  serverTimestamp as webServerTimestamp, // serverTimestamp is often SDK-agnostic or re-exported by the service
  writeBatch as webWriteBatch,
  Firestore as WebFirestore // Import Web Firestore type
} from 'firebase/firestore';
import { Platform } from 'react-native'; // Import Platform
import { useFirebase } from '../contexts/FirebaseContext.tsx';
import { PackingBox, PackedProp } from '../types/packing.ts';
import { FirebaseDocument, CustomFirestore } from '../shared/services/firebase/types.ts'; // Import CustomFirestore
// Import RN Firebase types if needed for explicit casting, though CustomFirestore should suffice
import {
  FirebaseFirestoreTypes,
  collection as rnCollection,
  query as rnQuery,
  where as rnWhere,
  onSnapshot as rnOnSnapshot
} from '@react-native-firebase/firestore';
import { FirebaseError, FirebaseService, QueryOptions } from '../shared/services/firebase/types.ts';
import type { Prop, WeightUnit } from '../shared/types/props.ts'; // Added WeightUnit

interface PackingOperations {
  createBox: (props: PackedProp[], boxName: string, description?: string, actNumber?: number, sceneNumber?: number) => Promise<string | undefined>;
  updateBox: (boxId: string, updates: Partial<PackingBox>) => Promise<void>;
  deleteBox: (boxId: string) => Promise<void>;
  updateBoxLabelSettings: (boxId: string, settings: Pick<PackingBox, 'labelHandlingNote' | 'labelIncludeFragile' | 'labelIncludeThisWayUp' | 'labelIncludeKeepDry'>) => Promise<void>;
}

export function usePacking(showId?: string): {
  boxes: PackingBox[];
  loading: boolean;
  error: Error | null;
  operations: PackingOperations;
  updateBoxLabelSettings: (boxId: string, settings: Pick<PackingBox, 'labelHandlingNote' | 'labelIncludeFragile' | 'labelIncludeThisWayUp' | 'labelIncludeKeepDry'>) => Promise<void>;
  getDocument: (docId: string) => Promise<FirebaseDocument<PackingBox> | null>;
} {
  const { service } = useFirebase();
  const [boxes, setBoxes] = useState<PackingBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!showId || !service?.firestore) {
      setLoading(false);
      setBoxes([]);
      return;
    }
    const firestoreInstance = service.firestore() as CustomFirestore;

    setLoading(true);
    setError(null);

    let unsubscribe = () => {
      // No-op function
    };

    if (Platform.OS === 'web') {
      // Use Web SDK
      const boxesCollectionRef = webCollection(firestoreInstance as WebFirestore, 'packingBoxes');
      const boxesQuery = webQuery(boxesCollectionRef, webWhere("showId", "==", showId));

      unsubscribe = webOnSnapshot(
        boxesQuery,
        (snapshot) => {
          const receivedBoxIds = snapshot.docs.map(d => d.id);
          console.log(`[usePacking Snapshot Web] Received ${snapshot.size} docs. IDs: [${receivedBoxIds.join(', ')}]`);
          
          const boxesData = snapshot.docs
            .map(doc => {
              const data = doc.data();
              if ('id' in data) {
                delete data.id;
              }
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
              }
            })
            .filter(box => box !== null) as PackingBox[];
            
          setBoxes(boxesData);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching packing boxes (web):", err);
          setError(err as Error);
          setLoading(false);
        }
      );
    } else {
      // Use React Native Firebase SDK
      const rnFirestore = firestoreInstance as FirebaseFirestoreTypes.Module;
      // const boxesQuery = rnFirestore.collection('packingBoxes').where("showId", "==", showId);

      // Updated to use modular RN Firebase functions
      const boxesCollectionRef = rnCollection(rnFirestore, 'packingBoxes');
      const boxesQuery = rnQuery(boxesCollectionRef, rnWhere("showId", "==", showId));

      unsubscribe = rnOnSnapshot(
        boxesQuery,
        (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          const receivedBoxIds = snapshot.docs.map(d => d.id);
          console.log(`[usePacking Snapshot Native] Received ${snapshot.size} docs. IDs: [${receivedBoxIds.join(', ')}]`);

          const boxesData = snapshot.docs
            .map(doc => {
              const data = doc.data();
              if ('id' in data) {
                delete data.id;
              }
              return {
                id: doc.id,
                ...data,
                // RN Firebase Timestamps are objects with toDate() method
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
              }
            })
            .filter(box => box !== null) as PackingBox[];
            
          setBoxes(boxesData);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching packing boxes (native):", err);
          setError(err as Error);
          setLoading(false);
        }
      );
    }

    return () => unsubscribe();
  }, [showId, service]);

  const operations: PackingOperations = useMemo(() => ({
    createBox: async (props: PackedProp[], boxName: string, description = '', actNumber = 0, sceneNumber = 0) => {
      if (!service?.addDocument || !showId) {
          console.error('Firebase service (addDocument) not available or showId missing');
          setError(new Error('Failed to create box: Service not ready.'));
          return undefined;
      }
      
      // Data for Firestore, allowing server timestamps
      const newBoxDataForFirestore = {
         name: boxName,
         showId: showId,
         description: description,
         actNumber: actNumber,
         sceneNumber: sceneNumber,
         props: props,
         totalWeight: props.reduce((sum, p) => sum + (p.weight || 0), 0),
         weightUnit: 'kg', // Reverted: Removed 'as WeightUnit'
         isHeavy: props.reduce((sum, p) => sum + (p.weight || 0), 0) > 20, 
         notes: '',
         createdAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp(),
         updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp(),
         labels: [], 
         status: 'draft' as const, // Reverted: Added 'as const' back
       };

      try {
        // Call addDocument with collection path and data
        const docRef = await service.addDocument('packingBoxes', newBoxDataForFirestore as any); // Cast to any to satisfy service.addDocument which might expect generic T
        return docRef?.id; // Return the ID from the result
      } catch (err) {
        console.error("Error creating box:", err);
        setError(err instanceof Error ? err : new Error('Unknown error creating box'));
        return undefined;
      }
    },
    updateBox: async (boxId, updates) => {
      if (!service?.setDocument) {
          console.error('Firebase service (setDocument) not available');
          setError(new Error('Failed to update box: Service not ready.'));
          return;
      }
       const dataToUpdateForFirestore = { 
         ...updates, 
         updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp()
        };
       try {
           // Add logging before the update call
           console.log(`[usePacking] Attempting to update document (using setDoc merge) at path: packingBoxes, ID: ${boxId}`);
           await service.setDocument('packingBoxes', boxId, dataToUpdateForFirestore as any, { merge: true }); // Cast to any
           console.log(`[usePacking] Successfully updated document (using setDoc merge): ${boxId}`);
       } catch (err) {
           console.error(`Error updating box ${boxId} (using setDoc merge):`, err);
           // Re-throw the error so the calling function (handleSettingChange) can catch it
           throw err; 
       }
    },
    deleteBox: async (boxId) => {
      if (!service?.deleteDocument) {
          console.error('Firebase service (deleteDocument) not available');
          setError(new Error('Failed to delete box: Service not ready.'));
          return;
      }
      try {
          // Call deleteDocument with path and id
          await service.deleteDocument('packingBoxes', boxId);
      } catch (err) {           
          console.error(`Error deleting box ${boxId}:`, err);
          setError(err instanceof Error ? err : new Error('Unknown error deleting box'));
      }
    },
    updateBoxLabelSettings: async (boxId: string, settings: Pick<PackingBox, 'labelHandlingNote' | 'labelIncludeFragile' | 'labelIncludeThisWayUp' | 'labelIncludeKeepDry'>) => {
      console.log('[usePacking] Updating label settings for box:', boxId, settings);
      if (!service?.updateDocument) {
        console.error('Firebase service (updateDocument) not available for label settings');
        setError(new Error('Failed to update box label settings: Service not ready.'));
        return;
      }
      const dataToUpdate = {
        ...settings,
        updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp(),
      };
      try {
        await service.updateDocument('packingBoxes', boxId, dataToUpdate as any);
      } catch (err) {
        console.error(`Error updating label settings for box ${boxId}:`, err);
        setError(err instanceof Error ? err : new Error('Unknown error updating label settings'));
      }
    }
  }), [service, showId]);

  const getDocument = useCallback(async (docId: string): Promise<FirebaseDocument<PackingBox> | null> => {
    if (!service?.getDocument) {
      console.error('Firebase service (getDocument) not available');
      setError(new Error('Failed to get document: Service not ready.'));
      return null;
    }
    try {
      return await service.getDocument<PackingBox>('packingBoxes', docId);
    } catch (err) {
      console.error(`Error getting document ${docId}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error getting document'));
      return null;
    }
  }, [service]);

  // Memoize updateBoxLabelSettings separately if it's directly returned by the hook
  // and not part of the main 'operations' object that SharedDetailScreen might not use directly.
  // However, it *is* part of the operations object type, so it should be there.
  // The current return type of usePacking has it at the top level AND inside operations.
  // For clarity and to ensure stability if used from top level, let's memoize the top-level one too.
  const memoizedUpdateBoxLabelSettings = useCallback(async (boxId: string, settings: Pick<PackingBox, 'labelHandlingNote' | 'labelIncludeFragile' | 'labelIncludeThisWayUp' | 'labelIncludeKeepDry'>) => {
    console.log('[usePacking] Updating label settings for box:', boxId, settings);
    if (!service?.updateDocument) {
      console.error('Firebase service (updateDocument) not available for label settings');
      setError(new Error('Failed to update box label settings: Service not ready.'));
      return;
    }
    const dataToUpdate = {
      ...settings,
      updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp(),
    };
    try {
      await service.updateDocument('packingBoxes', boxId, dataToUpdate as any);
    } catch (err) {
      console.error(`Error updating label settings for box ${boxId}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error updating label settings'));
    }
  }, [service]);

  // Ensure the hook returns what its type signature promises
  return {
    boxes,
    loading,
    error,
    operations,
    updateBoxLabelSettings: memoizedUpdateBoxLabelSettings, // Use the memoized version
    getDocument,
  };
} 