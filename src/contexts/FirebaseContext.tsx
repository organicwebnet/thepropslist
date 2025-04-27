import React, { createContext, useContext, ReactNode } from 'react';
import { View, Text, Platform } from 'react-native';
import { FirebaseService } from '../shared/services/firebase/types';
import { MobileFirebaseService } from '../platforms/mobile/services/MobileFirebaseService';
import { WebFirebaseService } from '../platforms/web/services/firebase';

interface FirebaseContextType {
  service: FirebaseService;
  isInitialized: boolean;
  error: Error | null;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const service = React.useMemo(() => {
    if (Platform.OS === 'web') {
      console.log("[FirebaseProvider] Initializing WebFirebaseService...");
      return new WebFirebaseService();
    } else {
      console.log("[FirebaseProvider] Initializing MobileFirebaseService...");
      return new MobileFirebaseService();
    }
  }, []);

  React.useEffect(() => {
    const initializeFirebase = async () => {
      try {
        await service.initialize();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Firebase:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize Firebase'));
      }
    };

    initializeFirebase();
  }, [service]);

  const value = React.useMemo(() => ({
    service,
    isInitialized,
    error
  }), [service, isInitialized, error]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Failed to initialize Firebase</Text>
        <Text style={{ color: 'red' }}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
} 