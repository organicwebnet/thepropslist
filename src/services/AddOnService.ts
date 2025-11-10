/**
 * Mobile Add-On Service
 * Handles add-on purchases and management
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { UserAddOn } from '../shared/types/addOns';
import type { FirebaseService } from '../shared/services/firebase/types';

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
function convertTimestamp(timestamp: any): number | undefined {
  if (!timestamp) return undefined;
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp.toMillis) return timestamp.toMillis();
  if (timestamp.toDate) return timestamp.toDate().getTime();
  if (timestamp.seconds) return timestamp.seconds * 1000;
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
        : addOn.expiresAt.getTime();
      return expiresAt > now;
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
      const purchaseAddOn = httpsCallable(getFunctions(), 'purchaseAddOn');
      const result = await purchaseAddOn({
        userId,
        addOnId,
        billingInterval,
      });
      
      const response = result.data as PurchaseAddOnResponse;
      
      return {
        success: true,
        subscriptionItemId: response.subscriptionItemId,
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
      const cancelAddOn = httpsCallable(getFunctions(), 'cancelAddOn');
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
   * @param firebaseService - Firebase service instance
   * @param userId - User ID to fetch add-ons for
   * @returns Array of active user add-ons
   */
  async getUserAddOns(
    firebaseService: FirebaseService,
    userId: string
  ): Promise<UserAddOn[]> {
    try {
      const addOnsDoc = await firebaseService.getDocument<UserAddOnsDocument>(
        'userAddOns',
        userId
      );
      
      if (!addOnsDoc || !addOnsDoc.data) {
        return [];
      }
      
      const addOnsData = addOnsDoc.data.addOns;
      if (!Array.isArray(addOnsData) || addOnsData.length === 0) {
        return [];
      }
      
      // Convert timestamps and map to UserAddOn format
      const userAddOnsList: UserAddOn[] = addOnsData.map((addOn) => ({
        ...addOn,
        createdAt: convertTimestamp(addOn.createdAt) || Date.now(),
        cancelledAt: convertTimestamp(addOn.cancelledAt),
        expiresAt: convertTimestamp(addOn.expiresAt),
      }));
      
      // Filter out expired and cancelled add-ons
      const activeAddOns = filterActiveAddOns(userAddOnsList);
      return activeAddOns;
    } catch (error: unknown) {
      console.error('Error fetching user add-ons:', error);
      return [];
    }
  }
}

export const addOnService = new AddOnService();


