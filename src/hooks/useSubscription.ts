/**
 * useSubscription Hook for Android App
 * 
 * Subscription management that integrates with the 3-tier permission system:
 * 1. Role-based access control (RBAC)
 * 2. Subscription-based access control (from Stripe metadata)
 * 3. Permission-based access control
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { UserAddOn, calculateAddOnLimits } from '../shared/types/addOns';
import { 
  PermissionService, 
  type SubscriptionLimits,
  UNLIMITED_LIMITS,
  DEFAULT_SUBSCRIPTION_LIMITS,
  SubscriptionPlan
} from '../shared/permissions';

export type PlanKey = 'free' | 'starter' | 'standard' | 'pro' | 'unknown';

/**
 * Subscription information returned by the hook
 */
export interface SubscriptionInfo {
  plan: PlanKey;
  status: string;
  currentPeriodEnd?: number;
  limits: SubscriptionLimits;
  perShowLimits: {
    boards: number;
    packingBoxes: number;
    collaborators: number;
    props: number;
  };
  effectiveLimits: SubscriptionLimits;
  userAddOns: UserAddOn[];
  canPurchaseAddOns: boolean;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMITS: SubscriptionLimits = DEFAULT_SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE];

// Firestore collection names
const COLLECTIONS = {
  USER_PROFILES: 'userProfiles',
  USER_ADDONS: 'userAddOns',
} as const;

/**
 * User profile data from Firestore
 */
interface UserProfileData {
  plan?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: number | { toMillis?: () => number };
}

/**
 * User add-ons data from Firestore
 */
interface UserAddOnsData {
  addOns?: Array<{
    id: string;
    userId: string;
    addOnId: string;
    quantity: number;
    status: 'active' | 'cancelled' | 'expired';
    billingInterval: 'monthly' | 'yearly';
    stripeSubscriptionItemId: string;
    createdAt?: any;
    cancelledAt?: any;
    expiresAt?: any;
  }>;
}

/**
 * Pricing config from Firebase Functions
 */
interface PricingConfig {
  plans?: Array<{
    id: string;
    limits?: Record<string, string>;
  }>;
}

/**
 * Map plan string to PlanKey with validation
 * 
 * @param input - Plan name from Firestore
 * @returns Validated PlanKey, defaults to 'free' if invalid
 */
function mapPlan(input?: unknown): PlanKey {
  if (!input) return 'free';
  
  const planString = String(input).toLowerCase().trim();
  
  // Validate against known plans
  const validPlans: PlanKey[] = ['free', 'starter', 'standard', 'pro'];
  if (validPlans.includes(planString as PlanKey)) {
    return planString as PlanKey;
  }
  
  // Log warning for invalid plans
  if (planString && planString !== 'unknown') {
    console.warn(`Invalid plan name: ${input}, defaulting to 'free'`);
  }
  
  return 'free';
}

/**
 * Parse Stripe metadata to extract limits
 * Supports both per-plan and per-show limits
 * Format: "20" = per-plan, "20per_show" = per-show
 */
function parseStripeLimits(metadata: Record<string, string | undefined>): SubscriptionLimits {
  const parseLimit = (value: string | undefined, defaultValue: number = 0): number => {
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  };

  const parsePerShowLimit = (value: string | undefined, defaultValue: number = 0): number => {
    if (!value) return defaultValue;
    if (value.includes('per_show')) {
      const num = parseInt(value.replace('per_show', ''), 10);
      return isNaN(num) ? defaultValue : num;
    }
    return defaultValue;
  };

  return {
    // Per-plan limits (total across all shows)
    shows: parseLimit(metadata.shows, 1),
    boards: parseLimit(metadata.boards, 2),
    packingBoxes: parseLimit(metadata.packing_boxes, 20),
    collaboratorsPerShow: parseLimit(metadata.collaborators, 3),
    props: parseLimit(metadata.props, 10),
    archivedShows: parseLimit(metadata.archived_shows, 0),
    
    // Per-show limits (per individual show)
    boardsPerShow: parsePerShowLimit(metadata.boards_per_show, 2),
    packingBoxesPerShow: parsePerShowLimit(metadata.packing_boxes_per_show, 20),
    propsPerShow: parsePerShowLimit(metadata.props_per_show, 10),
    
    // Feature flags
    canCreateShows: metadata.can_create_shows !== 'false',
    canInviteCollaborators: metadata.can_invite_collaborators !== 'false',
    canUseAdvancedFeatures: metadata.can_use_advanced_features === 'true',
    canExportData: metadata.can_export_data === 'true',
    canAccessAPI: metadata.can_access_api === 'true'
  };
}

