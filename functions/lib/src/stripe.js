"use strict";
/**
 * Stripe integration functions for subscription management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.getSubscriptionStats = exports.createBillingPortalSession = exports.createCheckoutSession = exports.getPricingConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
const pricing_1 = require("./pricing");
const db = (0, firestore_1.getFirestore)();
// Initialize Stripe lazily to avoid timeout during module load
let stripe = null;
function getStripe() {
    if (!stripe) {
        stripe = new stripe_1.default(functions.config().stripe.secret, {
            apiVersion: '2023-10-16',
        });
    }
    return stripe;
}
/**
 * Get pricing configuration with Stripe price IDs
 */
exports.getPricingConfig = (0, https_1.onCall)(async (request) => {
    try {
        // Get price IDs from Firebase config
        const config = functions.config().stripe;
        // Create pricing config with actual price IDs
        const pricingConfig = {
            ...pricing_1.DEFAULT_PRICING_CONFIG,
            plans: pricing_1.DEFAULT_PRICING_CONFIG.plans.map(plan => {
                if (plan.id === 'starter') {
                    return {
                        ...plan,
                        priceId: {
                            monthly: config.plan_starter_price || '',
                            yearly: '' // Add yearly price ID if available
                        }
                    };
                }
                else if (plan.id === 'standard') {
                    return {
                        ...plan,
                        priceId: {
                            monthly: config.plan_standard_price || '',
                            yearly: '' // Add yearly price ID if available
                        }
                    };
                }
                else if (plan.id === 'pro') {
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
    }
    catch (error) {
        console.error('Error getting pricing config:', error);
        throw new https_1.HttpsError('internal', 'Failed to get pricing configuration');
    }
});
/**
 * Create Stripe checkout session
 */
exports.createCheckoutSession = (0, https_1.onCall)(async (request) => {
    try {
        const { priceId, planId, billingInterval, discountCode } = request.data;
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        if (!priceId) {
            throw new https_1.HttpsError('invalid-argument', 'Price ID is required');
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
        const sessionParams = {
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
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to create checkout session');
    }
});
/**
 * Create Stripe billing portal session
 */
exports.createBillingPortalSession = (0, https_1.onCall)(async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Get user data
        const user = request.auth;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        if (!userData?.stripeCustomerId) {
            throw new https_1.HttpsError('failed-precondition', 'No Stripe customer found');
        }
        // Create billing portal session
        const session = await getStripe().billingPortal.sessions.create({
            customer: userData.stripeCustomerId,
            return_url: `${request.rawRequest.headers.origin}/profile`,
        });
        return { url: session.url };
    }
    catch (error) {
        console.error('Error creating billing portal session:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to create billing portal session');
    }
});
/**
 * Get subscription statistics (admin only)
 */
exports.getSubscriptionStats = (0, https_1.onCall)(async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Check if user is admin
        const user = request.auth;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        if (!userData?.role || !['admin', 'god'].includes(userData.role)) {
            throw new https_1.HttpsError('permission-denied', 'Admin access required');
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
                const plan = data.subscriptionPlan;
                if (plan && plan in stats.plans) {
                    stats.plans[plan] = (stats.plans[plan] || 0) + 1;
                }
                if (data.subscriptionPlan !== 'free') {
                    stats.activeSubscriptions++;
                }
            }
            else {
                stats.plans.free++;
            }
        });
        return stats;
    }
    catch (error) {
        console.error('Error getting subscription stats:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to get subscription statistics');
    }
});
/**
 * Stripe webhook handler
 */
exports.stripeWebhook = (0, https_1.onCall)(async (request) => {
    try {
        const sig = request.rawRequest.headers['stripe-signature'];
        const webhookSecret = functions.config().stripe.webhook_secret;
        if (!sig || !webhookSecret) {
            throw new https_1.HttpsError('invalid-argument', 'Missing webhook signature or secret');
        }
        let event;
        try {
            event = getStripe().webhooks.constructEvent(request.rawRequest.body, sig, webhookSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed:', err);
            throw new https_1.HttpsError('invalid-argument', 'Invalid webhook signature');
        }
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        return { received: true };
    }
    catch (error) {
        console.error('Webhook error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Webhook processing failed');
    }
});
// Helper functions for webhook handling
async function handleCheckoutSessionCompleted(session) {
    const firebaseUID = session.metadata?.firebaseUID;
    if (!firebaseUID)
        return;
    const subscription = await getStripe().subscriptions.retrieve(session.subscription);
    await db.collection('users').doc(firebaseUID).update({
        subscriptionPlan: session.metadata?.planId || 'starter',
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
    });
}
async function handleSubscriptionUpdated(subscription) {
    const customer = await getStripe().customers.retrieve(subscription.customer);
    if ('deleted' in customer)
        return; // Skip deleted customers
    const firebaseUID = customer.metadata?.firebaseUID;
    if (!firebaseUID)
        return;
    await db.collection('users').doc(firebaseUID).update({
        subscriptionStatus: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
    });
}
async function handleSubscriptionDeleted(subscription) {
    const customer = await getStripe().customers.retrieve(subscription.customer);
    if ('deleted' in customer)
        return; // Skip deleted customers
    const firebaseUID = customer.metadata?.firebaseUID;
    if (!firebaseUID)
        return;
    await db.collection('users').doc(firebaseUID).update({
        subscriptionPlan: 'free',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
    });
}
