/**
 * Permission utility functions
 * Pure functions for permission logic
 */

import { 
  SystemRole, 
  UserProfile, 
  SubscriptionLimits, 
  PermissionEvaluationContext,
  PermissionResult,
  PermissionSummary,
  LimitStatus
} from './types';
import { 
  ROLE_HIERARCHY, 
  UNLIMITED_ROLES, 
  TEAM_INVITE_ROLES, 
  ALL_PROPS_VIEW_ROLES, 
  SYSTEM_ADMIN_GROUP,
  UNLIMITED_LIMITS,
  ROLE_DISPLAY_NAMES,
  MINIMUM_ROLE_REQUIREMENTS,
  PERMISSION_ERROR_MESSAGES
} from './constants';

// ============================================================================
// ROLE-BASED UTILITIES
// ============================================================================

/**
 * Check if user has unlimited access (exempt from all subscription limits)
 */
export const isUnlimitedUser = (userProfile: UserProfile | null): boolean => {
  if (!userProfile) return false;

  // Check role-based exemption
  const role = userProfile.role?.toLowerCase();
  if (role && UNLIMITED_ROLES.includes(role as SystemRole)) {
    return true;
  }

  // Check system admin group
  if (userProfile.groups?.[SYSTEM_ADMIN_GROUP] === true) {
    return true;
  }

  return false;
};

/**
 * Get role priority for comparison
 */
