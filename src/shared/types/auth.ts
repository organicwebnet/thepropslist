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
  canGenerateReports: boolean;
  canAccessAdvancedFeatures: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    canCreateProps: true,
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: true,
    canGenerateReports: true,
    canAccessAdvancedFeatures: true
  },
  [UserRole.MANAGER]: {
    canCreateProps: true,
    canEditProps: true,
    canDeleteProps: true,
    canManageUsers: false,
    canGenerateReports: true,
    canAccessAdvancedFeatures: true
  },
  [UserRole.USER]: {
    canCreateProps: true,
    canEditProps: true,
    canDeleteProps: false,
    canManageUsers: false,
    canGenerateReports: false,
    canAccessAdvancedFeatures: false
  },
  [UserRole.GUEST]: {
    canCreateProps: false,
    canEditProps: false,
    canDeleteProps: false,
    canManageUsers: false,
    canGenerateReports: false,
    canAccessAdvancedFeatures: false
  }
}; 