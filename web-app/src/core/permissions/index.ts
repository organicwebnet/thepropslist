/**
 * Permission System Exports
 * 
 * This file re-exports from the shared permissions module to maintain backward compatibility.
 * All permission logic has been moved to src/shared/permissions/ for use by both web-app and Android app.
 */

// Re-export everything from shared permissions
export * from '../../../src/shared/permissions';

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
} from '../../../src/shared/permissions/types';

export { PermissionService } from '../../../src/shared/permissions/PermissionService';