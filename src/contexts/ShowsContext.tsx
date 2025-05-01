import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
import type { FirebaseService } from '@/shared/services/firebase/types';

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
        const showsData: Show[] = docs.map(doc => {
          const rawActs = doc.data?.acts;
          // Log the raw acts data for debugging
          console.log(`[ShowsContext Listener] Processing doc ${doc.id}, raw acts:`, JSON.stringify(rawActs)); 

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

        console.log("[ShowsContext Listener] Processed showsData:", showsData);
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

  const setSelectedShowById = useCallback((id: string | null) => {
    if (id === null) {
      setSelectedShow(null);
    } else {
      const showToSelect = shows.find(s => s.id === id);
      setSelectedShow(showToSelect || null);
    }
  }, [shows]);

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await firebaseService.addDocument('shows', fullShowData);
      setLoading(false);
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding show:", err);
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
    // Optimistic update placeholder
    // const originalShows = shows;
    // setShows(prev => prev.map(s => s.id === id ? { ...s, ...showData, updatedAt: new Date().toISOString() } : s));
    try {
      await firebaseService.updateDocument('shows', id, {
         ...showData,
         updatedAt: new Date().toISOString(),
      });
    } catch (err: any) { 
       console.error("Error updating show:", err);
       setErrorState(err);
       // Rollback optimistic update if implemented
       // setShows(originalShows);
    }
  }, [firebaseService]);

   const deleteShow = useCallback(async (id: string) => {
      if (!firebaseService?.deleteDocument) {
         setErrorState(new Error("Firebase service not available"));
         return;
      }
      // Optimistic update placeholder
      // const originalShows = shows;
      // setShows(prev => prev.filter(s => s.id !== id));
      try {
         await firebaseService.deleteDocument('shows', id);
         if (selectedShow?.id === id) {
            setSelectedShow(null); // Deselect if the selected show is deleted
         }
      } catch (err: any) {
         console.error("Error deleting show:", err);
         setErrorState(err);
         // Rollback optimistic update if implemented
         // setShows(originalShows);
      }
   }, [firebaseService, selectedShow?.id]);

  // --- Add getShowById implementation --- 
  const getShowById = useCallback(async (id: string): Promise<Show | null> => {
      if (!firebaseService?.getDocument) {
         console.error('Firebase service (getDocument) not available');
         setErrorState(new Error("Firebase service not available"));
         return null;
      }
      try {
         const showDoc = await firebaseService.getDocument<Omit<Show, 'id'>>('shows', id);

         if (showDoc && showDoc.data) {
           console.log(`[ShowsContext getShowById] Raw Firestore doc data for ${id}:`, JSON.stringify(showDoc.data)); // Log raw data
           const rawData = showDoc.data;
           const rawActs = rawData.acts; // Get raw acts data
           console.log(`[ShowsContext getShowById] Processing doc ${id}, raw acts:`, JSON.stringify(rawActs));

           // Apply the same safe mapping logic as in the listener
           const processedShow: Show = {
             id: showDoc.id,
             ...(rawData),
             // Ensure acts is an array
             acts: Array.isArray(rawActs) ? rawActs.map((act: any) => ({
                 ...act,
                 id: act.id ?? Date.now(),
                 name: act.name ?? `Act ${act.id ?? '?'}`,
                 scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
                     ...scene,
                     id: scene.id ?? Date.now(),
                     name: scene.name ?? `Scene ${scene.id ?? '?'}`
                 })) : [] 
             })) : [], // Default to empty array
             // Ensure other potentially missing arrays are defaulted
             collaborators: Array.isArray(rawData.collaborators) ? rawData.collaborators : [],
             venues: Array.isArray(rawData.venues) ? rawData.venues : [],
             contacts: Array.isArray(rawData.contacts) ? rawData.contacts : [],
             // Ensure required fields have fallbacks if somehow missing in rawData (though type expects them)
             name: rawData.name ?? 'Unnamed Show',
             description: rawData.description ?? '',
             userId: rawData.userId ?? '', 
             createdAt: rawData.createdAt ?? new Date().toISOString(),
             updatedAt: rawData.updatedAt ?? new Date().toISOString(),
             stageManager: rawData.stageManager ?? '',
             stageManagerEmail: rawData.stageManagerEmail ?? '',
             propsSupervisor: rawData.propsSupervisor ?? '',
             propsSupervisorEmail: rawData.propsSupervisorEmail ?? '',
             productionCompany: rawData.productionCompany ?? '',
             productionContactName: rawData.productionContactName ?? '',
             productionContactEmail: rawData.productionContactEmail ?? '',
             isTouringShow: rawData.isTouringShow ?? false,
           };
           console.log(`[ShowsContext getShowById] Processed show object for ${id}:`, processedShow); // Log processed show
           return processedShow;
         } else {
           console.log(`[ShowsContext getShowById] Document ${id} not found.`);
           return null; // Document not found
         }

      } catch (err: any) {
         console.error(`Error fetching show with ID ${id}:`, err);
         setErrorState(err);
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