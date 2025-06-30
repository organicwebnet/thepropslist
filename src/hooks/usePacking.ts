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
import { useAuth } from '../contexts/AuthContext.tsx';
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
import { OfflineSyncManager } from '../platforms/mobile/features/offline/OfflineSyncManager';

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
  const { isAdmin } = useAuth();
  const [boxes, setBoxes] = useState<PackingBox[]>([]);
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
    if (!showId || !service?.listenToCollection) {
      setLoading(false);
      setBoxes([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const queryOptions: QueryOptions = {};
    
    // If the user is not an admin, restrict the query to the current show.
    // Admins will not have this filter, so they will see all boxes.
    if (!isAdmin) {
      queryOptions.where = [["showId", "==", showId]];
    }

    const unsubscribe = service.listenToCollection<PackingBox>(
      'packingBoxes',
      (docs: FirebaseDocument<PackingBox>[]) => {
        const boxesData = docs
          .map(docSnapshot => {
            const rawData = docSnapshot.data;
            if (!rawData) { 
              return null;
            }
            const { id: dataId, ...restOfData } = rawData as PackingBox; // Exclude id from data spread
            return {
              id: docSnapshot.id, // Use the canonical document ID
              ...restOfData,      // Spread the rest of the data
              createdAt: rawData.createdAt ? (rawData.createdAt instanceof Date ? rawData.createdAt : new Date(rawData.createdAt as any)) : new Date(),
              updatedAt: rawData.updatedAt ? (rawData.updatedAt instanceof Date ? rawData.updatedAt : new Date(rawData.updatedAt as any)) : new Date(),
            } as PackingBox;
          })
          .filter(box => box !== null) as PackingBox[]; // Filter out nulls from missing data
          
        setBoxes(boxesData);
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
      },
      queryOptions
    );

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [showId, service, isAdmin]);

  const operations: PackingOperations = useMemo(() => ({
    createBox: async (propsToPack: PackedProp[], boxName: string, description = '', actNumber = 0, sceneNumber = 0) => {
      if (!service?.addDocument || !showId) {
          setError(new Error('Failed to create box: Service not ready.'));
          return undefined;
      }
      
      const newBoxDataForFirestore = {
         name: boxName,
         showId: showId,
         description: description,
         actNumber: actNumber,
         sceneNumber: sceneNumber,
         props: propsToPack, // Renamed variable for clarity
         totalWeight: propsToPack.reduce((sum, p) => sum + (p.weight || 0), 0),
         weightUnit: 'kg' as WeightUnit, 
         isHeavy: propsToPack.reduce((sum, p) => sum + (p.weight || 0), 0) > 20, 
         notes: '',
         // Timestamps are handled by casting to 'any' to allow FieldValue
         createdAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp(),
         updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp(),
         labels: [], 
         status: 'draft' as const,
       };

      if (offlineSyncManager) {
        await offlineSyncManager.queueOperation('create', 'packingBoxes', newBoxDataForFirestore);
        return 'offline';
      } else {
        const docRef = await service.addDocument<PackingBox>('packingBoxes', newBoxDataForFirestore as any); 
        return docRef?.id;
      }
    },
    updateBox: async (boxId, updates) => {
      if (!service?.updateDocument) {
        setError(new Error('Failed to update box: Service not ready.'));
        return;
      }
       const dataToUpdateForFirestore = { 
         ...updates, 
         // Cast to 'any' because PackingBox expects Date, but we send FieldValue for timestamps
         updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp() as any
        };
       if (offlineSyncManager) {
         await offlineSyncManager.queueOperation('update', 'packingBoxes', { ...dataToUpdateForFirestore, id: boxId });
       } else {
         await service.updateDocument('packingBoxes', boxId, dataToUpdateForFirestore);
       }
    },
    deleteBox: async (boxId) => {
      if (!service?.deleteDocument) {
        setError(new Error('Failed to delete box: Service not ready.'));
        return;
      }
      if (offlineSyncManager) {
        await offlineSyncManager.queueOperation('delete', 'packingBoxes', { id: boxId });
      } else {
        await service.deleteDocument('packingBoxes', boxId);
      }
    },
    updateBoxLabelSettings: async (boxId: string, settings: Pick<PackingBox, 'labelHandlingNote' | 'labelIncludeFragile' | 'labelIncludeThisWayUp' | 'labelIncludeKeepDry'>) => {
      if (!service?.updateDocument) {
        setError(new Error('Failed to update box label settings: Service not ready.'));
        return;
      }
      const dataToUpdate = {
        ...settings,
        // Cast to 'any' because PackingBox expects Date, but we send FieldValue for timestamps
        updatedAt: Platform.OS === 'web' ? webServerTimestamp() : FirebaseFirestoreTypes.FieldValue.serverTimestamp() as any,
      };
      if (offlineSyncManager) {
        await offlineSyncManager.queueOperation('update', 'packingBoxes', { ...dataToUpdate, id: boxId });
      } else {
        await service.updateDocument('packingBoxes', boxId, dataToUpdate);
      }
    }
  }), [service, showId, offlineSyncManager]);

  const getDocument = useCallback(async (docId: string): Promise<FirebaseDocument<PackingBox> | null> => {
    if (!service?.getDocument) {
      setError(new Error('Failed to get document: Service not ready.'));
      return null;
    }
    try {
      return await service.getDocument<PackingBox>('packingBoxes', docId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error getting document'));
      return null;
    }
  }, [service]);
  
  // Ensure all returned values are correct as per the hook's defined return type
  return { boxes, loading, error, operations, updateBoxLabelSettings: operations.updateBoxLabelSettings, getDocument };
} 
