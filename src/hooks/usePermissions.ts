/**
 * Android App usePermissions Hook
 * 
 * Adapter that wraps the shared usePermissions hook and injects Android-specific context
 */

import { useMemo } from 'react';
import { usePermissionsShared } from '../shared/hooks/usePermissions';
import { createFirebaseAdapter } from '../shared/hooks/createFirebaseAdapter';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { useSubscription } from './useSubscription';
import type { UserProfile as PermissionUserProfile } from '../shared/permissions/types';

/**
 * Hook for managing user permissions in Android app
 * 
 * This is a platform-specific adapter that wraps the shared usePermissions hook
 * and injects Android-specific context (AuthContext, FirebaseContext, Subscription).
 * 
 * @returns Permission state and utilities from the shared hook
 */

export const usePermissions = () => {
  const { userProfile, user } = useAuth();
  const { limits: subscriptionLimits } = useSubscription();
  const { service: firebaseService } = useFirebase();

  // Create adapter using shared utility to reduce duplication
  // Memoise to prevent infinite loops in usePermissionsShared
  const firebaseServiceAdapter = useMemo(
    () => createFirebaseAdapter(firebaseService as any), // Type assertion needed for platform compatibility
    [firebaseService]
  );

  // Map auth UserProfile (has 'id') to permission UserProfile (has 'uid')
  const permissionUserProfile: PermissionUserProfile | null = useMemo(() => {
    if (!userProfile || !user) return null;
    
    // Map auth UserProfile to permission UserProfile format
    return {
      uid: userProfile.id || user.uid,
      email: userProfile.email || user.email || '',
      displayName: userProfile.displayName || undefined, // Permission UserProfile uses undefined, not null
      role: userProfile.role as any, // Role types may differ slightly
      photoURL: userProfile.photoURL,
      createdAt: userProfile.createdAt,
      lastLogin: userProfile.updatedAt, // Map updatedAt to lastLogin
      // Add other fields as needed
    };
  }, [userProfile, user]);

  return usePermissionsShared({
    userProfile: permissionUserProfile,
    subscriptionLimits,
    firebaseService: firebaseServiceAdapter,
    userId: user?.uid || null
  });
};

