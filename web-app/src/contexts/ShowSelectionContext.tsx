import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ShowSelectionContextType {
  currentShowId: string | null;
  setCurrentShowId: (id: string | null) => void;
}

const ShowSelectionContext = createContext<ShowSelectionContextType | undefined>(undefined);

export const ShowSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentShowId, setCurrentShowIdState] = useState<string | null>(() => {
    // Initialize from localStorage if available
    return localStorage.getItem('currentShowId') || null;
  });

  // Keep localStorage in sync when currentShowId changes
  useEffect(() => {
    if (currentShowId) {
      localStorage.setItem('currentShowId', currentShowId);
    } else {
      localStorage.removeItem('currentShowId');
    }
  }, [currentShowId]);

  // Wrap setCurrentShowId to update both state and localStorage
  const setCurrentShowId = useCallback((id: string | null) => {
    setCurrentShowIdState(id);
    if (id) {
      localStorage.setItem('currentShowId', id);
    } else {
      localStorage.removeItem('currentShowId');
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