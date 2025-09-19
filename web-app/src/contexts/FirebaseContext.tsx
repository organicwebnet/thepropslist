import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { app, auth, db } from '../firebase';
import {
  FirebaseService as FirebaseServiceInterface,
  FirebaseDocument,
  OfflineSync as OfflineServiceInterface,
}
 from '../../shared/services/firebase/types';
import { WebFirebaseService } from '../services/WebFirebaseService';

export interface FirebaseContextType {
  user: User | null;
  loadingUser: boolean;
  service: FirebaseServiceInterface;
  isInitialized: boolean;
  error: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [service, setService] = useState<FirebaseServiceInterface | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const webFirebaseService = new WebFirebaseService(app, auth, db);
    setService(webFirebaseService);

    const initializeService = async () => {
      try {
        await webFirebaseService.initialize();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Firebase initialization failed'));
      }
    };
    initializeService();

    const unsubscribe = auth.onAuthStateChanged((firebaseUser: User | null) => {
      setUser(firebaseUser);
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, []);

  if (loadingUser || !service) {
    // Render app-like background to avoid white flash during auth/service init
    return <div className="min-h-screen w-full bg-gradient-to-br from-pb-darker/80 to-pb-primary/30" />;
  }

  return (
    <FirebaseContext.Provider value={{ user, loadingUser, service, isInitialized, error }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}; 