/**
 * Get limits from default subscription limits based on plan
 */
function getLimitsFromPlan(plan: PlanKey): SubscriptionLimits {
  switch (plan) {
    case 'starter':
      return DEFAULT_SUBSCRIPTION_LIMITS[SubscriptionPlan.STARTER];
    case 'standard':
      return DEFAULT_SUBSCRIPTION_LIMITS[SubscriptionPlan.STANDARD];
    case 'pro':
      return DEFAULT_SUBSCRIPTION_LIMITS[SubscriptionPlan.PRO];
    case 'free':
    case 'unknown':
    default:
      return DEFAULT_SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE];
  }
}

/**
 * Convert Firestore timestamp to number (milliseconds)
 */
function convertTimestamp(timestamp: unknown): number | undefined {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    const ts = timestamp as { toMillis?: () => number };
    return ts.toMillis?.();
  }
  return undefined;
}

/**
 * Filter out expired add-ons based on expiresAt
 */
function filterActiveAddOns(addOns: UserAddOn[]): UserAddOn[] {
  const now = Date.now();
  return addOns.filter(addOn => {
    if (addOn.status !== 'active') return false;
    
    // Check if add-on has expired
    if (addOn.expiresAt) {
      const expiresAt = typeof addOn.expiresAt === 'number' 
        ? addOn.expiresAt 
        : new Date(addOn.expiresAt).getTime();
      if (expiresAt < now) return false;
    }
    
    return true;
  });
}

/**
 * Hook for managing subscription data in the mobile app
 * 
 * @returns SubscriptionInfo with plan, limits, add-ons, loading state, and error
 * 
 * @example
 * ```tsx
 * const { plan, limits, effectiveLimits, loading, error } = useSubscription();
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (limits.shows < currentShows.length) {
 *   // Show upgrade prompt
 * }
 * ```
 */
