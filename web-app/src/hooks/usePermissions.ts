/**
 * usePermissions Hook
 * 
 * Main hook for accessing the 3-tier permission system:
 * 1. Role-based access control (RBAC)
 * 2. Subscription-based access control
 * 3. Permission-based access control
 */

import { useMemo, useState, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useSubscription } from './useSubscription';
import { useFirebase } from '../contexts/FirebaseContext';
import { 
  PermissionService,
  SystemRole,
  Permission,
  type PermissionEvaluationContext,
  type PermissionResult,
  type PermissionSummary,
  type CurrentCounts
} from '../core/permissions';

/**
 * Hook for managing user permissions
 * Provides clean, unified permission state and utilities
 */
export const usePermissions = () => {
  const { userProfile } = useWebAuth();
  const { limits: subscriptionLimits } = useSubscription();
  const { service: firebaseService } = useFirebase();

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
      if (!userProfile?.uid) {
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
        const [shows, boards, props, packingBoxes] = await Promise.all([
          firebaseService.getDocuments('shows', {
            where: [['ownerId', '==', userProfile.uid]]
          }),
          firebaseService.getDocuments('todo_boards', {
            where: [['ownerId', '==', userProfile.uid]]
          }),
          firebaseService.getDocuments('props', {
            where: [['ownerId', '==', userProfile.uid]]
          }),
          firebaseService.getDocuments('packingBoxes', {
            where: [['ownerId', '==', userProfile.uid]]
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
  }, [userProfile?.uid, firebaseService]);

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
    return (resourceType: keyof CurrentCounts, limitKey: keyof typeof subscriptionLimits): PermissionResult => {
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