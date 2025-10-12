/**
 * Permission constants and configuration
 * Centralized configuration for all permission logic
 */

import { SystemRole, SubscriptionPlan, Permission } from './types';

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================

// Role hierarchy (higher number = higher privilege)
export const ROLE_HIERARCHY: Record<SystemRole, number> = {
  [SystemRole.GOD]: 100,
  [SystemRole.ADMIN]: 90,
  [SystemRole.PROPS_SUPERVISOR]: 80,
  [SystemRole.EDITOR]: 70,
  [SystemRole.VIEWER]: 60,
  [SystemRole.PROPS_CARPENTER]: 50,
  [SystemRole.GUEST]: 10
};

// Roles that are completely exempt from all subscription limits
export const UNLIMITED_ROLES: readonly SystemRole[] = [
  SystemRole.GOD,
  SystemRole.ADMIN,
  SystemRole.PROPS_SUPERVISOR
] as const;

// Roles that can invite team members
export const TEAM_INVITE_ROLES: readonly SystemRole[] = [
  SystemRole.GOD,
  SystemRole.ADMIN,
  SystemRole.PROPS_SUPERVISOR,
  SystemRole.EDITOR
] as const;

// Roles that can view all props across shows
export const ALL_PROPS_VIEW_ROLES: readonly SystemRole[] = [
  SystemRole.GOD,
  SystemRole.ADMIN,
  SystemRole.PROPS_SUPERVISOR
] as const;

// Roles that can access admin features
export const ADMIN_FEATURE_ROLES: readonly SystemRole[] = [
  SystemRole.GOD,
  SystemRole.ADMIN
] as const;

// System admin group name
export const SYSTEM_ADMIN_GROUP = 'system-admin';

// Role display names
export const ROLE_DISPLAY_NAMES: Record<SystemRole, string> = {
  [SystemRole.GOD]: 'God',
  [SystemRole.ADMIN]: 'Administrator',
  [SystemRole.PROPS_SUPERVISOR]: 'Props Supervisor',
  [SystemRole.EDITOR]: 'Editor',
  [SystemRole.VIEWER]: 'Viewer',
  [SystemRole.PROPS_CARPENTER]: 'Props Carpenter',
  [SystemRole.GUEST]: 'Guest'
};

// ============================================================================
// SUBSCRIPTION CONFIGURATION
// ============================================================================

// Default limits for each subscription plan
export const DEFAULT_SUBSCRIPTION_LIMITS: Record<SubscriptionPlan, any> = {
  [SubscriptionPlan.FREE]: {
    shows: 1,
    boards: 2,
    packingBoxes: 20,
    props: 10,
    archivedShows: 0,
    collaboratorsPerShow: 3,
    boardsPerShow: 2,
    packingBoxesPerShow: 20,
    propsPerShow: 10,
    canCreateShows: true,
    canInviteCollaborators: true,
    canUseAdvancedFeatures: false,
    canExportData: false,
    canAccessAPI: false
  },
  [SubscriptionPlan.STARTER]: {
    shows: 3,
    boards: 5,
    packingBoxes: 50,
    props: 25,
    archivedShows: 1,
    collaboratorsPerShow: 5,
    boardsPerShow: 3,
    packingBoxesPerShow: 30,
    propsPerShow: 20,
    canCreateShows: true,
    canInviteCollaborators: true,
    canUseAdvancedFeatures: true,
    canExportData: true,
    canAccessAPI: false
  },
  [SubscriptionPlan.STANDARD]: {
    shows: 10,
    boards: 15,
    packingBoxes: 100,
    props: 50,
    archivedShows: 5,
    collaboratorsPerShow: 10,
    boardsPerShow: 5,
    packingBoxesPerShow: 50,
    propsPerShow: 30,
    canCreateShows: true,
    canInviteCollaborators: true,
    canUseAdvancedFeatures: true,
    canExportData: true,
    canAccessAPI: true
  },
  [SubscriptionPlan.PRO]: {
    shows: 999999,
    boards: 999999,
    packingBoxes: 999999,
    props: 999999,
    archivedShows: 999999,
    collaboratorsPerShow: 999999,
    boardsPerShow: 999999,
    packingBoxesPerShow: 999999,
    propsPerShow: 999999,
    canCreateShows: true,
    canInviteCollaborators: true,
    canUseAdvancedFeatures: true,
    canExportData: true,
    canAccessAPI: true
  }
};

