"use strict";
/**
 * Firebase Cloud Functions Entry Point
 *
 * Exports all Cloud Functions for deployment
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripePromotionCode = exports.createStripeCoupon = exports.stripeWebhook = exports.getSubscriptionStats = exports.createBillingPortalSession = exports.createCheckoutSession = exports.getPricingConfig = exports.decrementPropCounts = exports.decrementBoardCounts = exports.decrementShowCounts = exports.updatePropCounts = exports.updateBoardCounts = exports.updateResourceCounts = exports.checkSubscriptionLimits = exports.validateTeamInvitation = exports.validatePropCreation = exports.validateBoardCreation = exports.validateShowCreation = exports.sendCustomPasswordResetEmailV3 = exports.submitContactForm = void 0;
// Import existing functions
__exportStar(require("./contact"), exports);
__exportStar(require("./password-reset-simple"), exports);
__exportStar(require("./password-reset-fixed"), exports);
__exportStar(require("./pricing"), exports);
__exportStar(require("./subscriptionValidation"), exports);
__exportStar(require("./stripe"), exports);
__exportStar(require("./propStatusAutoRevert"), exports);
// Re-export for easier imports
var contact_1 = require("./contact");
// Contact functions
Object.defineProperty(exports, "submitContactForm", { enumerable: true, get: function () { return contact_1.submitContactForm; } });
var password_reset_simple_1 = require("./password-reset-simple");
// Password reset functions
Object.defineProperty(exports, "sendCustomPasswordResetEmailV3", { enumerable: true, get: function () { return password_reset_simple_1.sendCustomPasswordResetEmailV3; } });
var subscriptionValidation_1 = require("./subscriptionValidation");
// Subscription validation functions
Object.defineProperty(exports, "validateShowCreation", { enumerable: true, get: function () { return subscriptionValidation_1.validateShowCreation; } });
Object.defineProperty(exports, "validateBoardCreation", { enumerable: true, get: function () { return subscriptionValidation_1.validateBoardCreation; } });
Object.defineProperty(exports, "validatePropCreation", { enumerable: true, get: function () { return subscriptionValidation_1.validatePropCreation; } });
Object.defineProperty(exports, "validateTeamInvitation", { enumerable: true, get: function () { return subscriptionValidation_1.validateTeamInvitation; } });
Object.defineProperty(exports, "checkSubscriptionLimits", { enumerable: true, get: function () { return subscriptionValidation_1.checkSubscriptionLimits; } });
Object.defineProperty(exports, "updateResourceCounts", { enumerable: true, get: function () { return subscriptionValidation_1.updateResourceCounts; } });
Object.defineProperty(exports, "updateBoardCounts", { enumerable: true, get: function () { return subscriptionValidation_1.updateBoardCounts; } });
Object.defineProperty(exports, "updatePropCounts", { enumerable: true, get: function () { return subscriptionValidation_1.updatePropCounts; } });
Object.defineProperty(exports, "decrementShowCounts", { enumerable: true, get: function () { return subscriptionValidation_1.decrementShowCounts; } });
Object.defineProperty(exports, "decrementBoardCounts", { enumerable: true, get: function () { return subscriptionValidation_1.decrementBoardCounts; } });
Object.defineProperty(exports, "decrementPropCounts", { enumerable: true, get: function () { return subscriptionValidation_1.decrementPropCounts; } });
var stripe_1 = require("./stripe");
// Stripe functions
Object.defineProperty(exports, "getPricingConfig", { enumerable: true, get: function () { return stripe_1.getPricingConfig; } });
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return stripe_1.createCheckoutSession; } });
Object.defineProperty(exports, "createBillingPortalSession", { enumerable: true, get: function () { return stripe_1.createBillingPortalSession; } });
Object.defineProperty(exports, "getSubscriptionStats", { enumerable: true, get: function () { return stripe_1.getSubscriptionStats; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripe_1.stripeWebhook; } });
Object.defineProperty(exports, "createStripeCoupon", { enumerable: true, get: function () { return stripe_1.createStripeCoupon; } });
Object.defineProperty(exports, "createStripePromotionCode", { enumerable: true, get: function () { return stripe_1.createStripePromotionCode; } });
