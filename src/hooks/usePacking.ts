import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/contexts/FirebaseContext';
import { PackingBox, PackedProp } from '@/types/packing';
import { FirebaseDocument } from '@/shared/services/firebase/types';

interface PackingOperations {
  createBox: (props: PackedProp[], boxName: string, actNumber?: number, sceneNumber?: number) => Promise<string | undefined>;
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
    const firestoreInstance = service.firestore();

    setLoading(true);
    setError(null);

    const boxesCollectionRef = collection(firestoreInstance, 'packingBoxes');
    const boxesQuery = query(boxesCollectionRef, where("showId", "==", showId));

    const unsubscribe = onSnapshot(
      boxesQuery,
      (snapshot) => {
        const receivedBoxIds = snapshot.docs.map(d => d.id);
        console.log(`[usePacking Snapshot] Received ${snapshot.size} docs. IDs: [${receivedBoxIds.join(', ')}]`);
        
        const boxesData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            // Explicitly delete the internal 'id' field if it exists
            if ('id' in data) {
              // console.log(`Deleting internal id field (${data.id}) from data for doc ${doc.id}`); // Optional log
              delete data.id;
            }
            return {
              id: doc.id, // Assign the correct Firestore Document ID
              ...data,    // Spread the rest (now definitely without the internal 'id')
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            }
          })
          .filter(box => box !== null) as PackingBox[];
          
        setBoxes(boxesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching packing boxes:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showId, service]);

  const operations: PackingOperations = {
    createBox: async (props, boxName, actNumber = 0, sceneNumber = 0) => {
      if (!service?.addDocument || !showId) {
          console.error('Firebase service (addDocument) not available or showId missing');
          setError(new Error('Failed to create box: Service not ready.'));
          return undefined;
      }
      
      // Ensure all required fields for PackingBox are present
      const newBoxData: Omit<PackingBox, 'id'> = {
         name: boxName,
         showId: showId,
         actNumber: actNumber,
         sceneNumber: sceneNumber,
         props: props,
         totalWeight: props.reduce((sum, p) => sum + (p.weight || 0), 0),
         weightUnit: 'kg', // Default or determine based on props?
         isHeavy: props.reduce((sum, p) => sum + (p.weight || 0), 0) > 20, // Example threshold
         // Add default/empty values for other required fields from PackingBox type
         notes: '',
         createdAt: serverTimestamp() as any, // Cast needed for serverTimestamp 
         updatedAt: serverTimestamp() as any, // Cast needed for serverTimestamp
         // Ensure PackingBox type fields match exactly (e.g., description, labels, status, metadata?)
         description: '', // Add if required by PackingBox
         labels: [], // Add if required by PackingBox
         status: 'draft', // Add if required by PackingBox
       };

      try {
        // Call addDocument with collection path and data
        const docRef = await service.addDocument('packingBoxes', newBoxData);
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
       const dataToUpdate = { 
         ...updates, 
         updatedAt: serverTimestamp() as any // Cast needed
        };
       try {
           // Add logging before the update call
           console.log(`[usePacking] Attempting to update document (using setDoc merge) at path: packingBoxes, ID: ${boxId}`);
           await service.setDocument('packingBoxes', boxId, dataToUpdate, { merge: true }); 
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
    updateBoxLabelSettings: async (boxId, settings) => {
      console.log('[usePacking] Updating label settings for box:', boxId, settings);
      return operations.updateBox(boxId, settings);
    }
  };

  // Function to get a specific document
  const getDocument = async (docId: string): Promise<FirebaseDocument<PackingBox> | null> => {
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
  };

  return { boxes, loading, error, operations, updateBoxLabelSettings: operations.updateBoxLabelSettings, getDocument };
} 