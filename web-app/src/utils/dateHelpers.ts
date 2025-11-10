/**
 * Date Helper Utilities
 * 
 * Shared utilities for parsing and formatting dates consistently across the app
 */

/**
 * Safely parse a date from various Firestore/input formats
 */
export function parseFirestoreDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'number' && !isNaN(input)) return new Date(input);
  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (input && typeof input.toDate === 'function') {
    try {
      const d = input.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Format date for display in UK format
 */
export function formatDateUK(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date with time in UK format
 */
export function formatDateTimeUK(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get relative date string (e.g., "2 days ago", "Tomorrow")
 */
export function getRelativeDate(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  if (diffDays >= 7 && diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDateUK(date);
}








