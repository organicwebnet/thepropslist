import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc as fsDoc, getDoc as fsGetDoc, Firestore } from 'firebase/firestore';
import { db } from '../firebase';
import { UserAddOn } from '../types/AddOns';

/**
 * Response from purchaseAddOn Cloud Function
 */
interface PurchaseAddOnResponse {
  subscriptionItemId: string;
}

/**
 * User add-ons document structure in Firestore
 */
interface UserAddOnsDocument {
  addOns?: UserAddOn[];
}

/**
 * Helper to convert Firestore timestamp to Date or number
 */
function convertTimestamp(timestamp: unknown): number | undefined {
  if (!timestamp) return undefined;
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    const ts = timestamp as { toMillis?: () => number };
    return ts.toMillis?.();
  }
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    const ts = timestamp as { toDate?: () => Date };
    return ts.toDate?.().getTime();
  }
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    const ts = timestamp as { seconds?: number };
    return ts.seconds ? ts.seconds * 1000 : undefined;
  }
  return undefined;
}

/**
 * Filter active add-ons (not expired, not cancelled)
 */
function filterActiveAddOns(addOns: UserAddOn[]): UserAddOn[] {
  const now = Date.now();
  return addOns.filter(addOn => {
    if (addOn.status === 'cancelled' || addOn.status === 'expired') {
      return false;
    }
    if (addOn.expiresAt) {
      const expiresAt = typeof addOn.expiresAt === 'number' 
        ? addOn.expiresAt 
        : addOn.expiresAt instanceof Date
        ? addOn.expiresAt.getTime()
        : undefined;
      if (expiresAt && expiresAt <= now) {
        return false;
      }
    }
    return true;
  });
}

export class AddOnService {
  /**
   * Purchase an add-on for the user
   */
  async purchaseAddOn(
    userId: string,
    addOnId: string,
    billingInterval: 'monthly' | 'yearly'
  ): Promise<{ success: boolean; error?: string; subscriptionItemId?: string }> {
    try {
      const purchaseAddOn = httpsCallable<{
        userId: string;
        addOnId: string;
        billingInterval: 'monthly' | 'yearly';
      }, PurchaseAddOnResponse>(getFunctions(), 'purchaseAddOn');
      const result = await purchaseAddOn({
        userId,
        addOnId,
        billingInterval,
      });
      
      return {
        success: true,
        subscriptionItemId: result.data.subscriptionItemId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to purchase add-on';
      console.error('Error purchasing add-on:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Cancel an add-on
   */
  async cancelAddOn(
    userId: string,
    userAddOnId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cancelAddOn = httpsCallable<{
        userId: string;
        userAddOnId: string;
      }, void>(getFunctions(), 'cancelAddOn');
      await cancelAddOn({
        userId,
        userAddOnId,
      });
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel add-on';
      console.error('Error cancelling add-on:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get user's add-ons from Firestore
   * 
   * @param userId - User ID to fetch add-ons for
   * @returns Array of active user add-ons
   */
  async getUserAddOns(userId: string): Promise<UserAddOn[]> {
    try {
      const addOnsRef = fsDoc(db as Firestore, 'userAddOns', userId);
      const addOnsSnapshot = await fsGetDoc(addOnsRef);
      
      if (!addOnsSnapshot.exists()) {
        return [];
      }
      
      const addOnsData = addOnsSnapshot.data() as UserAddOnsDocument;
      const userAddOnsList = Array.isArray(addOnsData.addOns) ? addOnsData.addOns : [];
      
      if (userAddOnsList.length === 0) {
        return [];
      }
      
      // Convert timestamps and map to UserAddOn format
      const processedAddOns: UserAddOn[] = userAddOnsList.map((addOn) => ({
        ...addOn,
        createdAt: convertTimestamp(addOn.createdAt) 
          ? new Date(convertTimestamp(addOn.createdAt)!)
          : new Date(),
        cancelledAt: convertTimestamp(addOn.cancelledAt)
          ? new Date(convertTimestamp(addOn.cancelledAt)!)
          : undefined,
        expiresAt: convertTimestamp(addOn.expiresAt)
          ? new Date(convertTimestamp(addOn.expiresAt)!)
          : undefined,
      }));
      
      // Filter out expired and cancelled add-ons
      const activeAddOns = filterActiveAddOns(processedAddOns);
      return activeAddOns;
    } catch (error: unknown) {
      console.error('Error fetching user add-ons:', error);
      return [];
    }
  }
}

export const addOnService = new AddOnService();
