/**
 * Add-Ons Types
 * Shared types for subscription add-ons across web and mobile apps
 */

import type { SubscriptionLimits } from '../permissions/types';

export type AddOnType = 'shows' | 'props' | 'packing_boxes' | 'archived_shows';
export type TargetPlan = 'standard' | 'pro';

/**
 * Add-on definition (what's available to purchase)
 */
export interface AddOn {
  id: string;
  type: AddOnType;
  name: string;
  description: string;
  quantity: number;
  targetPlans: TargetPlan[];
  scope: 'account';
  popular?: boolean;
  features: string[];
  hostingImpact: 'low' | 'medium' | 'high';
  monthlyPrice: number;
  yearlyPrice: number;
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

/**
 * User add-on that extends subscription limits
 */
export interface UserAddOn {
  id: string;
  userId: string;
  addOnId: string;
  quantity: number;
  status: 'active' | 'cancelled' | 'expired';
  billingInterval: 'monthly' | 'yearly';
  stripeSubscriptionItemId: string;
  createdAt: Date | number;
  cancelledAt?: Date | number;
  expiresAt?: Date | number;
}

/**
 * Default add-ons available for purchase
 * This matches the web-app DEFAULT_ADDONS to ensure consistency
 */
export const DEFAULT_ADDONS: AddOn[] = [
  // Shows Add-Ons (Highest Value)
  {
    id: 'shows_5',
    type: 'shows',
    name: '5 Additional Shows',
    description: 'Add 5 more shows to your account',
    quantity: 5,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    popular: true,
    features: ['5 additional shows', 'Full show functionality', 'Priority support'],
    hostingImpact: 'high',
    monthlyPrice: 12,
    yearlyPrice: 120,
  },
  {
    id: 'shows_10',
    type: 'shows',
    name: '10 Additional Shows',
    description: 'Add 10 more shows to your account',
    quantity: 10,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['10 additional shows', 'Full show functionality', 'Priority support'],
    hostingImpact: 'high',
    monthlyPrice: 20,
    yearlyPrice: 200,
  },
  {
    id: 'shows_25',
    type: 'shows',
    name: '25 Additional Shows',
    description: 'Add 25 more shows to your account',
    quantity: 25,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['25 additional shows', 'Full show functionality', 'Priority support'],
    hostingImpact: 'high',
    monthlyPrice: 40,
    yearlyPrice: 400,
  },
  
  // Props Add-Ons (Medium Value)
  {
    id: 'props_100',
    type: 'props',
    name: '100 Additional Props',
    description: 'Add 100 more props to your account',
    quantity: 100,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    popular: true,
    features: ['100 additional props', 'Image storage included', 'Search functionality'],
    hostingImpact: 'medium',
    monthlyPrice: 4,
    yearlyPrice: 40,
  },
  {
    id: 'props_500',
    type: 'props',
    name: '500 Additional Props',
    description: 'Add 500 more props to your account',
    quantity: 500,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['500 additional props', 'Image storage included', 'Search functionality'],
    hostingImpact: 'medium',
    monthlyPrice: 15,
    yearlyPrice: 150,
  },
  {
    id: 'props_1000',
    type: 'props',
    name: '1000 Additional Props',
    description: 'Add 1000 more props to your account',
    quantity: 1000,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['1000 additional props', 'Image storage included', 'Search functionality'],
    hostingImpact: 'high',
    monthlyPrice: 25,
    yearlyPrice: 250,
  },
  
  // Packing Boxes Add-Ons (Lower Value)
  {
    id: 'packing_100',
    type: 'packing_boxes',
    name: '100 Additional Packing Boxes',
    description: 'Add 100 more packing boxes to your account',
    quantity: 100,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['100 additional packing boxes', 'Organizational tools', 'Export functionality'],
    hostingImpact: 'low',
    monthlyPrice: 2,
    yearlyPrice: 20,
  },
  {
    id: 'packing_500',
    type: 'packing_boxes',
    name: '500 Additional Packing Boxes',
    description: 'Add 500 more packing boxes to your account',
    quantity: 500,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['500 additional packing boxes', 'Organizational tools', 'Export functionality'],
    hostingImpact: 'medium',
    monthlyPrice: 8,
    yearlyPrice: 80,
  },
  {
    id: 'packing_1000',
    type: 'packing_boxes',
    name: '1000 Additional Packing Boxes',
    description: 'Add 1000 more packing boxes to your account',
    quantity: 1000,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['1000 additional packing boxes', 'Organizational tools', 'Export functionality'],
    hostingImpact: 'high',
    monthlyPrice: 12,
    yearlyPrice: 120,
  },
  
  // Archived Shows Add-Ons (Lowest Value)
  {
    id: 'archived_5',
    type: 'archived_shows',
    name: '5 Additional Archived Shows',
    description: 'Add 5 more archived shows to your account',
    quantity: 5,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['5 additional archived shows', 'Complete data preservation', 'Restoration capability'],
    hostingImpact: 'high',
    monthlyPrice: 2,
    yearlyPrice: 20,
  },
  {
    id: 'archived_10',
    type: 'archived_shows',
    name: '10 Additional Archived Shows',
    description: 'Add 10 more archived shows to your account',
    quantity: 10,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['10 additional archived shows', 'Complete data preservation', 'Restoration capability'],
    hostingImpact: 'high',
    monthlyPrice: 3,
    yearlyPrice: 30,
  },
  {
    id: 'archived_25',
    type: 'archived_shows',
    name: '25 Additional Archived Shows',
    description: 'Add 25 more archived shows to your account',
    quantity: 25,
    targetPlans: ['standard', 'pro'],
    scope: 'account',
    features: ['25 additional archived shows', 'Complete data preservation', 'Restoration capability'],
    hostingImpact: 'high',
    monthlyPrice: 6,
    yearlyPrice: 60,
  },
];

/**
 * Calculate effective limits with add-ons applied
 * This matches the web-app implementation exactly
 * 
 * Uses DEFAULT_ADDONS to look up add-on definitions and their quantities
 */
export function calculateAddOnLimits(
  baseLimits: SubscriptionLimits,
  userAddOns: UserAddOn[]
): {
  shows: number;
  props: number;
  packingBoxes: number;
  archivedShows: number;
} {
  // Filter active add-ons
  const activeAddOns = userAddOns.filter(addon => addon.status === 'active');
  
  // Calculate totals by add-on type using DEFAULT_ADDONS lookup
  // This matches the web-app implementation
  const addOnTotals = activeAddOns.reduce((totals, userAddOn) => {
    const addOn = DEFAULT_ADDONS.find(a => a.id === userAddOn.addOnId);
    if (addOn) {
      totals[addOn.type] = (totals[addOn.type] || 0) + addOn.quantity;
    }
    return totals;
  }, {} as Record<AddOnType, number>);

  return {
    shows: baseLimits.shows + (addOnTotals.shows || 0),
    props: baseLimits.props + (addOnTotals.props || 0),
    packingBoxes: baseLimits.packingBoxes + (addOnTotals.packing_boxes || 0),
    archivedShows: baseLimits.archivedShows + (addOnTotals.archived_shows || 0),
  };
}

/**
 * Get add-ons available for a specific plan
 */
export function getAddOnsForPlan(plan: TargetPlan): AddOn[] {
  return DEFAULT_ADDONS.filter(addon => addon.targetPlans.includes(plan));
}

/**
 * Get add-ons by type
 */
export function getAddOnsByType(type: AddOnType): AddOn[] {
  return DEFAULT_ADDONS.filter(addon => addon.type === type);
}
