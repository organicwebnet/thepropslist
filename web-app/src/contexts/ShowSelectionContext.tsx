import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ShowSelectionContextType {
  currentShowId: string | null;
  setCurrentShowId: (id: string | null) => void;
}

const ShowSelectionContext = createContext<ShowSelectionContextType | undefined>(undefined);

export const ShowSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentShowId, setCurrentShowIdState] = useState<string | null>(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('currentShowId');
    console.log('ShowSelectionContext: Initializing with stored show ID:', stored);
    return stored || null;
  });

  // Keep localStorage in sync when currentShowId changes
  useEffect(() => {
    console.log('ShowSelectionContext: currentShowId changed to:', currentShowId);
    if (currentShowId) {
      localStorage.setItem('currentShowId', currentShowId);
    } else {
      localStorage.removeItem('currentShowId');
    }
  }, [currentShowId]);

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