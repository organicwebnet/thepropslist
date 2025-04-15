import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PackingBox, Prop } from '../types';
import { PackingService } from '../services/packing';

export function usePacking(showId?: string) {
  const [boxes, setBoxes] = useState<PackingBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const packingService = PackingService.getInstance();

  useEffect(() => {
    if (!showId) {
      setLoading(false);
      return;
    }

    const fetchBoxes = async () => {
      try {
        const boxesQuery = query(
          collection(db, 'packingBoxes'),
          where('showId', '==', showId)
        );
        
        const querySnapshot = await getDocs(boxesQuery);
        const boxesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PackingBox[];

        setBoxes(boxesData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoxes();
  }, [showId]);

  const createBox = async (props: Prop[], actNumber: number, sceneNumber: number) => {
    if (!showId) return;

    try {
      const newBox = packingService.createBox(showId, props, actNumber, sceneNumber);
      const docRef = await addDoc(collection(db, 'packingBoxes'), newBox);
      const boxWithId = { ...newBox, id: docRef.id };
      setBoxes(prev => [...prev, boxWithId]);
      return boxWithId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateBox = async (boxId: string, updates: Partial<PackingBox>) => {
    try {
      await updateDoc(doc(db, 'packingBoxes', boxId), updates);
      setBoxes(prev => prev.map(box => 
        box.id === boxId ? { ...box, ...updates } : box
      ));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteBox = async (boxId: string) => {
    try {
      await deleteDoc(doc(db, 'packingBoxes', boxId));
      setBoxes(prev => prev.filter(box => box.id !== boxId));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    boxes,
    loading,
    error,
    createBox,
    updateBox,
    deleteBox
  };
} 