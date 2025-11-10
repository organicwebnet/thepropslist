/**
 * Mobile Stripe Service
 * Handles subscription management and checkout session creation
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PricingConfig, PricingPlan } from '../shared/types/pricing';
import type { StripePricingConfigResponse, StripeCheckoutSessionResponse, StripeBillingPortalSessionResponse } from '../shared/types/stripe';
import { PRICING_CACHE_DURATION } from '../shared/constants/timing';

// Re-export for compatibility
export type StripePlan = PricingPlan;

class StripeService {
  private pricingConfig: PricingConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = PRICING_CACHE_DURATION;

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
      const getPricingConfig = httpsCallable<unknown, StripePricingConfigResponse>(getFunctions(), 'getPricingConfig');
      const result = await getPricingConfig();
      
      if (result.data && result.data.plans && Array.isArray(result.data.plans)) {
        this.pricingConfig = result.data as PricingConfig;
        this.lastFetch = now;
        return this.pricingConfig;
      } else {
        throw new Error('Invalid pricing data received from Stripe');
      }
    } catch (error) {
      console.warn('Failed to fetch dynamic pricing from Stripe, falling back to static config:', error);
      
      // Fallback to static configuration
      this.pricingConfig = this.getStaticPricingConfig();
      this.lastFetch = now;
      return this.pricingConfig;
    }
  }

  /**
   * Fallback static pricing configuration
   */
  private getStaticPricingConfig(): PricingConfig {
    // Import default config from shared types
    const { DEFAULT_PRICING_CONFIG } = require('../shared/types/pricing');
    return { ...DEFAULT_PRICING_CONFIG };
  }

  /**
   * Create checkout session for a specific plan
   */
  async createCheckoutSession(
    planId: string, 
    billingInterval: 'monthly' | 'yearly', 
    discountCode?: string
  ): Promise<string> {
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

    const createCheckoutSession = httpsCallable<{
      priceId: string;
      planId: string;
      billingInterval: 'monthly' | 'yearly';
      discountCode?: string;
    }, StripeCheckoutSessionResponse>(getFunctions(), 'createCheckoutSession');
    const result = await createCheckoutSession({ 
      priceId,
      planId,
      billingInterval,
      discountCode
    });

    return result.data.url;
  }

  /**
   * Create billing portal session for managing subscription
   */
  async createBillingPortalSession(): Promise<string> {
    try {
      const createBillingPortalSession = httpsCallable<unknown, StripeBillingPortalSessionResponse>(
        getFunctions(), 
        'createBillingPortalSession'
      );
      const result = await createBillingPortalSession({});
      return result.data.url;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create billing portal session';
      throw new Error(errorMessage);
    }
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