// Unlimited limits for exempt users
export const UNLIMITED_LIMITS = {
  shows: 999999,
  boards: 999999,
  packingBoxes: 999999,
  props: 999999,
  archivedShows: 999999,
  collaboratorsPerShow: 999999,
  boardsPerShow: 999999,
  packingBoxesPerShow: 999999,
  propsPerShow: 999999,
  canCreateShows: true,
  canInviteCollaborators: true,
  canUseAdvancedFeatures: true,
  canExportData: true,
  canAccessAPI: true
};

// ============================================================================
// PERMISSION CONFIGURATION
// ============================================================================

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.MANAGE_USERS]: 'Manage user accounts and roles',
  [Permission.ASSIGN_ROLES]: 'Assign roles to users',
  [Permission.VIEW_USER_PROFILES]: 'View user profile information',
  [Permission.CREATE_SHOWS]: 'Create new shows',
  [Permission.EDIT_SHOWS]: 'Edit show information',
  [Permission.DELETE_SHOWS]: 'Delete shows',
  [Permission.ARCHIVE_SHOWS]: 'Archive shows',
  [Permission.VIEW_SHOWS]: 'View shows',
  [Permission.INVITE_TEAM_MEMBERS]: 'Invite team members',
  [Permission.REMOVE_TEAM_MEMBERS]: 'Remove team members',
  [Permission.MANAGE_TEAM_ROLES]: 'Manage team member roles',
  [Permission.CREATE_PROPS]: 'Create props',
  [Permission.EDIT_PROPS]: 'Edit props',
  [Permission.DELETE_PROPS]: 'Delete props',
  [Permission.VIEW_PROPS]: 'View props',
  [Permission.CREATE_BOARDS]: 'Create task boards',
  [Permission.EDIT_BOARDS]: 'Edit task boards',
  [Permission.DELETE_BOARDS]: 'Delete task boards',
  [Permission.VIEW_BOARDS]: 'View task boards',
  [Permission.CREATE_PACKING_BOXES]: 'Create packing boxes',
  [Permission.EDIT_PACKING_BOXES]: 'Edit packing boxes',
  [Permission.DELETE_PACKING_BOXES]: 'Delete packing boxes',
  [Permission.VIEW_PACKING_BOXES]: 'View packing boxes',
  [Permission.VIEW_SYSTEM_LOGS]: 'View system logs',
  [Permission.MANAGE_SYSTEM_SETTINGS]: 'Manage system settings',
  [Permission.ACCESS_ADMIN_PANEL]: 'Access admin panel',
  [Permission.VIEW_BILLING]: 'View billing information',
  [Permission.MANAGE_SUBSCRIPTIONS]: 'Manage subscriptions',
  [Permission.PURCHASE_ADDONS]: 'Purchase add-ons'
};

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

// Minimum role requirements for actions
export const MINIMUM_ROLE_REQUIREMENTS: Record<string, SystemRole> = {
  'create_show': SystemRole.EDITOR,
  'edit_show': SystemRole.EDITOR,
  'delete_show': SystemRole.ADMIN,
  'invite_team_member': SystemRole.EDITOR,
  'remove_team_member': SystemRole.PROPS_SUPERVISOR,
  'manage_user_roles': SystemRole.ADMIN,
  'access_admin_panel': SystemRole.ADMIN,
  'view_all_props': SystemRole.PROPS_SUPERVISOR,
  'bypass_subscription_limits': SystemRole.GOD
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const PERMISSION_ERROR_MESSAGES = {
  INSUFFICIENT_ROLE: 'You do not have the required role for this action',
  SUBSCRIPTION_LIMIT_REACHED: 'You have reached your subscription limit',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  INVALID_USER: 'Invalid user profile',
  RESOURCE_NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'You are not authorized to perform this action'
} as const;