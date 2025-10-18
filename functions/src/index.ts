/**
 * Firebase Cloud Functions Entry Point
 * 
 * Exports all Cloud Functions for deployment
 */

// Import existing functions
export * from './contact';
export * from './password-reset-simple';
export * from './password-reset-fixed';
export * from './pricing';
export * from './subscriptionValidation';

// Re-export for easier imports
export {
  // Contact functions
  submitContactForm
} from './contact';

export {
  // Password reset functions
  sendCustomPasswordResetEmailV3
} from './password-reset-simple';

export {
  // Subscription validation functions
  validateShowCreation,
  validateBoardCreation,
  validatePropCreation,
  validateTeamInvitation,
  checkSubscriptionLimits,
  updateResourceCounts,
  updateBoardCounts,
  updatePropCounts,
  decrementShowCounts,
  decrementBoardCounts,
  decrementPropCounts
} from './subscriptionValidation';