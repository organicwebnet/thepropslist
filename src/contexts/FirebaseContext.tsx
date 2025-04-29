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
      console.log("[FirebaseProvider] Creating WebFirebaseService instance.");
      return new WebFirebaseService(); // Assuming Web is handled elsewhere for now
      // return null; // Or handle web properly if needed
    } else {
      console.log("[FirebaseProvider] Creating MobileFirebaseService instance.");
      return new MobileFirebaseService();
    }
  }, []);

  React.useEffect(() => {
    const initializeFirebase = async () => {
      if (!service) {
          console.log("[FirebaseProvider] No service instance created (likely web platform or issue).");
          // Decide how to handle this - maybe set error or different state
          setError(new Error("Firebase service not available for this platform."));
          return;
      }
      console.log("[FirebaseProvider] useEffect triggered. Attempting service initialization...");
      try {
        await service.initialize();
        console.log("[FirebaseProvider] service.initialize() completed successfully.");
        setIsInitialized(true);
        setError(null); // Clear any previous error
      } catch (err) {
        console.error('[FirebaseProvider] Error during service.initialize():', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize Firebase'));
        setIsInitialized(false); // Ensure initialization fails
      }
    };

    console.log("[FirebaseProvider] Calling initializeFirebase function inside useEffect.");
    initializeFirebase();
  }, [service]); // Dependency array ensures this runs once when service is created

  const value = React.useMemo(() => ({
    service: service!, // Using non-null assertion, ensure service exists if !error && isInitialized
    isInitialized,
    error
  }), [service, isInitialized, error]);

  if (error) {
    console.error("[FirebaseProvider] Rendering error state:", error.message);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Failed to initialize Firebase</Text>
        <Text style={{ color: 'red' }}>{error.message}</Text>
      </View>
    );
  }
  
  if (!isInitialized) {
    console.log("[FirebaseProvider] Rendering loading state (isInitialized: false).");
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Initializing Firebase...</Text>
        </View>
    );
  }

  console.log("[FirebaseProvider] Rendering children (Initialization complete).");
  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
} 