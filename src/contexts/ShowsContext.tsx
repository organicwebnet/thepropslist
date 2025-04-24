import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { Show } from '../types';

interface ShowsContextType {
  shows: Show[];
  loading: boolean;
  selectedShow: Show | null;
  setSelectedShow: (show: Show | null) => void;
}

const ShowsContext = createContext<ShowsContextType | undefined>(undefined);

export function ShowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setShows([]);
      setSelectedShow(null);
      setLoading(false);
      return;
    }

    const showsQuery = query(
      collection(db, 'shows'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(showsQuery, (snapshot) => {
      const showsData: Show[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure acts array is properly initialized with scenes
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
      
      // Automatically select the first show if no show is currently selected
      if (showsData.length > 0 && !selectedShow) {
        setSelectedShow(showsData[0]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedShow]);

  const value = {
    shows,
    loading,
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