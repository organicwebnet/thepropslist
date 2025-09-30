import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
// REMOVE Import modular functions from RNFirebase Firestore
// import firestore, { 
//   FirebaseFirestoreTypes, 
//   collection, 
//   query, 
//   where, 
//   onSnapshot 
// } from '@react-native-firebase/firestore'; 
import { useAuth } from './AuthContext';
// import { ShowsContext } from './ShowsContext'; // REMOVE self-import
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { Show } from '../shared/services/firebase/types';
// Import FirebaseDocument type
import { FirebaseDocument, QueryOptions } from '../shared/services/firebase/types';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import type { FirebaseService } from '../shared/services/firebase/types.ts'; // Removed FirebaseService type import, service is used directly
// Remove direct firestore imports as service is used
// import { collection, onSnapshot, query, where, orderBy, limit, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

interface ShowsContextType {
  shows: Show[];
  loading: boolean;
  error: Error | null;
  selectedShow: Show | null;
  setSelectedShow: (show: Show | null) => void;
  setSelectedShowById: (id: string | null) => void;
  isLoading: boolean;
  addShow: (showData: Omit<Show, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateShow: (id: string, showData: Partial<Show>) => Promise<void>;
  deleteShow: (id: string) => Promise<void>;
  getShowById: (id: string) => Promise<Show | null>;
}

export const ShowsContext = createContext<ShowsContextType | undefined>(undefined);

export const useShows = () => {
  const context = useContext(ShowsContext);
  if (!context) {
    throw new Error('useShows must be used within a ShowsProvider');
  }
  return context;
};

interface ShowsProviderProps {
  children: ReactNode;
}

export const ShowsProvider: React.FC<ShowsProviderProps> = ({ children }) => {
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const { user, isAdmin, status: authStatus } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShow, setSelectedShowInternal] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<Error | null>(null);

  // setSelectedShowInternal is now wrapped in useCallback
  const stableSetSelectedShowInternal = useCallback((show: Show | null) => {
    setSelectedShowInternal(show);
  }, []);

  const setSelectedShow = useCallback((show: Show | null) => {
    stableSetSelectedShowInternal(show); // Use the stable internal setter
    if (show && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
       try {
           localStorage.setItem('lastSelectedShowId', show.id);
       } catch (e) {
        // Silently fail if localStorage is unavailable
       }
    } else if (!show && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
       // Optional: Clear localStorage if show is deselected
       // localStorage.removeItem('lastSelectedShowId');
    }
    // Persist selection on native as well
    if (show && Platform.OS !== 'web') {
      AsyncStorage.setItem('lastSelectedShowId', show.id).catch(() => {});
    }
  }, [stableSetSelectedShowInternal]); // Dependency is now the stable internal setter

  // REMOVE Direct db instance derivation here
  // const db = firebaseService?.firestore() as FirebaseFirestoreTypes.Module | undefined;

  useEffect(() => {
    if (!firebaseInitialized || !firebaseService || authStatus !== 'in' || !user) {
      if (authStatus !== 'pending') {
        setShows([]);
        setSelectedShow(null);
        setLoading(false);
      }
      return;
    }

    setErrorState(null);
    setLoading(true);

    let ownedShows: Show[] = [];
    let teamShows: Show[] = [];
    let permissionDenied = false;

    const processAndSetShows = async () => {
      const allShows = [...ownedShows, ...teamShows];
      const uniqueShows = Array.from(new Map(allShows.map(show => [show.id, show])).values());
      
      const processedShows = uniqueShows.map(show => {
        const rawActs = show.acts;
        return {
          ...show,
          team: show.team && typeof show.team === 'object' ? show.team : {},
          acts: Array.isArray(rawActs) ? rawActs.map((act: any) => ({
              ...act,
              id: act.id ?? Date.now(),
              name: act.name ?? `Act ${act.id ?? '?'}`,
              scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
                  ...scene,
                  id: scene.id ?? Date.now(),
                  name: scene.name ?? `Scene ${scene.id ?? '?'}`
              })) : []
          })) : [],
          collaborators: Array.isArray(show.collaborators) ? show.collaborators : [] 
        } as Show;
      });

      setShows(processedShows);

      // Always ensure a show is selected once data is available
      if (!selectedShow) {
        let showToSelect: Show | null = null;
        let lastSelectedId: string | null = null;

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          try {
            lastSelectedId = localStorage.getItem('lastSelectedShowId');
            if (lastSelectedId) {
              showToSelect = processedShows.find(s => s.id === lastSelectedId) || null;
            }
          } catch (e) { /* silent */ }
        } else {
          try {
            lastSelectedId = (await AsyncStorage.getItem('lastSelectedShowId')) as string | null;
            if (lastSelectedId) {
              showToSelect = processedShows.find(s => s.id === lastSelectedId) || null;
            }
          } catch (e) { /* silent */ }
        }

        if (!showToSelect && processedShows.length > 0) {
          showToSelect = processedShows[0];
        }