export function useSubscription(): SubscriptionInfo {
  const { user, userProfile } = useAuth();
  const { service: firebaseService } = useFirebase();
  const [plan, setPlan] = useState<PlanKey>('free');
  const [status, setStatus] = useState<string>('unknown');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | undefined>(undefined);
  const [stripeLimits, setStripeLimits] = useState<SubscriptionLimits>(DEFAULT_LIMITS);
  const [userAddOns, setUserAddOns] = useState<UserAddOn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Reset subscription state to defaults
   */
  const resetToDefaults = useCallback(() => {
    setPlan('free');
    setStatus('unknown');
    setCurrentPeriodEnd(undefined);
    setStripeLimits(DEFAULT_LIMITS);
    setUserAddOns([]);
    setError(null);
  }, []);

  /**
   * Set exempt user limits
   */
  const setExemptUserLimits = useCallback(() => {
    setPlan('pro');
    setStatus('exempt');
    setCurrentPeriodEnd(undefined);
    setStripeLimits(UNLIMITED_LIMITS);
    setUserAddOns([]);
    setError(null);
  }, []);

  /**
   * Fetch user profile from Firestore
   */
  const fetchUserProfile = useCallback(async (): Promise<UserProfileData> => {
    if (!firebaseService || !user?.uid) {
      throw new Error('Firebase service or user not available');
    }

    const profileDoc = await firebaseService.getDocument<UserProfileData>(
      COLLECTIONS.USER_PROFILES,
      user.uid
    );
    
    return profileDoc?.data || {};
  }, [firebaseService, user?.uid]);

  /**
   * Fetch Stripe pricing config via Firebase Functions
   */
  const fetchPricingConfig = useCallback(async (): Promise<PricingConfig | null> => {
    try {
      // Dynamic import to avoid errors if functions package is not installed
      const functionsModule = require('@react-native-firebase/functions');
      if (functionsModule && functionsModule.getFunctions && functionsModule.httpsCallable) {
        const functions = functionsModule.getFunctions();
        const getPricingConfig = functionsModule.httpsCallable(functions, 'getPricingConfig');
        const result = await getPricingConfig();
        return result.data as PricingConfig;
      }
    } catch (functionsError) {
      // Functions package not available or error - this is expected if not installed
      console.debug('Firebase Functions not available, using default limits:', functionsError);
    }
    return null;
  }, []);

  /**
   * Load limits from Stripe or fallback to defaults
   */
  const loadLimits = useCallback(async (userPlan: PlanKey) => {
    try {
      const pricingConfig = await fetchPricingConfig();
      
      if (pricingConfig?.plans) {
        const planConfig = pricingConfig.plans.find((p) => p.id === userPlan);
        if (planConfig?.limits) {
          const parsedLimits = parseStripeLimits(planConfig.limits);
          setStripeLimits(parsedLimits);
          return;
        }
      }
      
      // Fall back to default limits for plan
      setStripeLimits(getLimitsFromPlan(userPlan));
    } catch (stripeError) {
      console.warn('Failed to fetch Stripe limits, using defaults:', stripeError);
      // Fall back to default limits for plan
      setStripeLimits(getLimitsFromPlan(userPlan));
    }
  }, [fetchPricingConfig]);

  /**
   * Fetch user add-ons from Firestore
   */
  const loadAddOns = useCallback(async () => {
    if (!firebaseService || !user?.uid) {
      setUserAddOns([]);
      return;
    }

    try {
      const addOnsDoc = await firebaseService.getDocument<UserAddOnsData>(
        COLLECTIONS.USER_ADDONS,
        user.uid
      );
      
      if (addOnsDoc?.data?.addOns) {
        const addOnsData = addOnsDoc.data.addOns;
        const userAddOnsList: UserAddOn[] = addOnsData.map((addOn) => ({
          ...addOn,
          createdAt: convertTimestamp(addOn.createdAt) || Date.now(),
          cancelledAt: convertTimestamp(addOn.cancelledAt),
          expiresAt: convertTimestamp(addOn.expiresAt),
        }));
        
        // Filter out expired add-ons
        const activeAddOns = filterActiveAddOns(userAddOnsList);
        setUserAddOns(activeAddOns);
      } else {
        setUserAddOns([]);
      }
    } catch (addOnsError) {
      console.warn('Failed to fetch user add-ons:', addOnsError);
      // Keep empty array if fetch fails
      setUserAddOns([]);
    }
  }, [firebaseService, user?.uid]);

  /**
   * Load subscription data
   */
  const loadSubscription = useCallback(async () => {
    if (!user) {
      resetToDefaults();
      setLoading(false);
      return;
    }

    // Check if user is exempt from subscription limits
    if (PermissionService.isExemptFromLimits(userProfile)) {
      setExemptUserLimits();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!firebaseService) {
        console.warn('Firebase service not available, using default limits');
        resetToDefaults();
        setLoading(false);
        return;
      }

      // Fetch user profile
      const profileData = await fetchUserProfile();
      const userPlan = mapPlan(profileData.plan || profileData.subscriptionPlan);
      
      setPlan(userPlan);
      setStatus(String(profileData.subscriptionStatus || 'unknown'));
      setCurrentPeriodEnd(convertTimestamp(profileData.currentPeriodEnd));

      // Load limits and add-ons in parallel
      await Promise.all([
        loadLimits(userPlan),
        loadAddOns(),
      ]);

      setLoading(false);
    } catch (err) {
      console.error('Error loading subscription:', err);
      const error = err instanceof Error ? err : new Error('Failed to load subscription');
      setError(error);
      resetToDefaults();
      setLoading(false);
    }
  }, [
    user,
    userProfile,
    firebaseService,
    resetToDefaults,
    setExemptUserLimits,
    fetchUserProfile,
    loadLimits,
    loadAddOns,
  ]);

  /**
   * Refresh subscription data manually
   */
  const refresh = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  // Load subscription data on mount and when dependencies change
  // Use primitive dependencies to prevent excessive re-renders
  useEffect(() => {
    loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userProfile?.role]); // Only re-fetch when user ID or role changes

  // Calculate effective limits including add-ons
  const effectiveLimits = useMemo(() => {
    // If user is exempt, their effective limits are already set to unlimited
    if (PermissionService.isExemptFromLimits(userProfile)) {
      return UNLIMITED_LIMITS;
    }

    const addOnLimits = calculateAddOnLimits(stripeLimits, userAddOns);
    return {
      ...stripeLimits,
      shows: addOnLimits.shows,
      packingBoxes: addOnLimits.packingBoxes,
      props: addOnLimits.props,
      archivedShows: addOnLimits.archivedShows,
    };
  }, [stripeLimits, userAddOns, userProfile]);

  // Determine if user can purchase add-ons
  const canPurchaseAddOns = useMemo(() => {
    return ['standard', 'pro'].includes(plan);
  }, [plan]);

  return {
    plan,
    status,
    currentPeriodEnd,
    limits: stripeLimits,
    perShowLimits: {
      boards: stripeLimits.boardsPerShow,
      packingBoxes: stripeLimits.packingBoxesPerShow,
      collaborators: stripeLimits.collaboratorsPerShow,
      props: stripeLimits.propsPerShow,
    },
    effectiveLimits,
    userAddOns,
    canPurchaseAddOns,
    loading,
    error,
    refresh,
  };
}
