/**
 * Permission Service
 * Main service class for all permission operations
 * 
 * This service provides the 3 main functions:
 * 1. Role-based access control (RBAC) - Granular control by god for all user types
 * 2. Subscription-based access control - From Stripe metadata
 * 3. Permission-based access control - Granular permissions for specific actions
 */

import { 
  SystemRole,
  UserProfile, 
  SubscriptionLimits, 
  PermissionEvaluationContext, 
  PermissionSummary,
  PermissionResult,
  Permission
} from './types';
import { 
  isUnlimitedUser,
  getEffectiveLimits,
  canInviteTeamMembers,
  shouldShowSubscriptionNotifications,
  getRolePriority,
  getRoleDisplayName,
  validateUserProfile,
  canPerformAction,
  getPermissionSummary,
  canAccessShowResource
} from './utils';

/**
 * Permission Service
 * Centralized service for all permission operations
 */
export class PermissionService {
  
  // ============================================================================
  // 1. ROLE-BASED ACCESS CONTROL (RBAC)
  // ============================================================================
  
  /**
   * Check if user has a specific role
   */
  static hasRole(userProfile: UserProfile | null, role: SystemRole): boolean {
    return userProfile?.role === role;
  }

  /**
   * Check if user has minimum role level
   */
  static hasMinimumRole(userProfile: UserProfile | null, requiredRole: SystemRole): boolean {
    if (!userProfile?.role) return false;
    return getRolePriority(userProfile) >= getRolePriority({ role: requiredRole } as UserProfile);
  }

  /**
   * Check if user is god (highest level access)
   */
  static isGod(userProfile: UserProfile | null): boolean {
    return this.hasRole(userProfile, SystemRole.GOD);
  }

  /**
   * Check if user is admin or higher
   */
  static isAdmin(userProfile: UserProfile | null): boolean {
    return this.hasMinimumRole(userProfile, SystemRole.ADMIN);
  }

  /**
   * Check if user can manage other users
   */
  static canManageUsers(userProfile: UserProfile | null): boolean {
    return this.hasMinimumRole(userProfile, SystemRole.ADMIN);
  }

  /**
   * Check if user can assign roles
   */
  static canAssignRoles(userProfile: UserProfile | null): boolean {
    return this.hasMinimumRole(userProfile, SystemRole.ADMIN);
  }

  // ============================================================================
  // 2. SUBSCRIPTION-BASED ACCESS CONTROL
  // ============================================================================

  /**
   * Check if user is exempt from subscription limits
   */
  static isExemptFromLimits(userProfile: UserProfile | null): boolean {
    return isUnlimitedUser(userProfile);
  }

  /**
   * Get effective subscription limits for user
   */
  static getEffectiveLimits(
    userProfile: UserProfile | null, 
    subscriptionLimits: SubscriptionLimits
  ): SubscriptionLimits {
    return getEffectiveLimits(userProfile, subscriptionLimits);
  }

  /**
   * Check if user can create more of a specific resource
   */
  static canCreateResource(
    userProfile: UserProfile | null,
    subscriptionLimits: SubscriptionLimits,
    currentCount: number,
    limitKey: keyof SubscriptionLimits
  ): PermissionResult {
    const effectiveLimits = this.getEffectiveLimits(userProfile, subscriptionLimits);
    const isExempt = this.isExemptFromLimits(userProfile);
    const limit = effectiveLimits[limitKey] as number;

    return {
      allowed: isExempt || currentCount < limit,
      reason: isExempt ? undefined : `${limitKey} limit reached (${currentCount}/${limit})`,
      isExempt,
      effectiveLimits
    };
  }

  /**
   * Check if user should see subscription notifications
   */
  static shouldShowSubscriptionNotifications(userProfile: UserProfile | null): boolean {
    return shouldShowSubscriptionNotifications(userProfile);
  }

  // ============================================================================
  // 3. PERMISSION-BASED ACCESS CONTROL
  // ============================================================================

