import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useAuth } from './AuthContext';
import { useFirebase } from './FirebaseContext';
import type { Show } from '../types';
import type { CustomFirestore } from '../shared/services/firebase/types';

interface ShowsContextType {
  shows: Show[];
  loading: boolean;
  error: Error | null;
  selectedShow: Show | null;
  setSelectedShow: (show: Show | null) => void;
}

export const ShowsContext = createContext<ShowsContextType | undefined>(undefined);

export function ShowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const [shows, setShows] = useState<Show[]>([]);
  const [_selectedShow, _setSelectedShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setSelectedShow = useCallback((show: Show | null) => {
    console.log(`ShowsContext: setSelectedShow called with:`, show ? `ID: ${show.id}, Name: ${show.name}` : 'null');
    _setSelectedShow(show);
  }, []);

  useEffect(() => {
    if (!firebaseInitialized || !firebaseService) {
      if (firebaseError) {
        console.error("Error from FirebaseProvider:", firebaseError);
        setError(firebaseError);
        setLoading(false);
      }
      setLoading(true);
      setShows([]);
      setSelectedShow(null);
      return;
    }

    // TEMPORARY: Comment out the user check to fetch all shows
    // if (!user) {
    //   setShows([]);
    //   setSelectedShow(null);
    //   setLoading(false);
    //   setError(null);
    //   return;
    // }

    setError(null);
    setLoading(true);

    const db = firebaseService.firestore() as CustomFirestore;

    const showsCollection = db.collection('shows');

    const showsQuery = showsCollection;

    const unsubscribe = showsQuery.onSnapshot( 
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        const showsData: Show[] = [];
        snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
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
        
        if (!_selectedShow && showsData.length > 0) {
           setSelectedShow(showsData[0]);
        } else if (_selectedShow && !showsData.some(s => s.id === _selectedShow.id)) {
          setSelectedShow(showsData.length > 0 ? showsData[0] : null);
        }
        
        setLoading(false);
      },
      (err: Error) => {
        console.error("Error fetching shows:", err);
        setError(err);
        setShows([]);
        setSelectedShow(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseInitialized, firebaseService, firebaseError, _selectedShow, setSelectedShow]);

  const value = {
    shows,
    loading,
    error,
    selectedShow: _selectedShow,
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