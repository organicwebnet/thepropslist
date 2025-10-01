import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PricingPlan, AdminPricingData, DEFAULT_PRICING_CONFIG } from '../shared/types/pricing';

class AdminPricingService {
  private readonly COLLECTION = 'adminPricing';
  private readonly DOC_ID = 'pricingConfig';

  /**
   * Get current pricing configuration from Firestore
   */
  async getPricingConfig(): Promise<AdminPricingData | null> {
    try {
      const docRef = doc(db, this.COLLECTION, this.DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as AdminPricingData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching pricing config:', error);
      throw new Error('Failed to fetch pricing configuration');
    }
  }

  /**
   * Save pricing configuration to Firestore
   */
  async savePricingConfig(pricingData: AdminPricingData, updatedBy: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, this.DOC_ID);
      const dataToSave = {
        ...pricingData,
        lastUpdated: new Date().toISOString(),
        updatedBy
      };
      
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error('Error saving pricing config:', error);
      throw new Error('Failed to save pricing configuration');
    }
  }

  /**
   * Update a specific plan's price IDs
   */
  async updatePlanPriceIds(
    planId: string, 
    monthlyPriceId: string, 
    yearlyPriceId: string, 
    updatedBy: string
  ): Promise<void> {
    try {
      const currentConfig = await this.getPricingConfig();
      if (!currentConfig) {
        throw new Error('No pricing configuration found');
      }

      const planIndex = currentConfig.plans.findIndex(plan => plan.id === planId);
      if (planIndex === -1) {
        throw new Error(`Plan ${planId} not found`);
      }

      // Update the plan's price IDs
      currentConfig.plans[planIndex].priceId.monthly = monthlyPriceId;
      currentConfig.plans[planIndex].priceId.yearly = yearlyPriceId;
      currentConfig.lastUpdated = new Date().toISOString();
      currentConfig.updatedBy = updatedBy;

      await this.savePricingConfig(currentConfig, updatedBy);
    } catch (error) {
      console.error('Error updating plan price IDs:', error);
      throw new Error('Failed to update plan price IDs');
    }
  }

  /**
   * Validate Stripe price ID format
   */
  validatePriceId(priceId: string): boolean {
    if (!priceId) return true; // Empty is allowed
    return /^price_[a-zA-Z0-9]+$/.test(priceId);
  }

  /**
   * Get default pricing configuration
   */
  getDefaultPricingConfig(): AdminPricingData {
    // Use shared default configuration and add active flag for admin interface
    const plansWithActiveFlag: PricingPlan[] = DEFAULT_PRICING_CONFIG.plans.map(plan => ({
      ...plan,
      active: true
    }));

    return {
      ...DEFAULT_PRICING_CONFIG,
      plans: plansWithActiveFlag,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    };
  }
}

export const adminPricingService = new AdminPricingService();
