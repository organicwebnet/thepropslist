import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { FirebaseService } from '../../../shared/services/firebase/types';
import { MobileFirebaseService } from '../services/MobileFirebaseService';
import { globalStyles } from '../../../styles/globalStyles';

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
    // Only mobile service for native app
    return new MobileFirebaseService();
  }, []);

  React.useEffect(() => {
    const initializeFirebase = async () => {
      if (!service) {
          setError(new Error("Firebase service not available for this platform."));
          return;
      }
      try {
        await service.initialize();
        setIsInitialized(true);
        setError(null); // Clear any previous error
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize Firebase'));
        setIsInitialized(false); // Ensure initialization fails
      }
    };

    initializeFirebase();
  }, [service]); // Dependency array ensures this runs once when service is created

  const value = React.useMemo(() => {
    if (!error && isInitialized && !service) {
      // This case should ideally not happen if logic is correct,
      // but it's a safeguard against the non-null assertion.
      throw new Error("Firebase service is null after successful initialization without error.");
    }
    return {
      service: service as FirebaseService, // Cast to FirebaseService, will be null if service is null
      isInitialized,
      error
    };
  }, [service, isInitialized, error]);

  if (error) {
    return (
      <View style={globalStyles.centered}>
        <Text style={globalStyles.colorRed}>Failed to initialize Firebase</Text>
        <Text style={globalStyles.colorRed}>{error.message}</Text>
      </View>
    );
  }
  
  if (!isInitialized) {
    return (
        <View style={globalStyles.centered}>
            <Text>Initializing Firebase...</Text>
        </View>
    );
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
} 
