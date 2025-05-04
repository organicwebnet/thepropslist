export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  GUEST = 'guest'
}

export interface UserPermissions {
  canCreateProps: boolean;
  canEditProps: boolean;
  canDeleteProps: boolean;
  canManageUsers: boolean;
  canManageShows: boolean;
  canViewBudgets: boolean;
  canEditBudgets: boolean;
  canGenerateReports: boolean;
  canAccessAdvancedFeatures: boolean;
  // Add other specific permissions as needed
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string;
  role: UserRole;
  permissions: Partial<UserPermissions>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    canCreateProps: true,
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canManageShows: true,
    canViewBudgets: true,
    canEditBudgets: true,
    canGenerateReports: true,
    canAccessAdvancedFeatures: true
  },
  [UserRole.MANAGER]: {
    canCreateProps: true,
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: false,
    canManageShows: true,
    canViewBudgets: true,
    canEditBudgets: true,
    canGenerateReports: true,
    canAccessAdvancedFeatures: true
  },
  [UserRole.USER]: {
    canCreateProps: true,
    canEditProps: true,
    canDeleteProps: false,
    canManageUsers: false,
    canManageShows: true,
    canViewBudgets: true,
    canEditBudgets: true,
    canGenerateReports: false,
    canAccessAdvancedFeatures: false
  },
  [UserRole.GUEST]: {
    canCreateProps: false,
    canEditProps: false,
    canDeleteProps: false,
    canManageUsers: false,
    canManageShows: false,
    canViewBudgets: false,
    canEditBudgets: false,
    canGenerateReports: false,
    canAccessAdvancedFeatures: false
  }
}; 