import { Address } from './address'; // Import the new Address type

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  // Theatre-specific roles
  GOD = 'god',
  PROPS_SUPERVISOR = 'props_supervisor',
  STAGE_MANAGER = 'stage_manager',
  ASSISTANT_STAGE_MANAGER = 'assistant_stage_manager',
  PROP_MAKER = 'prop_maker',
  ART_DIRECTOR = 'art_director',
  PROPS_SUPERVISOR_ASSISTANT = 'props_supervisor_assistant',
}

/**
 * Defines permissions for different actions within the app.
 */
export interface UserPermissions {
  canEditProps?: boolean;
  canDeleteProps?: boolean;
  canManageUsers?: boolean;
  canEditShows?: boolean;
  canCreateProps?: boolean;
  canCustomizeDataViews?: boolean;
}

/**
 * Represents the user profile data stored in Firestore.
 */
export interface UserProfile {
  id: string; // User ID (matches Firebase Auth UID)
  email: string | null;
  displayName: string | null;
  photoURL?: string; // Optional photo URL from provider or custom upload
  role?: UserRole; // User role (optional, might use permissions instead)
  jobTitle?: string; // Add jobTitle
  permissions?: Partial<UserPermissions>; // Granular permissions
  createdAt?: Date;
  updatedAt?: Date;
  themePreference?: 'light' | 'dark' | 'system';
  fontPreference?: string; // e.g., 'default', 'OpenDyslexic'
  onboardingCompleted?: boolean; // Whether user has completed onboarding
  onboardingCompletedAt?: Date; // When onboarding was completed

  // Saved Addresses
  savedSenderAddresses?: Address[];
  savedDeliveryAddresses?: Address[];

  // Notification Preferences
  notificationPreferences?: NotificationPreferences;
}

/**
 * Notification preferences for controlling what notifications a user receives.
 * All preferences default to true if not specified.
 */
export interface NotificationPreferences {
  // Prop-related notifications
  propStatusUpdates?: boolean; // Notifications when prop status changes
  maintenanceReminders?: boolean; // Notifications for maintenance due dates
  
  // Show-related notifications
  showReminders?: boolean; // Notifications for upcoming shows
  
  // Shopping-related notifications
  shoppingItemAssigned?: boolean; // Notifications when shopping item is assigned to you
  shoppingItemApproved?: boolean; // Notifications when shopping item is approved
  shoppingItemRejected?: boolean; // Notifications when shopping item is rejected
  shoppingOptionSelected?: boolean; // Notifications when a shopping option is selected
  shoppingOptionAdded?: boolean; // Notifications when a new shopping option is added
  
  // Task-related notifications
  taskAssigned?: boolean; // Notifications when a task is assigned to you
  taskDueSoon?: boolean; // Notifications when a task is due soon
  taskDueToday?: boolean; // Notifications when a task is due today
  
  // General notifications
  comments?: boolean; // Notifications for comments on props/items
  systemNotifications?: boolean; // System-wide notifications
  
  // Subscription-related notifications
  subscriptionExpiringSoon?: boolean; // Notifications when subscription expires in 7 days
  subscriptionExpiringToday?: boolean; // Notifications when subscription expires today
  subscriptionExpired?: boolean; // Notifications when subscription has expired
  subscriptionPaymentFailed?: boolean; // Notifications when subscription payment fails
  subscriptionUpgradeAvailable?: boolean; // Notifications when upgrade to higher tier is available
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canEditShows: true,
    canCreateProps: true,
    canCustomizeDataViews: true,
  },
  [UserRole.EDITOR]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canEditShows: true,
    canCreateProps: true,
    canCustomizeDataViews: false,
  },
  [UserRole.VIEWER]: {
    canEditProps: false,
    canDeleteProps: false,
    canManageUsers: false,
    canEditShows: false,
    canCreateProps: false,
    canCustomizeDataViews: false,
  },
  // Theatre-specific roles
  [UserRole.GOD]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canEditShows: true,
    canCreateProps: true,
    canCustomizeDataViews: true,
  },
  [UserRole.PROPS_SUPERVISOR]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canEditShows: true,
    canCreateProps: true,
    canCustomizeDataViews: true,
  },
  [UserRole.STAGE_MANAGER]: {
    canEditProps: true,
    canDeleteProps: false,
    canManageUsers: false,
    canEditShows: false,
    canCreateProps: true,
    canCustomizeDataViews: false,
  },
  [UserRole.ASSISTANT_STAGE_MANAGER]: {
    canEditProps: true,
    canDeleteProps: false,
    canManageUsers: false,
    canEditShows: false,
    canCreateProps: true,
    canCustomizeDataViews: false,
  },
  [UserRole.PROP_MAKER]: {
    canEditProps: true,
    canDeleteProps: false,
    canManageUsers: false,
    canEditShows: false,
    canCreateProps: true,
    canCustomizeDataViews: false,
  },
  [UserRole.ART_DIRECTOR]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: false,
    canEditShows: false,
    canCreateProps: true,
    canCustomizeDataViews: false,
  },
  [UserRole.PROPS_SUPERVISOR_ASSISTANT]: {
    canEditProps: true,
    canDeleteProps: false,
    canManageUsers: false,
    canEditShows: false,
    canCreateProps: true,
    canCustomizeDataViews: false,
  },
}; 
