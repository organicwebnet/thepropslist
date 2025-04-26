import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MobileFirebaseService } from '../platforms/mobile/services/firebase';
import { WebFirebaseService } from '../platforms/web/services/firebase';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthService } from '../shared/services/firebase/auth';
import { UserProfile, UserPermissions } from '../shared/types/auth';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const firebase = Platform.OS === 'web' ? new WebFirebaseService() : new MobileFirebaseService();
  const authService = new AuthService(firebase);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Core Firebase App initialization (Platform specific)
        // Assuming native setup now handles initialization - REMOVING MANUAL CALLS
        // await firebase.initialize(); 
        // console.log("Core Firebase App initialized (SKIPPED MANUAL CALL).");

        // Initialize service modules AFTER core app is initialized
        // Assuming services are available after native init - REMOVING MANUAL CALL
        // if (firebase.initializeService) { 
        //   await firebase.initializeService();
        // }

        // Setup auth listener AFTER initialization
        if (Platform.OS !== 'web') {
          unsubscribeAuth = auth().onAuthStateChanged(async (rnFirebaseUser: FirebaseAuthTypes.User | null) => {
            console.log("RN Auth state changed:", rnFirebaseUser?.uid);
            setUser(rnFirebaseUser as User | null);
            if (rnFirebaseUser) {
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
            setLoading(false);
            setIsInitialized(true);
          });
        } else {
          const webAuth = firebase.auth();
          unsubscribeAuth = webAuth.onAuthStateChanged(async (webUser: User | null) => {
            console.log("Web Auth state changed:", webUser?.uid);
            setUser(webUser);
            if (webUser) {
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
            setLoading(false);
            setIsInitialized(true);
          });
        }

      } catch (err) {
        console.error("Firebase initialization or service setup failed:", err);
        setError(err instanceof Error ? err : new Error('Failed to initialize auth or services'));
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initialize();

    return () => {
      if (unsubscribeAuth) {
        console.log("Unsubscribing auth listener.");
        unsubscribeAuth();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const profile = await authService.signIn(email, password);
      setProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    }
  };

  const hasPermission = async (permission: keyof UserPermissions): Promise<boolean> => {
    if (!user) return false;
    return authService.hasPermission(user.uid, permission);
  };

  const value = {
    user,
    profile,
    loading: loading || !isInitialized,
    error,
    signIn,
    signOut,
    hasPermission
  };

  if (!isInitialized) {
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