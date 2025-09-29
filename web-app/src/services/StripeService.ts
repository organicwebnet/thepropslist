import { getFunctions, httpsCallable } from 'firebase/functions';

export interface StripePlan {
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
}

export interface PricingConfig {
  plans: StripePlan[];
  currency: string;
  billingInterval: 'monthly' | 'yearly';
}

class StripeService {
  private pricingConfig: PricingConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for more frequent updates

  /**
   * Force refresh pricing configuration from Stripe (bypasses cache)
   */
  async refreshPricingConfig(): Promise<PricingConfig> {
    this.pricingConfig = null;
    this.lastFetch = 0;
    return this.getPricingConfig();
  }

  /**
   * Fetch pricing configuration from Stripe or configuration service
   */
  async getPricingConfig(): Promise<PricingConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.pricingConfig && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.pricingConfig;
    }

    try {
      // Try to fetch from Stripe API via Firebase function
      const getPricingConfig = httpsCallable(getFunctions(), 'getPricingConfig');
      const result = await getPricingConfig();
      
      if (result.data && result.data.plans && Array.isArray(result.data.plans)) {
        this.pricingConfig = result.data as PricingConfig;
        this.lastFetch = now;
        console.log('Successfully fetched latest pricing from Stripe:', this.pricingConfig);
        return this.pricingConfig;
      } else {
        throw new Error('Invalid pricing data received from Stripe');
      }
    } catch (error) {
      console.warn('Failed to fetch dynamic pricing from Stripe, falling back to static config:', error);
      
      // Fallback to static configuration if dynamic fetch fails
      this.pricingConfig = this.getStaticPricingConfig();
      this.lastFetch = now;
      return this.pricingConfig;
    }
  }

  /**
   * Fallback static pricing configuration
   */
  private getStaticPricingConfig(): PricingConfig {
    // Get price IDs from environment variables as fallback
    const env: any = (import.meta as any).env || {};
    const starterPriceIdMonthly = env.VITE_STARTER_PRICE_ID_MONTHLY || env.VITE_STARTER_PRICE_ID || '';
    const starterPriceIdYearly = env.VITE_STARTER_PRICE_ID_YEARLY || '';
    const standardPriceIdMonthly = env.VITE_STANDARD_PRICE_ID_MONTHLY || env.VITE_STANDARD_PRICE_ID || '';
    const standardPriceIdYearly = env.VITE_STANDARD_PRICE_ID_YEARLY || '';
    const proPriceIdMonthly = env.VITE_PRO_PRICE_ID_MONTHLY || env.VITE_PRO_PRICE_ID || '';
    const proPriceIdYearly = env.VITE_PRO_PRICE_ID_YEARLY || '';

    return {
      currency: 'USD',
      billingInterval: 'monthly',
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
          color: 'bg-gray-500'
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
          priceId: { monthly: starterPriceIdMonthly, yearly: starterPriceIdYearly },
          popular: false,
          color: 'bg-blue-500'
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
          priceId: { monthly: standardPriceIdMonthly, yearly: standardPriceIdYearly },
          popular: true,
          color: 'bg-purple-500'
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
          priceId: { monthly: proPriceIdMonthly, yearly: proPriceIdYearly },
          popular: false,
          color: 'bg-yellow-500'
        }
      ]
    };
  }

  /**
   * Create checkout session for a specific plan
   */
  async createCheckoutSession(planId: string, billingInterval: 'monthly' | 'yearly', discountCode?: string): Promise<string> {
    const config = await this.getPricingConfig();
    const plan = config.plans.find(p => p.id === planId);
    
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.id === 'free') {
      throw new Error('Cannot create checkout session for free plan');
    }

    const priceId = plan.priceId[billingInterval];
    if (!priceId) {
      throw new Error(`Price ID not configured for ${planId} ${billingInterval} plan`);
    }

    const createCheckoutSession = httpsCallable(getFunctions(), 'createCheckoutSession');
    const result = await createCheckoutSession({ 
      priceId,
      planId,
      billingInterval,
      discountCode
    });

    return result.data.url;
  }

  /**
   * Get plan by ID
   */
  async getPlan(planId: string): Promise<StripePlan | null> {
    const config = await this.getPricingConfig();
    return config.plans.find(p => p.id === planId) || null;
  }

  /**
   * Clear cache (useful for testing or when pricing changes)
   */
  clearCache(): void {
    this.pricingConfig = null;
    this.lastFetch = 0;
  }
}

export const stripeService = new StripeService();