export const getRolePriority = (userProfile: UserProfile | null): number => {
  if (!userProfile?.role) return 0;
  return ROLE_HIERARCHY[userProfile.role as SystemRole] || 0;
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (userProfile: UserProfile | null): string => {
  if (!userProfile?.role) return 'Unknown';
  return ROLE_DISPLAY_NAMES[userProfile.role as SystemRole] || userProfile.role;
};

/**
 * Check if user has minimum required role
 */
export const hasMinimumRole = (
  userProfile: UserProfile | null, 
  requiredRole: SystemRole
): boolean => {
  if (!userProfile?.role) return false;
  return getRolePriority(userProfile) >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if user can invite team members
 */
export const canInviteTeamMembers = (userProfile: UserProfile | null): boolean => {
  if (!userProfile?.role) return false;
  return TEAM_INVITE_ROLES.includes(userProfile.role as SystemRole);
};

/**
 * Check if user can view all props across shows
 */
export const canViewAllProps = (userProfile: UserProfile | null): boolean => {
  if (!userProfile?.role) return false;
  return ALL_PROPS_VIEW_ROLES.includes(userProfile.role as SystemRole);
};

// ============================================================================
// SUBSCRIPTION-BASED UTILITIES
// ============================================================================

/**
 * Get effective limits for a user (unlimited if exempt, otherwise subscription limits)
 */
export const getEffectiveLimits = (
  userProfile: UserProfile | null, 
  subscriptionLimits: SubscriptionLimits
): SubscriptionLimits => {
  if (isUnlimitedUser(userProfile)) {
    return UNLIMITED_LIMITS;
  }
  return subscriptionLimits;
};

/**
 * Check if user should see subscription notifications
 */
export const shouldShowSubscriptionNotifications = (userProfile: UserProfile | null): boolean => {
  return !isUnlimitedUser(userProfile);
};

/**
 * Validate user profile
 */
export const validateUserProfile = (userProfile: UserProfile | null): boolean => {
  if (!userProfile) return false;
  if (!userProfile.uid || !userProfile.email) return false;
  return true;
};

// ============================================================================
// PERMISSION-BASED UTILITIES
// ============================================================================

/**
 * Check if user can perform a specific action
 */
export const canPerformAction = (
  action: string,
  context: PermissionEvaluationContext
): PermissionResult => {
  const { userProfile, subscriptionLimits, currentCounts } = context;
  const effectiveLimits = getEffectiveLimits(userProfile, subscriptionLimits);
  const isExempt = isUnlimitedUser(userProfile);

  // Check minimum role requirement
  const requiredRole = MINIMUM_ROLE_REQUIREMENTS[action];
  if (requiredRole && !hasMinimumRole(userProfile, requiredRole)) {
    return {
      allowed: false,
      reason: PERMISSION_ERROR_MESSAGES.INSUFFICIENT_ROLE,
      isExempt,
      effectiveLimits,
      requiredRole
    };
  }

  // Check specific action permissions
  switch (action) {
    case 'create_show':
      return {
        allowed: isExempt || currentCounts.shows < effectiveLimits.shows,
        reason: isExempt ? undefined : `Show limit reached (${currentCounts.shows}/${effectiveLimits.shows})`,
        isExempt,
        effectiveLimits
      };

    case 'create_board':
      return {
        allowed: isExempt || currentCounts.boards < effectiveLimits.boards,
        reason: isExempt ? undefined : `Board limit reached (${currentCounts.boards}/${effectiveLimits.boards})`,
        isExempt,
        effectiveLimits
      };

    case 'create_prop':
      return {
        allowed: isExempt || currentCounts.props < effectiveLimits.props,
        reason: isExempt ? undefined : `Props limit reached (${currentCounts.props}/${effectiveLimits.props})`,
        isExempt,
        effectiveLimits
      };

    case 'create_packing_box':
      return {
        allowed: isExempt || currentCounts.packingBoxes < effectiveLimits.packingBoxes,
        reason: isExempt ? undefined : `Packing boxes limit reached (${currentCounts.packingBoxes}/${effectiveLimits.packingBoxes})`,
        isExempt,
        effectiveLimits
      };

    case 'invite_team_member':
      return {
        allowed: canInviteTeamMembers(userProfile),
        reason: canInviteTeamMembers(userProfile) ? undefined : 'You need administrative privileges to invite team members',
        isExempt,
        effectiveLimits
      };

    case 'view_all_props':
      return {
        allowed: canViewAllProps(userProfile),
        reason: canViewAllProps(userProfile) ? undefined : 'You need elevated privileges to view all props',
        isExempt,
        effectiveLimits
      };

    case 'view_admin_features':
      return {
        allowed: isExempt || userProfile?.role === SystemRole.ADMIN,
        reason: isExempt || userProfile?.role === SystemRole.ADMIN ? undefined : 'You need admin privileges to view admin features',
        isExempt,
        effectiveLimits
      };

    case 'bypass_subscription_limits':
      return {
        allowed: isExempt,
        reason: isExempt ? undefined : 'You need unlimited role to bypass subscription limits',
        isExempt,
        effectiveLimits
      };

    default:
      return {
        allowed: false,
        reason: `Unknown action: ${action}`,
        isExempt,
        effectiveLimits
      };
  }
};

/**
 * Create limit status for a specific resource
 */
export const createLimitStatus = (
  current: number, 
  limit: number, 
  isExempt: boolean
): LimitStatus => ({
  current,
  limit,
  withinLimit: isExempt || current < limit,
  isExempt
});

/**
 * Get comprehensive permission summary
 */
export const getPermissionSummary = (context: PermissionEvaluationContext): PermissionSummary => {
  const { userProfile, subscriptionLimits, currentCounts } = context;
  const effectiveLimits = getEffectiveLimits(userProfile, subscriptionLimits);
  const isExempt = isUnlimitedUser(userProfile);

  return {
    isValid: validateUserProfile(userProfile),
    isExempt,
    effectiveLimits,
    canInviteTeamMembers: canInviteTeamMembers(userProfile),
    canViewAllProps: canViewAllProps(userProfile),
    shouldShowSubscriptionNotifications: shouldShowSubscriptionNotifications(userProfile),
    roleDisplayName: getRoleDisplayName(userProfile),
    rolePriority: getRolePriority(userProfile),
    currentCounts,
    limits: {
      shows: createLimitStatus(currentCounts.shows, effectiveLimits.shows, isExempt),
      boards: createLimitStatus(currentCounts.boards, effectiveLimits.boards, isExempt),
      props: createLimitStatus(currentCounts.props, effectiveLimits.props, isExempt),
      packingBoxes: createLimitStatus(currentCounts.packingBoxes, effectiveLimits.packingBoxes, isExempt)
    }
  };
};

// ============================================================================
// SHOW-SPECIFIC UTILITIES
// ============================================================================

/**
 * Check if user is show owner
 */
export const isShowOwner = (userProfile: UserProfile | null, showOwnerId: string): boolean => {
  return userProfile?.uid === showOwnerId;
};

/**
 * Check if user has team role in show
 */
export const hasTeamRole = (
  userProfile: UserProfile | null, 
  showTeam: Record<string, SystemRole> | undefined,
  requiredRole?: SystemRole
): boolean => {
  if (!userProfile?.uid || !showTeam) return false;
  
  const userTeamRole = showTeam[userProfile.uid];
  if (!userTeamRole) return false;
  
  if (requiredRole) {
    return getRolePriority({ role: userTeamRole } as UserProfile) >= ROLE_HIERARCHY[requiredRole];
  }
  
  return true;
};

/**
 * Check if user can access show resource
 */
export const canAccessShowResource = (
  userProfile: UserProfile | null,
  showOwnerId: string,
  showTeam: Record<string, SystemRole> | undefined,
  requiredRole?: SystemRole
): boolean => {
  // God users can access everything
  if (userProfile?.role === SystemRole.GOD) return true;
  
  // Show owners can access everything
  if (isShowOwner(userProfile, showOwnerId)) return true;
  
  // Team members with required role
  if (requiredRole) {
    return hasTeamRole(userProfile, showTeam, requiredRole);
  }
  
  // Any team member
  return hasTeamRole(userProfile, showTeam);
};

