import { getFunctions, httpsCallable } from 'firebase/functions';
import { AddOn, UserAddOn } from '../types/AddOns';

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
      
      return {
        success: true,
        subscriptionItemId: result.data.subscriptionItemId,
      };
    } catch (error: any) {
      console.error('Error purchasing add-on:', error);
      return {
        success: false,
        error: error.message || 'Failed to purchase add-on',
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
    } catch (error: any) {
      console.error('Error cancelling add-on:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel add-on',
      };
    }
  }

  /**
   * Get user's add-ons
   */
  async getUserAddOns(userId: string): Promise<UserAddOn[]> {
    try {
      // This would typically fetch from Firestore
      // For now, return empty array - this will be implemented when we add the Firestore collection
      return [];
    } catch (error: any) {
      console.error('Error fetching user add-ons:', error);
      return [];
    }
  }
}

export const addOnService = new AddOnService();
