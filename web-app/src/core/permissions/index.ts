/**
 * Permission System Exports
 * 
 * This is the main entry point for the 3-tier permission system:
 * 1. Role-based access control (RBAC) - Granular control by god for all user types
 * 2. Subscription-based access control - From Stripe metadata
 * 3. Permission-based access control - Granular permissions for specific actions
 */

// Core types
export * from './types';

// Constants and configuration
export * from './constants';

// Utility functions
export * from './utils';

// Main service
export * from './PermissionService';

// Re-export commonly used items for convenience
export { 
  SystemRole, 
  SubscriptionPlan, 
  Permission,
  type UserProfile,
  type PermissionEvaluationContext,
  type PermissionResult,
  type PermissionSummary,
  type SubscriptionLimits,
  type CurrentCounts
} from './types';

export { PermissionService } from './PermissionService';