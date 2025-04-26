import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { Show } from '../types';

interface ShowsContextType {
  shows: Show[];
  loading: boolean;
  error: FirestoreError | null;
  selectedShow: Show | null;
  setSelectedShow: (show: Show | null) => void;
}

export const ShowsContext = createContext<ShowsContextType | undefined>(undefined);

export function ShowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!user) {
      setShows([]);
      setSelectedShow(null);
      setLoading(false);
      setError(null);
      return;
    }

    setError(null);
    setLoading(true);

    const showsQuery = query(
      collection(db, 'shows'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(showsQuery, 
      (snapshot) => {
        const showsData: Show[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const acts = Array.isArray(data.acts) ? data.acts.map((act: any) => ({
            ...act,
            id: act.id || 1,
            scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
              ...scene,
              id: scene.id || 1
            })) : []
          })) : [{
            id: 1,
            name: 'Act 1',
            scenes: [{ id: 1, name: 'Scene 1' }]
          }];

          showsData.push({
            id: doc.id,
            ...data,
            acts,
            collaborators: Array.isArray(data.collaborators) ? data.collaborators : []
          } as Show);
        });
        setShows(showsData);
        setError(null);
        
        if (!selectedShow && showsData.length > 0) {
           setSelectedShow(showsData[0]);
        } else if (selectedShow && !showsData.some(s => s.id === selectedShow.id)) {
          setSelectedShow(showsData.length > 0 ? showsData[0] : null);
        }
        
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching shows:", err);
        setError(err);
        setShows([]);
        setSelectedShow(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const value = {
    shows,
    loading,
    error,
    selectedShow,
    setSelectedShow,
  };

  return (
    <ShowsContext.Provider value={value}>
      {children}
    </ShowsContext.Provider>
  );
}

export function useShows() {
  const context = useContext(ShowsContext);
  if (context === undefined) {
    throw new Error('useShows must be used within a ShowsProvider');
  }
  return context;
} 