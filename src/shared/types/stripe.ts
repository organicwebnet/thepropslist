/**
 * Stripe-related types
 * Type definitions for Stripe API responses and data structures
 */

import type { PricingConfig, PricingPlan } from './pricing';

/**
 * Response from getPricingConfig Cloud Function
 */
export interface StripePricingConfigResponse extends PricingConfig {
  plans: PricingPlan[];
}

/**
 * Response from createCheckoutSession Cloud Function
 */
export interface StripeCheckoutSessionResponse {
  url: string;
}

/**
 * Response from createBillingPortalSession Cloud Function
 */
export interface StripeBillingPortalSessionResponse {
  url: string;
}





