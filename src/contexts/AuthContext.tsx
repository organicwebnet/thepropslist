import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { /* Platform, View, Text, ActivityIndicator, StyleSheet */ } from 'react-native'; // StyleSheet might be needed if styles are restored
// import { User } from 'firebase/auth'; // Removed unused User import
import { UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../shared/types/auth.ts';
import { CustomUser } from '../shared/services/firebase/types.ts';
import { useFirebase } from './FirebaseContext.tsx';
import { Address } from '../shared/types/address.ts';
// import { FirebaseDocument } from '@/shared/services/firebase/types'; // Not needed for minimal
// import { arrayUnion, arrayRemove, doc, collection } from 'firebase/firestore'; // Not needed for minimal

type AuthStatus = 'pending' | 'in' | 'out';

interface AuthContextProps {
  user: CustomUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  status: AuthStatus;
  error: Error | null;
  permissions: Partial<UserPermissions>;
  refreshUserProfile: () => Promise<void>;
  addSavedAddress: (type: 'sender' | 'delivery', address: Omit<Address, 'id'>) => Promise<string | undefined>;
  updateSavedAddress: (type: 'sender' | 'delivery', address: Address) => Promise<void>;
  deleteSavedAddress: (type: 'sender' | 'delivery', addressId: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  isGoogleSignIn: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { service: firebaseService, isInitialized: firebaseInitialized, error: firebaseInitError } = useFirebase();
  const [user, setUser] = useState<CustomUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('pending');
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<Partial<UserPermissions>>(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
  const [isGoogleSignIn, setIsGoogleSignIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (firebaseInitError) {
      setError(firebaseInitError);
      setStatus('out');
    }
  }, [firebaseInitError]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!firebaseService) {
      setError(new Error("Firebase service not available for fetching profile."));
      setUserProfile(null);
      setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
      return;
    }
    try {
      // Corrected to fetch from 'userProfiles' to match firestore.rules
      const profileDoc = await firebaseService.getDocument<UserProfile>('userProfiles', userId);
      
      if (profileDoc && profileDoc.data) {
        const profileData = profileDoc.data;
        setUserProfile(profileData);
        const role = profileData.role || UserRole.VIEWER;
        setPermissions(profileData.permissions || DEFAULT_ROLE_PERMISSIONS[role] || {});
      } else {
        // If no profile exists, create a new one.
        const newProfile: Omit<UserProfile, 'id'> = {
          email: user?.email || '',
          displayName: user?.displayName || 'New User',
          role: UserRole.EDITOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.EDITOR],
        };
        // Use setDocument to create the profile with the user's UID as the document ID
        await firebaseService.setDocument('userProfiles', userId, newProfile);
        setUserProfile({ ...newProfile, id: userId });
        setPermissions(newProfile.permissions || {});
      }
    } catch (e: any) {
      setError(new Error("Failed to fetch user profile: " + e.message));
      setUserProfile(null);
      setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
    }
  }, [firebaseService, user]);

  useEffect(() => {
    if (!firebaseService || !firebaseInitialized) {
      // Firebase might not be ready yet, or failed to initialize
      if (firebaseInitialized && !firebaseService) { // Initialized but service is null (could be error)
          setError(firebaseInitError || new Error("Firebase service is not available after initialization."));
          setStatus('out');
      }
      // If not initialized, wait for firebaseInitialized to become true
      // If firebaseInitError is set, that will be handled by the other useEffect
      return;
    }

    const unsubscribe = firebaseService.auth.onAuthStateChanged(async (firebaseUser: CustomUser | null) => {
      if (firebaseUser) {
        // Get custom claims
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          setIsAdmin(!!idTokenResult.claims.admin);

          setUser(firebaseUser);
          const googleProvider = firebaseUser.providerData.find(p => p.providerId === 'google.com');
          setIsGoogleSignIn(!!googleProvider);
          await fetchUserProfile(firebaseUser.uid);
          setError(null);
          setStatus('in');
        } catch (e: any) {
          console.error("Error during auth state change processing:", e);
          setError(e);
          setStatus('out');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setPermissions(DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER] || {});
        setIsGoogleSignIn(false);
        setIsAdmin(false);
        setStatus('out');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseService, firebaseInitialized, firebaseInitError, fetchUserProfile]);

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      setStatus('pending');
      await fetchUserProfile(user.uid);
      setStatus('in');
    } else {
      // setError(new Error("No user is logged in to refresh profile."));
    }
  }, [user, fetchUserProfile]);
  
  const internalSignOut = useCallback(async () => {
    if (!firebaseService) {
      setError(new Error("Firebase service not available for sign out."));
      return;
    }
    try {
      await firebaseService.signOut();
      // Auth state change will clear user and profile via onAuthStateChanged listener
    } catch (e: any) {
      setError(new Error("Sign out failed: " + e.message));
    }
  }, [firebaseService]);

  const updateUserProfile = useCallback(async (updatedData: Partial<UserProfile>) => {
    if (!user || !firebaseService?.updateDocument) {
      throw new Error("User not logged in or Firebase service unavailable.");
    }

    // Data for Firebase Auth update (only displayName and photoURL)
    const authUpdateData: { displayName?: string | null; photoURL?: string | null; email?: string | null } = {};
    if (updatedData.displayName !== undefined) {
      authUpdateData.displayName = updatedData.displayName;
    }
    if (updatedData.photoURL !== undefined) {
      authUpdateData.photoURL = updatedData.photoURL;
    }
    // Email update is handled separately due to sensitivity and different method call

    try {
      // Step 1a: Update Firebase Auth email if changed and not Google Sign-In
      if (updatedData.email && updatedData.email !== user.email && !isGoogleSignIn) {
        if (user && typeof (user as any).updateEmail === 'function') {
          await (user as any).updateEmail(updatedData.email);
          // Note: Firebase Auth usually requires re-authentication for email changes.
          // The .updateEmail() method itself might throw an error if re-auth is needed.
        } else {
          // console.warn("--- AuthProvider: user.updateEmail is not available. Skipping Auth email update.");
        }
      }

      // Step 1b: Update Firebase Auth profile (displayName, photoURL)
      const profileAuthUpdates: { displayName?: string | null; photoURL?: string | null } = {};
      if (updatedData.displayName !== undefined) profileAuthUpdates.displayName = updatedData.displayName;
      if (updatedData.photoURL !== undefined) profileAuthUpdates.photoURL = updatedData.photoURL;

      if (Object.keys(profileAuthUpdates).length > 0) {
        if (user && typeof (user as any).updateProfile === 'function') {
          await (user as any).updateProfile(profileAuthUpdates);
        } else {
          // console.warn("--- AuthProvider: user.updateProfile is not available. Skipping Auth profile update.");
        }
      }

      // Step 2: Update Firestore 'userProfiles' document
      const firestoreUpdateData: Partial<UserProfile> = { ...updatedData };
      if (updatedData.email && isGoogleSignIn) {
        // Prevent accidental update of email in Firestore if it's a Google account and somehow email was passed
        // Firebase Auth is the source of truth for email for federated providers.
        delete firestoreUpdateData.email;
        // console.warn("--- AuthProvider: Attempted to update email for Google Sign-In user in Firestore. Ignoring email field for Firestore update.");
      }
      firestoreUpdateData.updatedAt = new Date();

      await firebaseService.updateDocument('userProfiles', user.uid, firestoreUpdateData);

      // Step 3: Refresh the local userProfile state from Firestore
      await fetchUserProfile(user.uid);
      // If email was changed in Auth, the user object might need explicit refresh or onAuthStateChanged will handle it.
      // Forcing a refresh of the user object from auth is tricky without re-triggering onAuthStateChanged manually.
      // Assuming for now that if updateEmail succeeded, the user object in state will reflect it or soon will.

    } catch (e: any) {
      // More specific error handling could be added here
      if (e.message.includes("requires a recent login")) {
        throw new Error("Updating sensitive profile data requires a recent login. Please sign out and sign back in.");
      }
      throw new Error("Failed to update user profile: " + e.message);
    }
  }, [user, firebaseService, fetchUserProfile, isGoogleSignIn]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAdmin,
        loading: status === 'pending',
        status,
        error,
        permissions,
        refreshUserProfile,
        addSavedAddress: (_type, _address) => Promise.resolve("dummy-addr-id"),
        updateSavedAddress: (_type, _address) => Promise.resolve(),
        deleteSavedAddress: (_type, _addressId) => Promise.resolve(),
        signOut: internalSignOut,
        updateUserProfile,
        isGoogleSignIn,
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