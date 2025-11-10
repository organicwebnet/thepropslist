/**
 * Utility functions for subscription limit checking
 */

/**
 * Check if a limit value represents unlimited access
 * 
 * @param value - The limit value to check
 * @returns True if the value represents unlimited access
 */
export function isUnlimited(value: number): boolean {
  return value >= 999999 || value === Infinity || !isFinite(value);
}

/**
 * Validate a user ID string
 * 
 * @param userId - The user ID to validate
 * @returns True if the user ID is valid
 */
export function isValidUserId(userId: unknown): userId is string {
  return typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Validate a show ID string
 * 
 * @param showId - The show ID to validate
 * @returns True if the show ID is valid
 */
export function isValidShowId(showId: unknown): showId is string {
  return typeof showId === 'string' && showId.trim().length > 0;
}

