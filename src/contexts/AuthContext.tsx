import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { WebFirebaseService } from '../platforms/web/services/firebase';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const firebase = new WebFirebaseService();
  const authService = new AuthService(firebase);

  useEffect(() => {
    const initialize = async () => {
      try {
        await firebase.initialize();
        
        // Set up auth state listener
        const auth = firebase.auth();
        const unsubscribe = auth.onAuthStateChanged(async (rnFirebaseUser: FirebaseAuthTypes.User | null) => {
          setUser(rnFirebaseUser as User | null);
          if (rnFirebaseUser) {
            const profile = await authService.getUserProfile(rnFirebaseUser.uid);
            setProfile(profile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize auth'));
        setLoading(false);
      }
    };

    initialize();
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
    loading,
    error,
    signIn,
    signOut,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 