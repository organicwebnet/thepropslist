/**
 * useSubscription Hook
 * 
 * Subscription management that integrates with the 3-tier permission system:
 * 1. Role-based access control (RBAC)
 * 2. Subscription-based access control (from Stripe metadata)
 * 3. Permission-based access control
 */

import { useEffect, useMemo, useState } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { doc as fsDoc, getDoc as fsGetDoc, Firestore } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { UserAddOn, calculateAddOnLimits } from '../types/AddOns';
import { addOnService } from '../services/AddOnService';
import { 
  PermissionService, 
  type SubscriptionLimits,
  UNLIMITED_LIMITS
} from '../core/permissions';
import type { PricingConfig, PricingPlan } from '../shared/types/pricing';

export type PlanKey = 'free' | 'starter' | 'standard' | 'pro' | 'unknown';

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
}

const DEFAULT_LIMITS: SubscriptionLimits = {
  shows: 1,
  boards: 2,
  packingBoxes: 20,
  collaboratorsPerShow: 3,
  props: 10,
  archivedShows: 0,
  boardsPerShow: 2,
  packingBoxesPerShow: 20,
  propsPerShow: 10,
  canCreateShows: true,
  canInviteCollaborators: true,
  canUseAdvancedFeatures: false,
  canExportData: false,
  canAccessAPI: false
};


function mapPlan(input?: any): PlanKey {
  const k = String(input || '').toLowerCase();
  if (k === 'starter') return 'starter';
  if (k === 'standard') return 'standard';
  if (k === 'pro') return 'pro';
  if (k === 'free' || k === '') return 'free';
  return 'unknown';
}

/**
 * Parse Stripe metadata to extract limits
 * Supports both per-plan and per-show limits
 * Format: "20" = per-plan, "20per_show" = per-show
 */
function parseStripeLimits(metadata: any): SubscriptionLimits {
  const parseLimit = (value: string | undefined, defaultValue: number = 0) => {
    if (!value) return defaultValue;
    const num = parseInt(value);
    return isNaN(num) ? defaultValue : num;
  };

  const parsePerShowLimit = (value: string | undefined, defaultValue: number = 0) => {
    if (!value) return defaultValue;
    if (value.includes('per_show')) {
      const num = parseInt(value.replace('per_show', ''));
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

export function useSubscription(): SubscriptionInfo {
  const { user, userProfile } = useWebAuth();
  const [plan, setPlan] = useState<PlanKey>('free');
  const [status, setStatus] = useState<string>('unknown');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | undefined>(undefined);
  const [stripeLimits, setStripeLimits] = useState<SubscriptionLimits>(DEFAULT_LIMITS);
  const [userAddOns, setUserAddOns] = useState<UserAddOn[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    async function load() {
      if (!user) {
        if (isMounted) { 
          setPlan('free'); 
          setStatus('unknown'); 
          setCurrentPeriodEnd(undefined);
          setStripeLimits(DEFAULT_LIMITS);
          setUserAddOns([]);
        }
        return;
      }
      
      // Check if user is exempt from subscription limits using the permission system
      if (PermissionService.isExemptFromLimits(userProfile)) {
        if (!isMounted) return;
        setPlan('pro');
        setStatus('exempt');
        setCurrentPeriodEnd(undefined);
        setStripeLimits(UNLIMITED_LIMITS);
        setUserAddOns([]);
        return;
      }

      try {
        // Get user profile
        const ref = fsDoc(db as Firestore, 'userProfiles', user.uid);
        const snap = await fsGetDoc(ref);
        const d = snap.exists() ? (snap.data() as any) : {};
        
        const userPlan = mapPlan(d.plan || d.subscriptionPlan);
        if (!isMounted) return;
        
        setPlan(userPlan);
        setStatus(String(d.subscriptionStatus || 'unknown'));
        const cpe = typeof d.currentPeriodEnd === 'number' ? d.currentPeriodEnd : undefined;
        setCurrentPeriodEnd(cpe);
        
        // Fetch limits from Stripe
        try {
          const getPricingConfig = httpsCallable<unknown, PricingConfig>(getFunctions(), 'getPricingConfig');
          const result = await getPricingConfig();
          const pricingConfig = result.data;
          
          if (pricingConfig?.plans) {
            const planConfig = pricingConfig.plans.find((p: PricingPlan) => p.id === userPlan);
            if (planConfig?.limits) {
              const parsedLimits = parseStripeLimits(planConfig.limits);
              if (isMounted) {
                setStripeLimits(parsedLimits);
              }
            }
          }
        } catch (stripeError) {
          console.warn('Failed to fetch Stripe limits, using defaults:', stripeError);
          // Keep default limits if Stripe fetch fails
        }
        
        // Fetch user's add-ons using the service
        try {
          const userAddOnsList = await addOnService.getUserAddOns(user.uid);
          if (isMounted) {
            setUserAddOns(userAddOnsList);
          }
        } catch (addOnsError) {
          console.warn('Failed to fetch user add-ons:', addOnsError);
          // Keep empty array if fetch fails
          if (isMounted) {
            setUserAddOns([]);
          }
        }
        
      } catch (error) {
        console.error('Error loading subscription:', error);
        if (isMounted) { 
          setPlan('unknown'); 
          setStatus('unknown'); 
          setCurrentPeriodEnd(undefined);
          setStripeLimits(DEFAULT_LIMITS);
          setUserAddOns([]);
        }
      }
    }
    
    load();
    return () => { isMounted = false; };
  }, [user, userProfile]); // Depend on userProfile for exemption checks

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
      props: stripeLimits.propsPerShow
    },
    effectiveLimits,
    userAddOns,
    canPurchaseAddOns,
  };
}