        if (showToSelect) {
          setSelectedShow(showToSelect);
        }
      }
      setLoading(false);
    };

    const handleError = (err: Error) => {
      if (err.message && err.message.includes('permission-denied')) {
        setErrorState(new Error('You do not have permission to access shows.'));
        permissionDenied = true;
      } else {
        setErrorState(err);
      }
      setShows([]);
      setSelectedShow(null);
      setLoading(false);
    };

    const ownedShowsQuery: QueryOptions = { where: [['ownerId', '==', user.uid]] };
    const ownedUnsubscribe = firebaseService.listenToCollection<Show>(
      'shows',
      (docs) => {
        if (permissionDenied) return;
        ownedShows = docs.map(doc => ({ ...doc.data, id: doc.id } as Show));
        processAndSetShows();
      },
      handleError,
      ownedShowsQuery
    );

    let teamUnsubscribe = () => { /* no-op */ };
    if (!isAdmin) {
      const teamShowsQuery: QueryOptions = { where: [[`team.${user.uid}`, '>=', '']] };
      teamUnsubscribe = firebaseService.listenToCollection<Show>(
        'shows',
        async (docs) => {
          if (permissionDenied) return;
          teamShows = docs.map(doc => ({ ...doc.data, id: doc.id } as Show));
          await processAndSetShows();
        },
        handleError,
        teamShowsQuery
      );
    } else {
      // If user is admin, we can fetch all shows with one query.
      // For simplicity, we can just treat all shows as 'team' shows.
      teamUnsubscribe = firebaseService.listenToCollection<Show>(
        'shows',
        async (docs) => {
          if (permissionDenied) return;
          teamShows = docs.map(doc => ({ ...doc.data, id: doc.id } as Show));
          await processAndSetShows();
        },
        handleError
      );
    }
    
    return () => {
      ownedUnsubscribe();
      teamUnsubscribe();
    };
  }, [firebaseInitialized, firebaseService, user, isAdmin, authStatus, stableSetSelectedShowInternal, setSelectedShow]);

  const setSelectedShowById = useCallback((id: string | null) => {
    if (id === null) {
      setSelectedShow(null);
    } else {
      const showToSelect = shows.find(s => s.id === id);
      setSelectedShow(showToSelect || null);
    }
  }, [shows, setSelectedShow]); // Added setSelectedShow

  const addShow = useCallback(async (showData: Omit<Show, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    if (!user || !firebaseService?.addDocument) {
      setErrorState(new Error("User not logged in or Firebase service not available"));
      return null;
    }
    setLoading(true);
    try {
      const fullShowData = {
        ...showData,
        userId: user.uid,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await firebaseService.addDocument('shows', fullShowData);
      // --- Create a board for this show ---
      try {
        await firebaseService.addDocument('todo_boards', {
          name: showData.name || 'Untitled Board',
          ownerId: user.uid,
          sharedWith: [user.uid],
          showId: docRef.id,
          createdAt: new Date().toISOString(),
        });
        // Optionally: you could return the board ID as well if needed
      } catch (boardErr) {
        // Still return the showId, but you may want to notify the user in the UI
        // console.error("Failed to create a task board for the new show:", boardErr);
      }
      setLoading(false);
      return docRef.id;
    } catch (err: any) {
      setErrorState(err);
      setLoading(false);
      return null;
    }
  }, [user, firebaseService]);

  const updateShow = useCallback(async (id: string, showData: Partial<Show>) => {
    if (!firebaseService?.updateDocument) {
       setErrorState(new Error("Firebase service not available"));
       return;
    }
    try {
      await firebaseService.updateDocument('shows', id, {
         ...showData,
         updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      // Intentionally swallowing error for now, should be handled with user feedback
    }
  }, [firebaseService]);

   const deleteShow = useCallback(async (id: string) => {
      if (!firebaseService?.deleteShow) {
         setErrorState(new Error("Firebase service not available"));
         return;
      }
      try {
         await firebaseService.deleteShow(id);
         if (selectedShow?.id === id) {
            setSelectedShow(null); // Deselect if the selected show is deleted
         }
      } catch (err: any) {
        // Intentionally swallowing error for now, should be handled with user feedback
      }
   }, [firebaseService, selectedShow, setSelectedShow]); // Added selectedShow and setSelectedShow

  // --- Add getShowById implementation --- 
  const getShowById = useCallback(async (id: string): Promise<Show | null> => {
      if (!firebaseService?.getDocument) {
         setErrorState(new Error("Firebase service not available"));
         return null;
      }
      try {
         const doc = await firebaseService.getDocument<Show>('shows', id);
         return doc ? { ...doc.data } as Show : null;
      } catch (err: any) {
        // Intentionally swallowing error for now, should be handled with user feedback
        return null;
      }
  }, [firebaseService]); // Removed setErrorState dependency
  // --- End getShowById implementation ---

  const value = {
    shows,
    loading: loading || authStatus === 'pending' || !firebaseInitialized,
    error: error || firebaseError,
    selectedShow,
    setSelectedShow,
    setSelectedShowById,
    isLoading: loading,
    addShow,
    updateShow,
    deleteShow,
    getShowById,
  };

  return (
    <ShowsContext.Provider value={value}>
      {children}
    </ShowsContext.Provider>
  );
}; 
