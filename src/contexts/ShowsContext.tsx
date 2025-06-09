import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
// REMOVE Import modular functions from RNFirebase Firestore
// import firestore, { 
//   FirebaseFirestoreTypes, 
//   collection, 
//   query, 
//   where, 
//   onSnapshot 
// } from '@react-native-firebase/firestore'; 
import { useAuth } from './AuthContext.tsx';
// import { ShowsContext } from './ShowsContext'; // REMOVE self-import
import { useFirebase } from './FirebaseContext.tsx';
import { Show } from '../shared/services/firebase/types.ts';
// Import FirebaseDocument type
import { FirebaseDocument /* QueryOptions */ } from '../shared/services/firebase/types.ts'; // Removed QueryOptions
import { Platform } from 'react-native';
// import type { FirebaseService } from '../shared/services/firebase/types.ts'; // Removed FirebaseService type import, service is used directly
// Remove direct firestore imports as service is used
// import { collection, onSnapshot, query, where, orderBy, limit, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

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
  const { user } = useAuth();
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
  }, [stableSetSelectedShowInternal]); // Dependency is now the stable internal setter

  // REMOVE Direct db instance derivation here
  // const db = firebaseService?.firestore() as FirebaseFirestoreTypes.Module | undefined;

  useEffect(() => {
    // Check if firebaseService is initialized
    if (!firebaseInitialized || !firebaseService) { // Check service directly
      if (firebaseError) {
        setErrorState(firebaseError);
        setLoading(false);
      } else {
         // If not initialized and no error yet, just keep loading
         setLoading(true); 
      }
      // Reset state if firebase isn't ready
      setShows([]);
      setSelectedShow(null);
      return;
    }

    // Only fetch shows if user is authenticated
    if (!user) {
      setShows([]);
      setSelectedShow(null);
      setLoading(false);
      return;
    }

    setErrorState(null);
    setLoading(true);

    let permissionDenied = false;
    // Use the service method to listen
    const unsubscribe = firebaseService.listenToCollection<Show>(
      'shows', // Collection path
      (docs: FirebaseDocument<Show>[]) => { // Callback for successful updates
        if (permissionDenied) return; // Don't update state if permission denied previously
        const showsData: Show[] = docs.map(doc => {
          const rawActs = doc.data?.acts;
          return {
            id: doc.id,
            ...(doc.data || {}),
            // Assign acts safely, defaulting to empty array if not an array
            acts: Array.isArray(rawActs) ? rawActs.map((act: any) => ({
                ...act,
                id: act.id ?? Date.now(), // Use a more unique default ID if needed
                name: act.name ?? `Act ${act.id ?? '?'}`,
                scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
                    ...scene,
                    id: scene.id ?? Date.now(), // Use a more unique default ID if needed
                    name: scene.name ?? `Scene ${scene.id ?? '?'}`
                })) : [] // Default scenes to empty array
            })) : [], // <-- Default to empty array if rawActs is not an array
            // Ensure collaborators also defaults safely
            collaborators: Array.isArray(doc.data?.collaborators) ? doc.data.collaborators : [] 
          } as Show;
        });

        setShows(showsData);
        setErrorState(null);
        
        // --- Logic to determine initial selected show ---
        let showToSelect: Show | null = null;
        let lastSelectedId: string | null = null;

        // 1. Try restoring from localStorage (on web)
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
           try {
             lastSelectedId = localStorage.getItem('lastSelectedShowId');
             if (lastSelectedId) {
               showToSelect = showsData.find(s => s.id === lastSelectedId) || null;
             }
           } catch (e) {
            // Silently fail if localStorage is unavailable
           }
        }

        // 2. If not restored and data available, select the first show
        if (!showToSelect && showsData.length > 0) {
            showToSelect = showsData[0];
        }

        // 3. If current selection is different or disappeared, update it
        if (!selectedShow && showToSelect) {
            setSelectedShowInternal(showToSelect);
        }
        // --- End initial selection logic ---
        
        setLoading(false);
      },
      (err: Error) => { // Callback for errors
        if (err.message && err.message.includes('permission-denied')) {
          setErrorState(new Error('You do not have permission to access shows. Please check your account or contact support.'));
          setLoading(false);
          permissionDenied = true;
          // Do not reset state or retry
          return;
        }
        setErrorState(err);
        setShows([]);
        setSelectedShow(null);
        setLoading(false);
      },
      { where: [['ownerId', '==', user.uid]] } // <-- Add this line to filter by ownerId
    );

    // Cleanup function
    return () => {
        unsubscribe();
    };
  // Dependencies: service availability, user (if re-enabled)
  }, [firebaseInitialized, firebaseService, selectedShow, stableSetSelectedShowInternal, setSelectedShow, user]); // Added user to dependencies

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
      if (!firebaseService?.deleteDocument) {
         setErrorState(new Error("Firebase service not available"));
         return;
      }
      try {
         await firebaseService.deleteDocument('shows', id);
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
         return doc ? { id: doc.id, ...doc.data } as Show : null;
      } catch (err: any) {
        // Intentionally swallowing error for now, should be handled with user feedback
        return null;
      }
  }, [firebaseService]); // Removed setErrorState dependency
  // --- End getShowById implementation ---

  const value = {
    shows,
    loading: loading || !firebaseInitialized,
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