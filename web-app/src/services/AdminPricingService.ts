import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface PricingConfig {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: string[];
  limits: {
    shows: number;
    boards: number;
    packingBoxes: number;
    collaboratorsPerShow: number;
    props: number;
  };
  priceId: {
    monthly: string;
    yearly: string;
  };
  popular: boolean;
  color: string;
  active: boolean;
}

export interface AdminPricingData {
  plans: PricingConfig[];
  lastUpdated: string;
  updatedBy: string;
}

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
    return {
      plans: [
        {
          id: 'free',
          name: 'Free',
          description: 'Perfect for small productions',
          price: { monthly: 0, yearly: 0, currency: 'USD' },
          features: [
            '1 Show',
            '2 Task Boards', 
            '20 Packing Boxes',
            '3 Collaborators per Show',
            '10 Props',
            'Basic Support'
          ],
          limits: {
            shows: 1,
            boards: 2,
            packingBoxes: 20,
            collaboratorsPerShow: 3,
            props: 10
          },
          priceId: { monthly: '', yearly: '' },
          popular: false,
          color: 'bg-gray-500',
          active: true
        },
        {
          id: 'starter',
          name: 'Starter',
          description: 'Great for growing productions',
          price: { monthly: 9, yearly: 90, currency: 'USD' },
          features: [
            '3 Shows',
            '5 Task Boards',
            '200 Packing Boxes', 
            '5 Collaborators per Show',
            '50 Props',
            'Email Support'
          ],
          limits: {
            shows: 3,
            boards: 5,
            packingBoxes: 200,
            collaboratorsPerShow: 5,
            props: 50
          },
          priceId: { monthly: '', yearly: '' },
          popular: false,
          color: 'bg-blue-500',
          active: true
        },
        {
          id: 'standard',
          name: 'Standard',
          description: 'Perfect for professional productions',
          price: { monthly: 19, yearly: 190, currency: 'USD' },
          features: [
            '10 Shows',
            '20 Task Boards',
            '1000 Packing Boxes',
            '15 Collaborators per Show', 
            '100 Props',
            'Priority Support',
            'Custom Branding'
          ],
          limits: {
            shows: 10,
            boards: 20,
            packingBoxes: 1000,
            collaboratorsPerShow: 15,
            props: 100
          },
          priceId: { monthly: '', yearly: '' },
          popular: true,
          color: 'bg-purple-500',
          active: true
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'For large-scale productions',
          price: { monthly: 39, yearly: 390, currency: 'USD' },
          features: [
            '100 Shows',
            '200 Task Boards',
            '10000 Packing Boxes',
            '100 Collaborators per Show',
            '1000 Props',
            '24/7 Support',
            'Custom Branding'
          ],
          limits: {
            shows: 100,
            boards: 200,
            packingBoxes: 10000,
            collaboratorsPerShow: 100,
            props: 1000
          },
          priceId: { monthly: '', yearly: '' },
          popular: false,
          color: 'bg-yellow-500',
          active: true
        }
      ],
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    };
  }
}

export const adminPricingService = new AdminPricingService();
