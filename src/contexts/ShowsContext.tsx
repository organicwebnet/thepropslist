import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { useFirebase } from './FirebaseContext';
import type { Show } from '../types';
// Import FirebaseDocument type
import { FirebaseDocument } from '../shared/services/firebase/types';
import { Platform } from 'react-native';

interface ShowsContextType {
  shows: Show[];
  loading: boolean;
  error: Error | null;
  selectedShow: Show | null;
  setSelectedShow: (show: Show | null) => void;
}

export const ShowsContext = createContext<ShowsContextType | undefined>(undefined);

export const useShows = () => {
  const context = useContext(ShowsContext);
  if (!context) {
    throw new Error('useShows must be used within a ShowsProvider');
  }
  return context;
};

export const ShowsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const { user } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShow, setSelectedShowInternal] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<Error | null>(null);

  const setSelectedShow = useCallback((show: Show | null) => {
    console.log(`[ShowsContext] setSelectedShow called with:`, show ? `ID: ${show.id}, Name: ${show.name}` : 'null');
    setSelectedShowInternal(show);
    if (show && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
       try {
           localStorage.setItem('lastSelectedShowId', show.id);
           console.log('[ShowsContext] Saved last selected show ID to localStorage:', show.id);
       } catch (e) {
           console.error("[ShowsContext] Failed to save show ID to localStorage:", e);
       }
    } else if (!show && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
       // Optional: Clear localStorage if show is deselected
       // localStorage.removeItem('lastSelectedShowId');
    }
  }, []);

  // REMOVE Direct db instance derivation here
  // const db = firebaseService?.firestore() as FirebaseFirestoreTypes.Module | undefined;

  useEffect(() => {
    // Check if firebaseService is initialized
    if (!firebaseInitialized || !firebaseService) { // Check service directly
      if (firebaseError) {
        console.error("Error from FirebaseProvider:", firebaseError);
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

    // TEMPORARY: Comment out the user check to fetch all shows
    // if (!user) { ... }

    setErrorState(null);
    setLoading(true);

    // Use the service method to listen
    const unsubscribe = firebaseService.listenToCollection<Show>(
      'shows', // Collection path
      (docs: FirebaseDocument<Show>[]) => { // Callback for successful updates
        // Map FirebaseDocument array to Show array
        // Ensure doc.data exists before trying to spread it
        const showsData: Show[] = docs.map(doc => ({
            id: doc.id,
            ...(doc.data || {}), // Use data property, provide default empty object
            // Ensure nested structures have defaults if potentially missing from doc.data
            acts: Array.isArray(doc.data?.acts) ? doc.data.acts.map((act: any) => ({
                ...act,
                id: act.id || 1, // Default ID if missing
                scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
                    ...scene,
                    id: scene.id || 1 // Default ID if missing
                })) : []
            })) : [{ id: 1, name: 'Act 1', scenes: [{ id: 1, name: 'Scene 1' }] }], // Default act/scene structure
            collaborators: Array.isArray(doc.data?.collaborators) ? doc.data.collaborators : [] // Default collaborators
        } as Show)); // Explicit cast to Show might be needed depending on strictness

        setShows(showsData);
        setErrorState(null);
        
        // Update selected show logic
        if (!selectedShow && showsData.length > 0) {
           setSelectedShow(showsData[0]);
        } else if (selectedShow && !showsData.some(s => s.id === selectedShow.id)) {
          // If current selection disappears, select the first available or null
          setSelectedShow(showsData.length > 0 ? showsData[0] : null);
        }
        
        setLoading(false);
      },
      (err: Error) => { // Callback for errors
        console.error("Error fetching shows via service:", err);
        setErrorState(err);
        setShows([]);
        setSelectedShow(null);
        setLoading(false);
      }
      // Add query options here if needed, e.g., { where: [['ownerId', '==', user.uid]] }
    );

    // Cleanup function
    return () => {
        console.log("ShowsContext: Unsubscribing from collection listener.");
        unsubscribe();
    };
  // Dependencies: service availability, user (if re-enabled), selection state
  }, [firebaseInitialized, firebaseService, firebaseError, selectedShow, setSelectedShow]); // user removed temporarily

  const value = {
    shows,
    loading: loading || !firebaseInitialized,
    error: error || firebaseError,
    selectedShow,
    setSelectedShow,
  };

  return (
    <ShowsContext.Provider value={value}>
      {children}
    </ShowsContext.Provider>
  );
}; 