import { Prop } from '../types/props';

/**
 * Calculate the spare quantity (difference between ordered and required)
 * @param prop The prop to calculate spare quantity for
 * @returns The number of spares (quantity - requiredQuantity, or 0 if quantity < requiredQuantity)
 */
export function calculateSpareQuantity(prop: Prop): number {
  const quantity = prop.quantity ?? 0;
  const required = prop.requiredQuantity ?? quantity;
  
  // Ensure non-negative values
  const safeQuantity = Math.max(0, quantity);
  const safeRequired = Math.max(0, required);
  
  return Math.max(0, safeQuantity - safeRequired);
}

/**
 * Calculate the quantity currently in storage (spares available)
 * @param prop The prop to calculate storage quantity for
 * @returns The number of items in storage (quantity - quantityInUse)
 */
export function calculateQuantityInStorage(prop: Prop): number {
  const quantity = prop.quantity ?? 0;
  const inUse = prop.quantityInUse ?? 0;
  
  // Ensure non-negative values and cap inUse at quantity
  const safeQuantity = Math.max(0, quantity);
  const safeInUse = Math.max(0, Math.min(inUse, safeQuantity));
  
  return Math.max(0, safeQuantity - safeInUse);
}

/**
 * Check if the prop has low spare inventory
 * @param prop The prop to check
 * @returns True if quantityInStorage is below the alert threshold
 */
export function checkLowInventory(prop: Prop): boolean {
  const threshold = prop.spareAlertThreshold ?? 2;
  const inStorage = calculateQuantityInStorage(prop);
  return inStorage < threshold && inStorage >= 0;
}

/**
 * Check if spares logic should be used for this prop
 * Spares logic should only be used if:
 * - The number of spares is greater than 1
 * - AND the prop is used in the show (quantityInUse > 0)
 * @param prop The prop to check
 * @returns True if spares logic should be used
 */
export function shouldUseSparesLogic(prop: Prop): boolean {
  const spare = calculateSpareQuantity(prop);
  const quantityInUse = prop.quantityInUse ?? 0;
  return spare > 1 && quantityInUse > 0;
}

/**
 * Get a formatted breakdown of quantity information
 * @param prop The prop to get breakdown for
 * @returns Object with formatted quantity breakdown
 */
export function getQuantityBreakdown(prop: Prop) {
  const quantity = prop.quantity ?? 0;
  const required = prop.requiredQuantity ?? quantity;
  const ordered = Math.max(0, quantity);
  const spare = calculateSpareQuantity(prop);
  const inUse = Math.max(0, Math.min(prop.quantityInUse ?? 0, quantity));
  const inStorage = calculateQuantityInStorage(prop);
  const isLow = checkLowInventory(prop);
  const threshold = Math.max(1, prop.spareAlertThreshold ?? 2);

  return {
    required,
    ordered,
    spare,
    inUse,
    inStorage,
    isLow,
    threshold,
    // Formatted strings for display
    formattedRequired: `${required} required`,
    formattedOrdered: `${ordered} ordered`,
    formattedSpare: spare > 0 ? `(${spare} spares)` : '',
    formattedInUse: `${inUse} in use`,
    formattedInStorage: `${inStorage} in storage`,
    formattedFull: `${required} required, ${ordered} ordered${spare > 0 ? ` (${spare} spares)` : ''}`,
    formattedUsage: `${inUse} in use, ${inStorage} in storage`,
  };
}

/**
 * Normalize prop quantities for backward compatibility
 * Sets default values if not present
 * @param prop The prop to normalize
 * @returns Prop with normalized quantities
 */
export function normalizePropQuantities(prop: Prop): Prop {
  const normalized = { ...prop };
  
  // Set requiredQuantity to quantity if not set
  if (normalized.requiredQuantity === undefined) {
    normalized.requiredQuantity = normalized.quantity;
  }
  
  // Set quantityInUse to 0 if not set
  if (normalized.quantityInUse === undefined) {
    normalized.quantityInUse = 0;
  }
  
  // Calculate quantityInStorage if not explicitly set
  if (normalized.quantityInStorage === undefined) {
    normalized.quantityInStorage = calculateQuantityInStorage(normalized);
  }
  
  return normalized;
}

