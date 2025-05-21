import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { /* Platform, View, Text, ActivityIndicator, StyleSheet */ } from 'react-native'; // StyleSheet might be needed if styles are restored
import { UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../shared/types/auth';
import { CustomUser } from '@/shared/services/firebase/types';
import { useFirebase } from './FirebaseContext'; // Uncommented
import { Address } from '@shared/types/address';
// import { FirebaseDocument } from '@/shared/services/firebase/types'; // Not needed for minimal
// import { arrayUnion, arrayRemove, doc, collection } from 'firebase/firestore'; // Not needed for minimal

interface AuthContextProps {
  user: CustomUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  permissions: Partial<UserPermissions>;
  refreshUserProfile: () => Promise<void>;
  addSavedAddress: (type: 'sender' | 'delivery', address: Omit<Address, 'id'>) => Promise<string | undefined>;
  updateSavedAddress: (type: 'sender' | 'delivery', address: Address) => Promise<void>;
  deleteSavedAddress: (type: 'sender' | 'delivery', addressId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseInitError } = useFirebase();
  const [user, setUser] = useState<CustomUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<Partial<UserPermissions>>(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});

  useEffect(() => {
    if (firebaseInitError) {
      setError(firebaseInitError);
      setLoading(false);
    }
  }, [firebaseInitError]);

  const fetchUserProfile = async (userId: string) => {
    if (!firebaseService) {
      setError(new Error("Firebase service not available for fetching profile."));
      setUserProfile(null);
      setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
      return;
    }
    try {
      console.log(`--- AuthProvider: Fetching profile for user: ${userId} ---`);
      // Assuming user profiles are stored in a 'users' collection
      // And firebaseService has a method like getDocument(collectionPath, documentId)
      // Adjust collectionPath and how you get data based on your FirebaseService implementation
      const profileDoc = await firebaseService.getDocument<UserProfile>('users', userId);
      
      if (profileDoc && profileDoc.data) {
        const profileData = profileDoc.data;
        console.log("--- AuthProvider: Profile fetched ---", profileData);
        setUserProfile(profileData);
        // Derive permissions from role, or use stored permissions if available
        const role = profileData.role || UserRole.VIEWER; // Ensure role is valid
        setPermissions(profileData.permissions || DEFAULT_ROLE_PERMISSIONS[role] || {});
      } else {
        console.warn(`--- AuthProvider: No profile found for user: ${userId}, creating default. ---`);
        // Optionally, create a default profile here if one doesn't exist
        // For now, set to null and default viewer permissions
        setUserProfile(null); 
        setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
        // setError(new Error(\`User profile not found for ${userId}\`));
      }
    } catch (e: any) {
      console.error("--- AuthProvider: Error fetching user profile ---", e);
      setError(new Error("Failed to fetch user profile: " + e.message));
      setUserProfile(null);
      setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
    }
  };

  useEffect(() => {
    if (!firebaseService || !firebaseInitialized) {
      // Firebase might not be ready yet, or failed to initialize
      if (firebaseInitialized && !firebaseService) { // Initialized but service is null (could be error)
          setError(firebaseInitError || new Error("Firebase service is not available after initialization."));
          setLoading(false);
      }
      // If not initialized, wait for firebaseInitialized to become true
      // If firebaseInitError is set, that will be handled by the other useEffect
      return;
    }

    setLoading(true);
    console.log("--- AuthProvider: Subscribing to onAuthStateChanged ---");
    const unsubscribe = firebaseService.auth().onAuthStateChanged(async (firebaseUser: CustomUser | null) => {
      console.log("--- AuthProvider: onAuthStateChanged triggered ---", firebaseUser ? firebaseUser.uid : 'No user');
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
        setError(null);
      } else {
        setUser(null);
        setUserProfile(null);
        setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
      }
      setLoading(false);
    });

    return () => {
      console.log("--- AuthProvider: Unsubscribing from onAuthStateChanged ---");
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseService, firebaseInitialized, firebaseInitError]);

  const refreshUserProfile = async () => {
    if (user) {
      setLoading(true);
      await fetchUserProfile(user.uid);
      setLoading(false);
    } else {
      console.warn("--- AuthProvider: refreshUserProfile called but no user is logged in. ---");
      // setError(new Error("No user is logged in to refresh profile."));
    }
  };
  
  const internalSignOut = async () => {
    if (!firebaseService) {
      setError(new Error("Firebase service not available for sign out."));
      return;
    }
    console.log("--- AuthProvider: Signing out ---");
    try {
      await firebaseService.signOut();
      // Auth state change will clear user and profile via onAuthStateChanged listener
    } catch (e: any) {
      console.error("--- AuthProvider: Sign out error ---", e);
      setError(new Error("Sign out failed: " + e.message));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        permissions,
        refreshUserProfile,
        addSavedAddress: async () => { console.log("Dummy addSavedAddress called"); return "dummy-addr-id"; },
        updateSavedAddress: async () => { console.log("Dummy updateSavedAddress called"); },
        deleteSavedAddress: async () => { console.log("Dummy deleteSavedAddress called"); },
        signOut: internalSignOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// const styles = StyleSheet.create({ // Not needed for minimal version
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// }); 