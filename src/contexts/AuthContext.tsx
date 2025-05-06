import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { User as FirebaseUser } from 'firebase/auth'; // Will rely on CustomUser from shared types
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
// import { AuthService } from '../shared/services/firebase/auth'; // This seems to be an old/unused import for AuthService class, not the firebase auth instance itself.
import { UserProfile, UserPermissions, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../shared/types/auth';
// import { FirebaseAuthTypes } from '@react-native-firebase/auth'; // REMOVED, use CustomUser

import { useFirebase } from './FirebaseContext';
import { Address } from '@shared/types/address';
import { FirebaseDocument, CustomUser } from '@/shared/services/firebase/types'; // Added CustomUser
import { arrayUnion, arrayRemove, doc, collection } from 'firebase/firestore';

interface AuthContextProps {
  user: CustomUser | null; // Changed to CustomUser
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  permissions: Partial<UserPermissions>;
  refreshUserProfile: () => Promise<void>;
  addSavedAddress: (type: 'sender' | 'delivery', address: Omit<Address, 'id'>) => Promise<string | undefined>;
  updateSavedAddress: (type: 'sender' | 'delivery', address: Address) => Promise<void>;
  deleteSavedAddress: (type: 'sender' | 'delivery', addressId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { service, isInitialized: firebaseInitialized, error: firebaseError } = useFirebase();
  const [user, setUser] = useState<CustomUser | null>(null); // Changed to CustomUser
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<Partial<UserPermissions>>({});

  const fetchUserProfile = async (firebaseUser: CustomUser | null) => { // Changed to CustomUser
    if (!firebaseUser || !firebaseUser.uid || !service?.getDocument) { // Added check for firebaseUser.uid
      setUserProfile(null);
      setPermissions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log(`[AuthContext] Fetching profile for user: ${firebaseUser.uid}`);
      const profileDoc = await service.getDocument<UserProfile>('userProfiles', firebaseUser.uid);

      if (profileDoc?.data) {
        console.log('[AuthContext] Profile found:', profileDoc.data);
        const profileData = profileDoc.data;
        setUserProfile(profileData);
        
        // Determine permissions based on role or specific permissions field
        const userPerms = profileData.permissions || DEFAULT_ROLE_PERMISSIONS[profileData.role || UserRole.VIEWER] || {};
        setPermissions(userPerms);
      } else {
        console.log('[AuthContext] No profile found for user, creating default.');
        // If no profile exists, create a default one (e.g., with Viewer role)
        const defaultProfile: UserProfile = {
          id: firebaseUser.uid, // uid should be safe here after the check above
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL || undefined, // photoURL might be optional or named differently
          role: UserRole.VIEWER, // Default role
          permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER],
          createdAt: new Date(),
          updatedAt: new Date(),
          savedSenderAddresses: [], // Initialize empty arrays
          savedDeliveryAddresses: [],
        };
        await service.setDocument('userProfiles', firebaseUser.uid, defaultProfile);
        setUserProfile(defaultProfile);
        setPermissions(defaultProfile.permissions || {});
        console.log('[AuthContext] Default profile created.');
      }
    } catch (err) {
      console.error("Error fetching/creating user profile:", err);
      setError(err instanceof Error ? err : new Error('Failed to load user profile'));
      setUserProfile(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only set up the listener if Firebase is initialized and the service is available
    if (!firebaseInitialized || !service?.auth || firebaseError) {
      console.log(`[AuthContext] Firebase not ready (initialized: ${firebaseInitialized}, service: ${!!service?.auth}, error: ${!!firebaseError}). Auth listener WILL NOT be set up yet.`);
      // If Firebase isn't initialized, and there's no user yet, ensure loading completes to avoid hanging.
      // If there was a firebaseError, we might not want to clear loading here unless we handle that state explicitly.
      if (!user && !firebaseError) {
          setLoading(false);
      }
      return; // Do not proceed to set up the listener
    }

    setLoading(true); 
    console.log("[AuthContext] Firebase IS INITIALIZED. Setting up onAuthStateChanged listener using service.auth().");
    const unsubscribe = service.auth().onAuthStateChanged(async (firebaseUser: CustomUser | null) => { // Added parentheses to service.auth()
      console.log('[AuthContext] Auth state changed via service.auth():', firebaseUser?.uid);
      setUser(firebaseUser);
      await fetchUserProfile(firebaseUser); // Parameter type changed here too
    });
    return () => unsubscribe();
  }, [service, firebaseInitialized, firebaseError]);

  const refreshUserProfile = async () => {
    await fetchUserProfile(user); // Re-fetch using the current user object
  };

  // --- Address Management Functions --- 

  const addSavedAddress = async (type: 'sender' | 'delivery', addressData: Omit<Address, 'id'>): Promise<string | undefined> => {
    if (!user || !service?.updateDocument || !service.firestore) throw new Error("User not logged in or service unavailable.");
    
    const newId = doc(collection(service.firestore(), 'userProfiles')).id; // Generate Firestore ID
    const newAddress: Address = { ...addressData, id: newId };
    const fieldToUpdate = type === 'sender' ? 'savedSenderAddresses' : 'savedDeliveryAddresses';

    try {
      await service.updateDocument('userProfiles', user.uid, {
        [fieldToUpdate]: arrayUnion(newAddress) // Use arrayUnion to add
      });
      await refreshUserProfile(); // Refresh profile state after update
      return newId;
    } catch (err) {
      console.error(`Error adding ${type} address:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to add ${type} address`));
      return undefined;
    }
  };

  const updateSavedAddress = async (type: 'sender' | 'delivery', updatedAddress: Address): Promise<void> => {
     if (!user || !service?.firestore || !userProfile) throw new Error("User/profile not available or service unavailable.");
     
     const fieldName = type === 'sender' ? 'savedSenderAddresses' : 'savedDeliveryAddresses';
     const currentAddresses = userProfile[fieldName] || [];

     // Create a new array with the updated address
     const newAddresses = currentAddresses.map(addr => 
       addr.id === updatedAddress.id ? updatedAddress : addr
     );

     // Check if the address was actually found and updated
     if (JSON.stringify(newAddresses) === JSON.stringify(currentAddresses)) {
        console.warn(`Address with ID ${updatedAddress.id} not found in ${fieldName}, cannot update.`);
        throw new Error(`Address not found for update.`);
     }

     try {
       // Overwrite the entire array with the new one
       await service.updateDocument('userProfiles', user.uid, {
         [fieldName]: newAddresses 
       });
       await refreshUserProfile(); // Refresh profile state
     } catch (err) {
       console.error(`Error updating ${type} address:`, err);
       setError(err instanceof Error ? err : new Error(`Failed to update ${type} address`));
       throw err; // Re-throw to signal failure
     }
  };

  const deleteSavedAddress = async (type: 'sender' | 'delivery', addressId: string): Promise<void> => {
    if (!user || !service?.firestore || !userProfile) throw new Error("User/profile not available or service unavailable.");

    const fieldName = type === 'sender' ? 'savedSenderAddresses' : 'savedDeliveryAddresses';
    const currentAddresses = userProfile[fieldName] || [];
    
    // Find the address to remove
    const addressToRemove = currentAddresses.find(addr => addr.id === addressId);

    if (!addressToRemove) {
       console.warn(`Address with ID ${addressId} not found in ${fieldName}, cannot delete.`);
       throw new Error(`Address not found for deletion.`);
    }

    try {
      await service.updateDocument('userProfiles', user.uid, {
        [fieldName]: arrayRemove(addressToRemove) // Use arrayRemove
      });
      await refreshUserProfile(); // Refresh profile state
    } catch (err) {
      console.error(`Error deleting ${type} address:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to delete ${type} address`));
      throw err; // Re-throw to signal failure
    }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        userProfile, 
        loading, 
        error, 
        permissions,
        refreshUserProfile, 
        addSavedAddress, 
        updateSavedAddress,
        deleteSavedAddress
    }}>
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 