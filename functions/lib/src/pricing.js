"use strict";
/**
 * Pricing utilities for Firebase Functions
 * This file contains shared pricing logic that matches the web-app implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRICING_CONFIG = exports.DEFAULT_PLAN_FEATURES = void 0;
exports.getDefaultFeaturesForPlan = getDefaultFeaturesForPlan;
exports.calculateDiscount = calculateDiscount;
exports.DEFAULT_PLAN_FEATURES = {
    'free': [
        '1 Show', '2 Task Boards', '20 Packing Boxes',
        '3 Collaborators per Show', '10 Props', 'No Archived Shows', 'Basic Support'
    ],
    'starter': [
        '3 Shows', '5 Task Boards', '200 Packing Boxes',
        '5 Collaborators per Show', '50 Props', '2 Archived Shows', 'Email Support'
    ],
    'standard': [
        '10 Shows', '20 Task Boards', '1000 Packing Boxes',
        '15 Collaborators per Show', '100 Props', '5 Archived Shows', 'Priority Support',
        'Custom Branding'
    ],
    'pro': [
        '100 Shows', '200 Task Boards', '10000 Packing Boxes',
        '100 Collaborators per Show', '1000 Props', '10 Archived Shows', '24/7 Support',
        'Custom Branding'
    ]
};
exports.DEFAULT_PRICING_CONFIG = {
    currency: 'GBP',
    billingInterval: 'monthly',
    plans: [
        {
            id: 'free',
            name: 'Free',
            description: 'Perfect for small productions',
            price: { monthly: 0, yearly: 0, currency: 'GBP' },
            features: exports.DEFAULT_PLAN_FEATURES['free'],
            limits: {
                shows: 1, boards: 2, packingBoxes: 20,
                collaboratorsPerShow: 3, props: 10, archivedShows: 0
            },
            priceId: { monthly: '', yearly: '' },
            popular: false,
            color: 'bg-gray-500'
        },
        {
            id: 'starter',
            name: 'Starter',
            description: 'Great for growing productions',
            price: { monthly: 9, yearly: 90, currency: 'GBP' },
            features: exports.DEFAULT_PLAN_FEATURES['starter'],
            limits: {
                shows: 3, boards: 5, packingBoxes: 200,
                collaboratorsPerShow: 5, props: 50, archivedShows: 2
            },
            priceId: { monthly: '', yearly: '' },
            popular: false,
            color: 'bg-blue-500'
        },
        {
            id: 'standard',
            name: 'Standard',
            description: 'Perfect for professional productions',
            price: { monthly: 19, yearly: 190, currency: 'GBP' },
            features: exports.DEFAULT_PLAN_FEATURES['standard'],
            limits: {
                shows: 10, boards: 20, packingBoxes: 1000,
                collaboratorsPerShow: 15, props: 100, archivedShows: 5
            },
            priceId: { monthly: '', yearly: '' },
            popular: true,
            color: 'bg-purple-500'
        },
        {
            id: 'pro',
            name: 'Pro',
            description: 'For large-scale productions',
            price: { monthly: 39, yearly: 390, currency: 'GBP' },
            features: exports.DEFAULT_PLAN_FEATURES['pro'],
            limits: {
                shows: 100, boards: 200, packingBoxes: 10000,
                collaboratorsPerShow: 100, props: 1000, archivedShows: 10
            },
            priceId: { monthly: '', yearly: '' },
            popular: false,
            color: 'bg-yellow-500'
        }
    ]
};
function getDefaultFeaturesForPlan(planId) {
    return exports.DEFAULT_PLAN_FEATURES[planId] || [];
}
/**
 * Helper function to calculate discount between monthly and yearly pricing
 */
function calculateDiscount(monthlyPrice, yearlyPrice) {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - yearlyPrice;
    // Handle division by zero case
    if (monthlyTotal === 0) {
        return { savings, discountPercent: 0 };
    }
    const discountPercent = Math.round((savings / monthlyTotal) * 100);
    return { savings, discountPercent };
}
