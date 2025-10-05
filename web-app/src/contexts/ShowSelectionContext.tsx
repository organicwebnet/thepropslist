import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebAuth } from './WebAuthContext';
import { useFirebase } from './FirebaseContext';

interface ShowSelectionContextType {
  currentShowId: string | null;
  setCurrentShowId: (id: string | null) => void;
}

const ShowSelectionContext = createContext<ShowSelectionContextType | undefined>(undefined);

export const ShowSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useWebAuth();
  const { service } = useFirebase();
  const [currentShowId, setCurrentShowIdState] = useState<string | null>(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('currentShowId');
    console.log('ShowSelectionContext: Initializing with stored show ID:', stored);
    return stored || null;
  });
  const [hasCheckedAutoSelection, setHasCheckedAutoSelection] = useState(false);

  // Keep localStorage in sync when currentShowId changes
  useEffect(() => {
    console.log('ShowSelectionContext: currentShowId changed to:', currentShowId);
    if (currentShowId) {
      localStorage.setItem('currentShowId', currentShowId);
    } else {
      localStorage.removeItem('currentShowId');
    }
  }, [currentShowId]);

  // Auto-select single show for first-time users
  useEffect(() => {
    const checkAndAutoSelectShow = async () => {
      // Only run if user is logged in, no show is currently selected, and we haven't checked yet
      if (!user?.uid || currentShowId || hasCheckedAutoSelection) {
        return;
      }

      try {
        console.log('ShowSelectionContext: Checking for auto-selection of single show');
        setHasCheckedAutoSelection(true);
        
        // Get all shows for the user (owned + collaborative)
        const ownedShows = await service.getDocuments('shows', {
          where: [['userId', '==', user.uid]]
        });
        
        const collaborativeShows = await service.getDocuments('shows', {
          where: [['team.' + user.uid, '>=', '']]
        });
        
        // Combine and deduplicate
        const allShows = [...ownedShows];
        collaborativeShows.forEach(show => {
          if (!allShows.find(s => s.id === show.id)) {
            allShows.push(show);
          }
        });
        
        const shows = allShows;

        console.log('ShowSelectionContext: Found shows:', shows.length);
        
        // If user has exactly one show, auto-select it
        if (shows.length === 1) {
          const singleShow = shows[0];
          console.log('ShowSelectionContext: Auto-selecting single show:', singleShow.id);
          setCurrentShowIdState(singleShow.id);
          localStorage.setItem('currentShowId', singleShow.id);
        } else if (shows.length === 0) {
          console.log('ShowSelectionContext: No shows found for user');
        } else {
          console.log('ShowSelectionContext: Multiple shows found, not auto-selecting');
        }
      } catch (error) {
        console.error('ShowSelectionContext: Error checking for auto-selection:', error);
        setHasCheckedAutoSelection(true); // Don't retry on error
      }
    };

    checkAndAutoSelectShow();
  }, [user?.uid, currentShowId, hasCheckedAutoSelection, service]);

  // Wrap setCurrentShowId to update both state and localStorage
  const setCurrentShowId = useCallback((id: string | null) => {
    console.log('ShowSelectionContext: Setting current show ID to:', id);
    setCurrentShowIdState(id);
    if (id) {
      localStorage.setItem('currentShowId', id);
      console.log('ShowSelectionContext: Saved to localStorage:', id);
    } else {
      localStorage.removeItem('currentShowId');
      console.log('ShowSelectionContext: Removed from localStorage');
    }
  }, []);

  return (
    <ShowSelectionContext.Provider value={{ currentShowId, setCurrentShowId }}>
      {children}
    </ShowSelectionContext.Provider>
  );
};

export const useShowSelection = () => {
  const ctx = useContext(ShowSelectionContext);
  if (!ctx) throw new Error('useShowSelection must be used within ShowSelectionProvider');
  return ctx;
}; 