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
  // Destructure firebaseService without casting db here
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const [shows, setShows] = useState<Show[]>([]);
  const [_selectedShow, _setSelectedShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const setSelectedShow = useCallback((show: Show | null) => {
    console.log(`ShowsContext: setSelectedShow called with:`, show ? `ID: ${show.id}, Name: ${show.name}` : 'null');
    _setSelectedShow(show);
  }, []);

  // REMOVE Direct db instance derivation here
  // const db = firebaseService?.firestore() as FirebaseFirestoreTypes.Module | undefined;

  useEffect(() => {
    // Check if firebaseService is initialized
    if (!firebaseInitialized || !firebaseService) { // Check service directly
      if (firebaseError) {
        console.error("Error from FirebaseProvider:", firebaseError);
        setError(firebaseError);
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

    setError(null);
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
        setError(null);
        
        // Update selected show logic
        if (!_selectedShow && showsData.length > 0) {
           setSelectedShow(showsData[0]);
        } else if (_selectedShow && !showsData.some(s => s.id === _selectedShow.id)) {
          // If current selection disappears, select the first available or null
          setSelectedShow(showsData.length > 0 ? showsData[0] : null);
        }
        
        setLoading(false);
      },
      (err: Error) => { // Callback for errors
        console.error("Error fetching shows via service:", err);
        setError(err);
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
  }, [firebaseInitialized, firebaseService, firebaseError, _selectedShow, setSelectedShow]); // user removed temporarily

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