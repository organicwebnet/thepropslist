import { getFunctions, httpsCallable } from 'firebase/functions';
import { PricingConfig, PricingPlan, DEFAULT_PRICING_CONFIG } from '../shared/types/pricing';

// Re-export for backward compatibility
export type StripePlan = PricingPlan;

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
      
      if (result.data && (result.data as any).plans && Array.isArray((result.data as any).plans)) {
        this.pricingConfig = result.data as PricingConfig;
        this.lastFetch = now;
        // Successfully fetched latest pricing from Stripe
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

    // Use shared default configuration and override with environment-specific price IDs
    const config = { ...DEFAULT_PRICING_CONFIG };
    
    // Update price IDs from environment variables
    config.plans = config.plans.map(plan => {
      switch (plan.id) {
        case 'starter':
          return { ...plan, priceId: { monthly: starterPriceIdMonthly, yearly: starterPriceIdYearly } };
        case 'standard':
          return { ...plan, priceId: { monthly: standardPriceIdMonthly, yearly: standardPriceIdYearly } };
        case 'pro':
          return { ...plan, priceId: { monthly: proPriceIdMonthly, yearly: proPriceIdYearly } };
        default:
          return plan;
      }
    });

    return config;
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

    return (result.data as any).url;
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
