/**
 * Temporary placeholder useSubscription hook for Android app
 * 
 * This will be replaced with the full implementation in Phase 2.
 * For now, it returns default free plan limits.
 */

import { DEFAULT_SUBSCRIPTION_LIMITS } from '../shared/permissions/constants';
import { SubscriptionPlan, type SubscriptionLimits } from '../shared/permissions/types';

/**
 * Temporary subscription hook for Android app
 * Returns default free plan limits until full subscription system is implemented
 */
export const useSubscription = () => {
  // TODO: Replace with full implementation in Phase 2
  const limits: SubscriptionLimits = DEFAULT_SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE];
  
  return {
    plan: SubscriptionPlan.FREE as 'free',
    status: 'active',
    currentPeriodEnd: undefined,
    limits,
    perShowLimits: {
      boards: limits.boardsPerShow,
      packingBoxes: limits.packingBoxesPerShow,
      collaborators: limits.collaboratorsPerShow,
      props: limits.propsPerShow
    },
    effectiveLimits: limits,
    userAddOns: [],
    canPurchaseAddOns: false
  };
};