  /**
   * Check if user can perform a specific action
   */
  static canPerformAction(
    action: string,
    context: PermissionEvaluationContext
  ): PermissionResult {
    return canPerformAction(action, context);
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(
    userProfile: UserProfile | null,
    permission: Permission
  ): boolean {
    // For now, we'll use role-based checks for permissions
    // This can be extended to support custom permission assignments
    
    switch (permission) {
      case Permission.MANAGE_USERS:
        return this.canManageUsers(userProfile);
      
      case Permission.ASSIGN_ROLES:
        return this.canAssignRoles(userProfile);
      
      case Permission.CREATE_SHOWS:
        return this.hasMinimumRole(userProfile, SystemRole.EDITOR);
      
      case Permission.EDIT_SHOWS:
        return this.hasMinimumRole(userProfile, SystemRole.EDITOR);
      
      case Permission.DELETE_SHOWS:
        return this.hasMinimumRole(userProfile, SystemRole.ADMIN);
      
      case Permission.INVITE_TEAM_MEMBERS:
        return canInviteTeamMembers(userProfile);
      
      case Permission.CREATE_PROPS:
        return this.hasMinimumRole(userProfile, SystemRole.EDITOR);
      
      case Permission.EDIT_PROPS:
        return this.hasMinimumRole(userProfile, SystemRole.EDITOR);
      
      case Permission.DELETE_PROPS:
        return this.hasMinimumRole(userProfile, SystemRole.PROPS_SUPERVISOR);
      
      case Permission.VIEW_PROPS:
        return this.hasMinimumRole(userProfile, SystemRole.VIEWER);
      
      case Permission.ACCESS_ADMIN_PANEL:
        return this.hasMinimumRole(userProfile, SystemRole.ADMIN);
      
      default:
        return false;
    }
  }

  // ============================================================================
  // UNIFIED PERMISSION EVALUATION
  // ============================================================================

  /**
   * Get comprehensive permission summary for a user
   */
  static getPermissionSummary(context: PermissionEvaluationContext): PermissionSummary {
    return getPermissionSummary(context);
  }

  /**
   * Evaluate permission for a specific action with full context
   */
  static evaluatePermission(
    action: string,
    context: PermissionEvaluationContext
  ): PermissionResult {
    return this.canPerformAction(action, context);
  }

  // ============================================================================
  // SHOW-SPECIFIC PERMISSIONS
  // ============================================================================

  /**
   * Check if user can access a show
   */
  static canAccessShow(
    userProfile: UserProfile | null,
    showOwnerId: string,
    showTeam: Record<string, SystemRole> | undefined
  ): boolean {
    return canAccessShowResource(userProfile, showOwnerId, showTeam);
  }

  /**
   * Check if user can edit a show
   */
  static canEditShow(
    userProfile: UserProfile | null,
    showOwnerId: string,
    showTeam: Record<string, SystemRole> | undefined
  ): boolean {
    return canAccessShowResource(userProfile, showOwnerId, showTeam, SystemRole.EDITOR);
  }

  /**
   * Check if user can delete a show
   */
  static canDeleteShow(
    userProfile: UserProfile | null,
    showOwnerId: string,
    showTeam: Record<string, SystemRole> | undefined
  ): boolean {
    return canAccessShowResource(userProfile, showOwnerId, showTeam, SystemRole.ADMIN);
  }

  /**
   * Check if user can manage team for a show
   */
  static canManageShowTeam(
    userProfile: UserProfile | null,
    showOwnerId: string,
    showTeam: Record<string, SystemRole> | undefined
  ): boolean {
    return canAccessShowResource(userProfile, showOwnerId, showTeam, SystemRole.PROPS_SUPERVISOR);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get user's role display name
   */
  static getRoleDisplayName(userProfile: UserProfile | null): string {
    return getRoleDisplayName(userProfile);
  }

  /**
   * Get user's role priority
   */
  static getRolePriority(userProfile: UserProfile | null): number {
    return getRolePriority(userProfile);
  }

  /**
   * Validate user profile
   */
  static validateUserProfile(userProfile: UserProfile | null): boolean {
    return validateUserProfile(userProfile);
  }

  /**
   * Check if user profile is valid and has required fields
   */
  static isUserProfileValid(userProfile: UserProfile | null): boolean {
    return this.validateUserProfile(userProfile);
  }
}