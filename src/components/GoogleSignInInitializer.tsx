import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { googleSignInService } from '../services/GoogleSignInService';

interface GoogleSignInInitializerProps {
  children: React.ReactNode;
}

export const GoogleSignInInitializer: React.FC<GoogleSignInInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleSignIn = async () => {
      try {
        await googleSignInService.configure();
        setIsInitialized(true);
        setError(null);
      } catch (err: any) {
        console.warn('Google Sign-In configuration failed:', err.message);
        // Don't block the app if Google Sign-In fails to configure
        // The user can still use email/password authentication
        setIsInitialized(true);
        setError(err.message);
      }
    };

    initializeGoogleSignIn();
  }, []);

  // Always render children, even if Google Sign-In fails to initialize
  // This ensures the app continues to work with other authentication methods
  return <>{children}</>;
};
