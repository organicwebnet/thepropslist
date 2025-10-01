import { useEffect, useMemo, useState } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { doc as fsDoc, getDoc as fsGetDoc, Firestore } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { UserAddOn, calculateAddOnLimits } from '../types/AddOns';

export type PlanKey = 'free' | 'starter' | 'standard' | 'pro' | 'unknown';

export interface SubscriptionInfo {
  plan: PlanKey;
  status: string;
  currentPeriodEnd?: number;
  limits: {
    shows: number;
    boards: number;
    packingBoxes: number;
    collaboratorsPerShow: number;
    props: number;
    archivedShows: number;
  };
  perShowLimits: {
    boards: number;
    packingBoxes: number;
    collaborators: number;
    props: number;
  };
  effectiveLimits: {
    shows: number;
    boards: number;
    packingBoxes: number;
    collaboratorsPerShow: number;
    props: number;
    archivedShows: number;
  };
  userAddOns: UserAddOn[];
  canPurchaseAddOns: boolean;
}

const DEFAULT_LIMITS: SubscriptionInfo['limits'] = {
  shows: 1,
  boards: 2,
  packingBoxes: 20,
  collaboratorsPerShow: 3,
  props: 10,
  archivedShows: 0,
};

const DEFAULT_PER_SHOW_LIMITS: SubscriptionInfo['perShowLimits'] = {
  boards: 2,
  packingBoxes: 20,
  collaborators: 3,
  props: 10,
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
function parseStripeLimits(metadata: any) {
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
    limits: {
      shows: parseLimit(metadata.shows, 1),
      boards: parseLimit(metadata.boards, 2),
      packingBoxes: parseLimit(metadata.packing_boxes, 20),
      collaboratorsPerShow: parseLimit(metadata.collaborators, 3),
      props: parseLimit(metadata.props, 10),
      archivedShows: parseLimit(metadata.archived_shows, 0),
    },
    // Per-show limits (per individual show)
    perShowLimits: {
      boards: parsePerShowLimit(metadata.boards_per_show, 2),
      packingBoxes: parsePerShowLimit(metadata.packing_boxes_per_show, 20),
      collaborators: parsePerShowLimit(metadata.collaborators_per_show, 3),
      props: parsePerShowLimit(metadata.props_per_show, 10),
    }
  };
}

export function useSubscription(): SubscriptionInfo {
  const { user } = useWebAuth();
  const [plan, setPlan] = useState<PlanKey>('free');
  const [status, setStatus] = useState<string>('unknown');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | undefined>(undefined);
  const [stripeLimits, setStripeLimits] = useState<{
    limits: SubscriptionInfo['limits'];
    perShowLimits: SubscriptionInfo['perShowLimits'];
  }>({
    limits: DEFAULT_LIMITS,
    perShowLimits: DEFAULT_PER_SHOW_LIMITS,
  });
  const [userAddOns, setUserAddOns] = useState<UserAddOn[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    async function load() {
      if (!user) {
        if (isMounted) { 
          setPlan('free'); 
          setStatus('unknown'); 
          setCurrentPeriodEnd(undefined);
          setStripeLimits({
            limits: DEFAULT_LIMITS,
            perShowLimits: DEFAULT_PER_SHOW_LIMITS,
          });
          setUserAddOns([]);
        }
        return;
      }
      
      try {
        // Get user profile
        const ref = fsDoc(db as Firestore, 'userProfiles', user.uid);
        const snap = await fsGetDoc(ref);
        const d = snap.exists() ? (snap.data() as any) : {};
        
        // Exempt elevated roles
        const isGod = String(d?.role || '').toLowerCase() === 'god';
        const isSystemAdmin = !!(d?.groups && d.groups['system-admin'] === true);
        
        if (isGod || isSystemAdmin) {
          if (!isMounted) return;
          setPlan('pro');
          setStatus('exempt');
          setCurrentPeriodEnd(undefined);
          // God/Admin gets unlimited limits
          setStripeLimits({
            limits: {
              shows: 999999,
              boards: 999999,
              packingBoxes: 999999,
              collaboratorsPerShow: 999999,
              props: 999999,
              archivedShows: 999999,
            },
            perShowLimits: {
              boards: 999999,
              packingBoxes: 999999,
              collaborators: 999999,
              props: 999999,
            }
          });
          setUserAddOns([]);
          return;
        }
        
        const userPlan = mapPlan(d.plan || d.subscriptionPlan);
        if (!isMounted) return;
        
        setPlan(userPlan);
        setStatus(String(d.subscriptionStatus || 'unknown'));
        const cpe = typeof d.currentPeriodEnd === 'number' ? d.currentPeriodEnd : undefined;
        setCurrentPeriodEnd(cpe);
        
        // Fetch limits from Stripe
        try {
          const getPricingConfig = httpsCallable(getFunctions(), 'getPricingConfig');
          const result = await getPricingConfig();
          const pricingConfig = result.data as any;
          
          if (pricingConfig?.plans) {
            const planConfig = pricingConfig.plans.find((p: any) => p.id === userPlan);
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
        
        // Fetch user's add-ons
        try {
          const addOnsRef = fsDoc(db as Firestore, 'userAddOns', user.uid);
          const addOnsSnapshot = await fsGetDoc(addOnsRef);
          if (addOnsSnapshot.exists()) {
            const addOnsData = addOnsSnapshot.data() as any;
            const userAddOnsList = Array.isArray(addOnsData.addOns) ? addOnsData.addOns : [];
            if (isMounted) {
              setUserAddOns(userAddOnsList);
            }
          }
        } catch (addOnsError) {
          console.warn('Failed to fetch user add-ons:', addOnsError);
          // Keep empty array if fetch fails
        }
        
      } catch (error) {
        console.error('Error loading subscription:', error);
        if (isMounted) { 
          setPlan('unknown'); 
          setStatus('unknown'); 
          setCurrentPeriodEnd(undefined);
          setStripeLimits({
            limits: DEFAULT_LIMITS,
            perShowLimits: DEFAULT_PER_SHOW_LIMITS,
          });
          setUserAddOns([]);
        }
      }
    }
    
    load();
    return () => { isMounted = false; };
  }, [user]);

  // Calculate effective limits including add-ons
  const effectiveLimits = useMemo(() => {
    const addOnLimits = calculateAddOnLimits(stripeLimits.limits, userAddOns);
    return {
      shows: addOnLimits.shows,
      boards: stripeLimits.limits.boards, // Add-ons don't affect boards
      packingBoxes: addOnLimits.packingBoxes,
      collaboratorsPerShow: stripeLimits.limits.collaboratorsPerShow, // Add-ons don't affect collaborators
      props: addOnLimits.props,
      archivedShows: addOnLimits.archivedShows,
    };
  }, [stripeLimits.limits, userAddOns]);
  
  // Determine if user can purchase add-ons
  const canPurchaseAddOns = useMemo(() => {
    return ['standard', 'pro'].includes(plan);
  }, [plan]);

  return { 
    plan, 
    status, 
    currentPeriodEnd, 
    limits: stripeLimits.limits,
    perShowLimits: stripeLimits.perShowLimits,
    effectiveLimits,
    userAddOns,
    canPurchaseAddOns,
  };
}


