/**
 * Platform-Agnostic usePermissions Hook
 * 
 * This hook accepts dependencies as parameters to work with both web-app and Android app.
 * Platform-specific adapters should inject their respective auth and subscription contexts.
 */

import { useMemo, useState, useEffect } from 'react';
import { 
  PermissionService,
  SystemRole,
  Permission,
  type UserProfile,
  type SubscriptionLimits,
  type PermissionEvaluationContext,
  type PermissionResult,
  type PermissionSummary,
  type CurrentCounts
} from '../permissions';

import type { DocumentData } from '../services/firebase/types';

/**
 * Interface for Firebase service (abstracted for platform compatibility)
 * 
 * This interface provides a simplified view of FirebaseService that focuses
 * on the getDocuments method needed for permission count calculations.
 */
export interface FirebaseServiceInterface {
  /**
   * Fetches documents from a Firestore collection
   * @param collection - The collection path
   * @param options - Query options including where clauses
   * @returns Array of document data (not FirebaseDocument wrappers)
   */
  getDocuments: <T extends DocumentData = DocumentData>(
    collection: string, 
    options?: { where?: [string, string, any][] }
  ) => Promise<T[]>;
}

/**
 * Parameters for the platform-agnostic usePermissions hook
 */
export interface UsePermissionsParams {
  userProfile: UserProfile | null;
  subscriptionLimits: SubscriptionLimits;
  firebaseService?: FirebaseServiceInterface | null;
  userId?: string | null;
}

/**
 * Platform-agnostic hook for managing user permissions
 * Provides clean, unified permission state and utilities
 */
export const usePermissionsShared = ({
  userProfile,
  subscriptionLimits,
  firebaseService,
  userId
}: UsePermissionsParams) => {
  // State for current counts
  const [currentCounts, setCurrentCounts] = useState<CurrentCounts>({
    shows: 0,
    boards: 0,
    props: 0,
    packingBoxes: 0,
    collaborators: 0
  });

  // Fetch current counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!userId || !firebaseService) {
        setCurrentCounts({
          shows: 0,
          boards: 0,
          props: 0,
          packingBoxes: 0,
          collaborators: 0
        });
        return;
      }

      try {
        // Fetch counts in parallel
        // Note: Different collections use different field names:
        // - props: use 'userId' (see Prop interface)
        // - shows: use 'ownerId' (see schema documentation)
        // - boards: use 'ownerId'
        // - packingBoxes: use 'ownerId'
        const [shows, boards, props, packingBoxes] = await Promise.all([
          firebaseService.getDocuments('shows', {
            where: [['ownerId', '==', userId]]
          }),
          firebaseService.getDocuments('todo_boards', {
            where: [['ownerId', '==', userId]]
          }),
          firebaseService.getDocuments('props', {
            where: [['userId', '==', userId]]  // Props use userId, not ownerId
          }),
          firebaseService.getDocuments('packingBoxes', {
            where: [['ownerId', '==', userId]]
          })
        ]);

        setCurrentCounts({
          shows: shows.length,
          boards: boards.length,
          props: props.length,
          packingBoxes: packingBoxes.length,
          collaborators: 0 // This would need to be calculated per show
        });
      } catch (error) {
        console.error('Error fetching current counts:', error);
        // Keep existing counts on error
      }
    };

    fetchCounts();
  }, [userId, firebaseService]);

  // Create permission context
  const permissionContext: PermissionEvaluationContext = useMemo(() => ({
    userProfile,
    subscriptionLimits,
    currentCounts
  }), [userProfile, subscriptionLimits, currentCounts]);

  // Get permission summary
  const permissionSummary: PermissionSummary = useMemo(() => {
    return PermissionService.getPermissionSummary(permissionContext);
  }, [permissionContext]);

  // Permission check function
  const canPerformAction = useMemo(() => {
    return (action: string): PermissionResult => {
      return PermissionService.canPerformAction(action, permissionContext);
    };
  }, [permissionContext]);

  // Role-based permission checks
  const hasRole = useMemo(() => {
    return (role: SystemRole): boolean => {
      return PermissionService.hasRole(userProfile, role);
    };
  }, [userProfile]);

  const hasMinimumRole = useMemo(() => {
    return (requiredRole: SystemRole): boolean => {
      return PermissionService.hasMinimumRole(userProfile, requiredRole);
    };
  }, [userProfile]);

  // Permission-based checks
  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      return PermissionService.hasPermission(userProfile, permission);
    };
  }, [userProfile]);

  // Subscription-based checks
  const canCreateResource = useMemo(() => {
    return (resourceType: keyof CurrentCounts, limitKey: keyof SubscriptionLimits): PermissionResult => {
      const currentCount = currentCounts[resourceType];
      return PermissionService.canCreateResource(userProfile, subscriptionLimits, currentCount, limitKey);
    };
  }, [userProfile, subscriptionLimits, currentCounts]);

  return {
    // Permission state
    isExempt: permissionSummary.isExempt,
    isValid: permissionSummary.isValid,
    roleDisplayName: permissionSummary.roleDisplayName,
    rolePriority: permissionSummary.rolePriority,
    
    // Subscription state
    effectiveLimits: permissionSummary.effectiveLimits,
    shouldShowSubscriptionNotifications: permissionSummary.shouldShowSubscriptionNotifications,
    currentCounts: permissionSummary.currentCounts,
    limits: permissionSummary.limits,
    
    // Capability flags
    canInviteTeamMembers: permissionSummary.canInviteTeamMembers,
    canViewAllProps: permissionSummary.canViewAllProps,
    
    // Permission check functions
    canPerformAction,
    hasRole,
    hasMinimumRole,
    hasPermission,
    canCreateResource,
    
    // Convenience methods
    isGod: () => hasRole(SystemRole.GOD),
    isAdmin: () => hasMinimumRole(SystemRole.ADMIN),
    isPropsSupervisor: () => hasMinimumRole(SystemRole.PROPS_SUPERVISOR),
    isEditor: () => hasMinimumRole(SystemRole.EDITOR),
    
    // Show-specific permissions (these would need show context)
    canAccessShow: (showOwnerId: string, showTeam?: Record<string, SystemRole>) => 
      PermissionService.canAccessShow(userProfile, showOwnerId, showTeam),
    canEditShow: (showOwnerId: string, showTeam?: Record<string, SystemRole>) => 
      PermissionService.canEditShow(userProfile, showOwnerId, showTeam),
    canDeleteShow: (showOwnerId: string, showTeam?: Record<string, SystemRole>) => 
      PermissionService.canDeleteShow(userProfile, showOwnerId, showTeam),
    canManageShowTeam: (showOwnerId: string, showTeam?: Record<string, SystemRole>) => 
      PermissionService.canManageShowTeam(userProfile, showOwnerId, showTeam)
  };
};

