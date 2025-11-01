/**
 * Stripe integration functions for subscription management
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { DEFAULT_PRICING_CONFIG } from './pricing';

const db = getFirestore();

// Initialize Stripe lazily to avoid timeout during module load
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(functions.config().stripe.secret, {
      apiVersion: '2023-10-16',
    });
  }
  return stripe;
}

/**
 * Get pricing configuration with Stripe price IDs
 */
export const getPricingConfig = onCall(async (request) => {
  try {
    // Get price IDs from Firebase config
    const config = functions.config().stripe;
    
    // Create pricing config with actual price IDs
    const pricingConfig = {
      ...DEFAULT_PRICING_CONFIG,
      plans: DEFAULT_PRICING_CONFIG.plans.map(plan => {
        if (plan.id === 'starter') {
          return {
            ...plan,
            priceId: {
              monthly: config.plan_starter_price || '',
              yearly: '' // Add yearly price ID if available
            }
          };
        } else if (plan.id === 'standard') {
          return {
            ...plan,
            priceId: {
              monthly: config.plan_standard_price || '',
              yearly: '' // Add yearly price ID if available
            }
          };
        } else if (plan.id === 'pro') {
          return {
            ...plan,
            priceId: {
              monthly: config.plan_pro_price || '',
              yearly: '' // Add yearly price ID if available
            }
          };
        }
        return plan;
      })
    };

    return pricingConfig;
  } catch (error) {
    console.error('Error getting pricing config:', error);
    throw new HttpsError('internal', 'Failed to get pricing configuration');
  }
});

/**
 * Create Stripe checkout session
 */
export const createCheckoutSession = onCall(async (request) => {
  try {
    const { priceId, planId, billingInterval, discountCode } = request.data;
    
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    if (!priceId) {
      throw new HttpsError('invalid-argument', 'Price ID is required');
    }

    // Get user data
    const user = request.auth;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    // Create or get Stripe customer
    let customerId = userData?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: userData?.email || user.token?.email,
        metadata: {
          firebaseUID: user.uid,
        },
      });
      customerId = customer.id;
      
      // Save customer ID to user document
      await db.collection('users').doc(user.uid).update({
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.rawRequest.headers.origin}/profile?success=true`,
      cancel_url: `${request.rawRequest.headers.origin}/profile?canceled=true`,
      metadata: {
        firebaseUID: user.uid,
        planId: planId,
        billingInterval: billingInterval,
      },
    };

    // Add promotion code if provided
    if (discountCode) {
      sessionParams.allow_promotion_codes = true;
      sessionParams.discounts = [{
        promotion_code: discountCode,
      }];
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);

    return { url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to create checkout session');
  }
});

/**
 * Create Stripe billing portal session
 */
export const createBillingPortalSession = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Get user data
    const user = request.auth;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      throw new HttpsError('failed-precondition', 'No Stripe customer found');
    }

    // Create billing portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: `${request.rawRequest.headers.origin}/profile`,
    });

    return { url: session.url };
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to create billing portal session');
  }
});

/**
 * Get subscription statistics (admin only)
 */
export const getSubscriptionStats = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const user = request.auth;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !['admin', 'god'].includes(userData.role)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    // Get basic stats
    const stats = {
      totalUsers: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      plans: {
        free: 0,
        starter: 0,
        standard: 0,
        pro: 0,
      }
    };

    // Count users by subscription plan
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      stats.totalUsers++;
      
      if (data.subscriptionPlan) {
        const plan = data.subscriptionPlan as keyof typeof stats.plans;
        if (plan && plan in stats.plans) {
          stats.plans[plan] = (stats.plans[plan] || 0) + 1;
        }
        if (data.subscriptionPlan !== 'free') {
          stats.activeSubscriptions++;
        }
      } else {
        stats.plans.free++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to get subscription statistics');
  }
});

/**
 * Stripe webhook handler
 */
export const stripeWebhook = onCall(async (request) => {
  try {
    const sig = request.rawRequest.headers['stripe-signature'];
    const webhookSecret = functions.config().stripe.webhook_secret;

    if (!sig || !webhookSecret) {
      throw new HttpsError('invalid-argument', 'Missing webhook signature or secret');
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        request.rawRequest.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new HttpsError('invalid-argument', 'Invalid webhook signature');
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('Webhook error:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Webhook processing failed');
  }
});

// Helper functions for webhook handling
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const firebaseUID = session.metadata?.firebaseUID;
  if (!firebaseUID) return;

  const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
  
  await db.collection('users').doc(firebaseUID).update({
    subscriptionPlan: session.metadata?.planId || 'starter',
    subscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: subscription.current_period_end,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customer = await getStripe().customers.retrieve(subscription.customer as string);
  
  if ('deleted' in customer) return; // Skip deleted customers
  
  const firebaseUID = customer.metadata?.firebaseUID;
  if (!firebaseUID) return;

  await db.collection('users').doc(firebaseUID).update({
    subscriptionStatus: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customer = await getStripe().customers.retrieve(subscription.customer as string);
  
  if ('deleted' in customer) return; // Skip deleted customers
  
  const firebaseUID = customer.metadata?.firebaseUID;
  if (!firebaseUID) return;

  await db.collection('users').doc(firebaseUID).update({
    subscriptionPlan: 'free',
    subscriptionStatus: 'canceled',
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
  });
}
