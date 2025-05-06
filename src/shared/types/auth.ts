import { Address } from './address'; // Import the new Address type

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/**
 * Defines permissions for different actions within the app.
 */
export interface UserPermissions {
  canEditProps: boolean;
  canDeleteProps: boolean;
  canManageUsers: boolean;
  canEditShows: boolean;
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
  permissions?: Partial<UserPermissions>; // Granular permissions
  createdAt?: Date;
  updatedAt?: Date;
  themePreference?: 'light' | 'dark' | 'system';
  fontPreference?: string; // e.g., 'default', 'OpenDyslexic'

  // Saved Addresses
  savedSenderAddresses?: Address[];
  savedDeliveryAddresses?: Address[];
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canEditShows: true
  },
  [UserRole.EDITOR]: {
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canEditShows: true
  },
  [UserRole.VIEWER]: {
    canEditProps: false,
    canDeleteProps: false,
    canManageUsers: false,
    canEditShows: false
  }
}; 