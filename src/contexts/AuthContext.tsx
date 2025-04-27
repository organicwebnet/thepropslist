import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthService } from '../shared/services/firebase/auth';
import { UserProfile, UserPermissions } from '../shared/types/auth';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useFirebase } from './FirebaseContext';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof UserPermissions) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  
  const authService = React.useMemo(() => {
    if (firebaseInitialized && firebaseService) {
      return new AuthService(firebaseService);
    }
    return null;
  }, [firebaseInitialized, firebaseService]);

  useEffect(() => {
    if (!firebaseInitialized || !authService) {
      if (firebaseError) {
        console.error("Error from FirebaseProvider:", firebaseError);
        setAuthError(firebaseError);
        setAuthLoading(false);
      }
      setAuthLoading(true); 
      return;
    }

    let unsubscribeAuth: (() => void) | undefined;
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (Platform.OS !== 'web') {
        unsubscribeAuth = auth().onAuthStateChanged(async (rnFirebaseUser: FirebaseAuthTypes.User | null) => {
          console.log("RN Auth state changed:", rnFirebaseUser?.uid);
          setUser(rnFirebaseUser as User | null);
          if (rnFirebaseUser && authService) {
            try {
              const userProfile = await authService.getUserProfile(rnFirebaseUser.uid);
              setProfile(userProfile);
            } catch (profileError) {
              console.error("Error fetching profile:", profileError);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
          setAuthLoading(false);
        });
      } else {
        const webAuth = firebaseService.auth();
        unsubscribeAuth = webAuth.onAuthStateChanged(async (webUser: User | null) => {
          console.log("Web Auth state changed:", webUser?.uid);
          setUser(webUser);
          if (webUser && authService) {
            try {
              const userProfile = await authService.getUserProfile(webUser.uid);
              setProfile(userProfile);
            } catch (profileError) {
              console.error("Error fetching profile:", profileError);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
          setAuthLoading(false);
        });
      }
    } catch (err) {
      console.error("Auth listener setup failed:", err);
      setAuthError(err instanceof Error ? err : new Error('Failed to setup auth listener'));
      setAuthLoading(false);
    }

    return () => {
      if (unsubscribeAuth) {
        console.log("Unsubscribing auth listener.");
        unsubscribeAuth();
      }
    };
  }, [firebaseInitialized, firebaseService, authService, firebaseError]);

  const signIn = async (email: string, password: string) => {
    if (!authService) throw new Error("Auth service not ready");
    try {
      const profile = await authService.signIn(email, password);
      setProfile(profile);
    } catch (err) {
      setAuthError(err instanceof Error ? err : new Error('Failed to sign in'));
      throw err;
    }
  };

  const signOut = async () => {
    if (!authService) throw new Error("Auth service not ready");
    try {
      await authService.signOut();
      setProfile(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    }
  };

  const hasPermission = async (permission: keyof UserPermissions): Promise<boolean> => {
    if (!user || !authService) return false;
    return authService.hasPermission(user.uid, permission);
  };

  const value = {
    user,
    profile,
    loading: authLoading || !firebaseInitialized,
    error: authError || firebaseError,
    signIn,
    signOut,
    hasPermission
  };

  if (!firebaseInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Initializing Firebase...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 