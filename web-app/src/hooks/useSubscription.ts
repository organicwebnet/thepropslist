import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useWebAuth } from '../contexts/WebAuthContext';
import { doc as fsDoc, getDoc as fsGetDoc } from 'firebase/firestore';

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
  };
}

const DEFAULT_LIMITS: SubscriptionInfo['limits'] = {
  shows: 1,
  boards: 2,
  packingBoxes: 20,
  collaboratorsPerShow: 3,
  props: 10,
};

const PLAN_LIMITS: Record<PlanKey, SubscriptionInfo['limits']> = {
  free: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10 },
  starter: { shows: 3, boards: 5, packingBoxes: 200, collaboratorsPerShow: 5, props: 50 },
  standard: { shows: 10, boards: 20, packingBoxes: 1000, collaboratorsPerShow: 15, props: 100 },
  pro: { shows: 100, boards: 200, packingBoxes: 10000, collaboratorsPerShow: 100, props: 1000 },
  unknown: DEFAULT_LIMITS,
};

function mapPlan(input?: any): PlanKey {
  const k = String(input || '').toLowerCase();
  if (k === 'starter') return 'starter';
  if (k === 'standard') return 'standard';
  if (k === 'pro') return 'pro';
  if (k === 'free' || k === '') return 'free';
  return 'unknown';
}

export function useSubscription(): SubscriptionInfo {
  const { user } = useWebAuth();
  const [plan, setPlan] = useState<PlanKey>('free');
  const [status, setStatus] = useState<string>('unknown');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        if (isMounted) { setPlan('free'); setStatus('unknown'); setCurrentPeriodEnd(undefined); }
        return;
      }
      try {
        const ref = fsDoc(db, 'userProfiles', user.uid);
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
          return;
        }
        if (!isMounted) return;
        setPlan(mapPlan(d.plan || d.subscriptionPlan));
        setStatus(String(d.subscriptionStatus || 'unknown'));
        const cpe = typeof d.currentPeriodEnd === 'number' ? d.currentPeriodEnd : undefined;
        setCurrentPeriodEnd(cpe);
      } catch {
        if (isMounted) { setPlan('unknown'); setStatus('unknown'); setCurrentPeriodEnd(undefined); }
      }
    }
    load();
    return () => { isMounted = false; };
  }, [user]);

  const limits = useMemo(() => PLAN_LIMITS[plan] || DEFAULT_LIMITS, [plan]);

  return { plan, status, currentPeriodEnd, limits };
}


