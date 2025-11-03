/**
 * System-wide Permission Types
 * 
 * This file defines the core types for the 3-tier permission system:
 * 1. Role-based access control (RBAC) - Granular control by god for all user types
 * 2. Subscription-based access control - From Stripe metadata
 * 3. Permission-based access control - Granular permissions for specific actions
 */

// ============================================================================
// 1. ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

/**
 * System roles with hierarchical permissions
 * God > Admin > Props Supervisor > Editor > Viewer
 */
export enum SystemRole {
  GOD = 'god',                    // Full system access, can manage all users and roles
  ADMIN = 'admin',                // Administrative access, can manage shows and users
  PROPS_SUPERVISOR = 'props_supervisor', // Can manage props and shows
  EDITOR = 'editor',              // Can edit content within assigned shows
  VIEWER = 'viewer',              // Read-only access
  PROPS_CARPENTER = 'props_carpenter', // Specialized role for props creation
  GUEST = 'guest'                 // Limited access, typically for external collaborators
}

// Role hierarchy and role groups are now defined in constants.ts

// ============================================================================
// 2. SUBSCRIPTION-BASED ACCESS CONTROL
// ============================================================================

/**
 * Subscription plans from Stripe
 */
export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  STANDARD = 'standard',
  PRO = 'pro'
}

/**
 * Resource limits from Stripe metadata
 */
export interface SubscriptionLimits {
  // Global limits (across all shows)
  shows: number;
  boards: number;
  packingBoxes: number;
  props: number;
  archivedShows: number;
  
  // Per-show limits
  collaboratorsPerShow: number;
  boardsPerShow: number;
  packingBoxesPerShow: number;
  propsPerShow: number;
  
  // Feature flags
  canCreateShows: boolean;
  canInviteCollaborators: boolean;
  canUseAdvancedFeatures: boolean;
  canExportData: boolean;
  canAccessAPI: boolean;
}

/**
 * User add-ons that extend subscription limits
 */
export interface UserAddOn {
  id: string;
  name: string;
  limits: Partial<SubscriptionLimits>;
  expiresAt?: number;
}

/**
 * Current usage counts for limit checking
 */
export interface CurrentCounts {
  shows: number;
  boards: number;
  props: number;
  packingBoxes: number;
  collaborators: number; // Per show
}

// ============================================================================
// 3. PERMISSION-BASED ACCESS CONTROL
// ============================================================================

/**
 * Granular permissions for specific actions
 */
export enum Permission {
  // User Management
  MANAGE_USERS = 'manage_users',
  ASSIGN_ROLES = 'assign_roles',
  VIEW_USER_PROFILES = 'view_user_profiles',
  
  // Show Management
  CREATE_SHOWS = 'create_shows',
  EDIT_SHOWS = 'edit_shows',
  DELETE_SHOWS = 'delete_shows',
  ARCHIVE_SHOWS = 'archive_shows',
  VIEW_SHOWS = 'view_shows',
  
  // Team Management
  INVITE_TEAM_MEMBERS = 'invite_team_members',
  REMOVE_TEAM_MEMBERS = 'remove_team_members',
  MANAGE_TEAM_ROLES = 'manage_team_roles',
  
  // Props Management
  CREATE_PROPS = 'create_props',
  EDIT_PROPS = 'edit_props',
  DELETE_PROPS = 'delete_props',
  VIEW_PROPS = 'view_props',
  
  // Board Management
  CREATE_BOARDS = 'create_boards',
  EDIT_BOARDS = 'edit_boards',
  DELETE_BOARDS = 'delete_boards',
  VIEW_BOARDS = 'view_boards',
  
  // Packing Management
  CREATE_PACKING_BOXES = 'create_packing_boxes',
  EDIT_PACKING_BOXES = 'edit_packing_boxes',
  DELETE_PACKING_BOXES = 'delete_packing_boxes',
  VIEW_PACKING_BOXES = 'view_packing_boxes',
  
  // System Administration
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  ACCESS_ADMIN_PANEL = 'access_admin_panel',
  
  // Billing & Subscriptions
  VIEW_BILLING = 'view_billing',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  PURCHASE_ADDONS = 'purchase_addons'
}

/**
 * Resource types for permission context
 */
export enum ResourceType {
  SHOW = 'show',
  PROP = 'prop',
  BOARD = 'board',
  PACKING_BOX = 'packing_box',
  USER = 'user',
  TEAM = 'team'
}

/**
 * Permission context for specific resources
 */
export interface PermissionContext {
  resourceType: ResourceType;
  resourceId?: string;
  showId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// 4. UNIFIED PERMISSION SYSTEM
// ============================================================================

/**
 * User profile with role and subscription information
 * Compatible with existing WebAuthContext and AuthContext UserProfile
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role?: SystemRole | 'user' | 'admin' | 'viewer' | 'god' | 'editor' | 'props_supervisor' | 'art_director';
  groups?: { [key: string]: boolean };
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: string;
  currentPeriodEnd?: number;
  createdAt?: Date;
  lastLogin?: Date;
  organizations?: string[];
  savedDeliveryAddresses?: any[];
  photoURL?: string;
  phoneNumber?: string;
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
    defaultView: 'grid' | 'list' | 'card';
  };
  onboardingCompleted?: boolean;
}

/**
 * Complete permission context for evaluation
 */
export interface PermissionEvaluationContext {
  userProfile: UserProfile | null;
  subscriptionLimits: SubscriptionLimits;
  currentCounts: CurrentCounts;
  showContext?: {
    showId: string;
    isOwner: boolean;
    teamRole?: SystemRole;
  };
  resourceContext?: PermissionContext;
}

/**
 * Result of a permission check
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  isExempt: boolean;
  effectiveLimits: SubscriptionLimits;
  requiredRole?: SystemRole;
  requiredPermission?: Permission;
}

/**
 * Comprehensive permission summary
 */
export interface PermissionSummary {
  isValid: boolean;
  isExempt: boolean;
  effectiveLimits: SubscriptionLimits;
  canInviteTeamMembers: boolean;
  canViewAllProps: boolean;
  shouldShowSubscriptionNotifications: boolean;
  roleDisplayName: string;
  rolePriority: number;
  currentCounts: CurrentCounts;
  limits: {
    shows: LimitStatus;
    boards: LimitStatus;
    props: LimitStatus;
    packingBoxes: LimitStatus;
  };
}

/**
 * Status of a specific limit
 */
export interface LimitStatus {
  current: number;
  limit: number;
  withinLimit: boolean;
  isExempt: boolean;
}

/**
 * Subscription information
 */
export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: string;
  currentPeriodEnd?: number;
  limits: SubscriptionLimits;
  userAddOns: UserAddOn[];
  canPurchaseAddOns: boolean;
}

