/**
 * Web-App usePermissions Hook
 * 
 * Adapter that wraps the shared usePermissions hook and injects web-app-specific context
 */

import { useMemo } from 'react';
import { usePermissionsShared } from '../../../src/shared/hooks/usePermissions';
import { createFirebaseAdapter } from '../../../src/shared/hooks/createFirebaseAdapter';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useSubscription } from './useSubscription';
import { useFirebase } from '../contexts/FirebaseContext';

/**
 * Hook for managing user permissions in web-app
 * 
 * This is a platform-specific adapter that wraps the shared usePermissions hook
 * and injects web-app-specific context (WebAuthContext, FirebaseContext, Subscription).
 * 
 * @returns Permission state and utilities from the shared hook
 */
export const usePermissions = () => {
  const { userProfile, user } = useWebAuth();
  const { limits: subscriptionLimits } = useSubscription();
  const { service: firebaseService } = useFirebase();

  // Create adapter using shared utility to reduce duplication
  // Memoise to prevent infinite loops in usePermissionsShared
  // Type assertion needed because web and mobile FirebaseService types differ slightly
  const firebaseServiceAdapter = useMemo(
    () => createFirebaseAdapter(firebaseService as any),
    [firebaseService]
  );

  return usePermissionsShared({
    userProfile: userProfile || null,
    subscriptionLimits,
    firebaseService: firebaseServiceAdapter,
    userId: user?.uid || null
  });
};
