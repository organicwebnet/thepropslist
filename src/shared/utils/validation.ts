/**
 * Validation utilities
 * Shared validation functions for consistent validation across the app
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates email address format
 * Uses RFC 5322 compliant regex (simplified version)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates email and returns detailed result
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email address is required' };
  }
  
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  return { valid: true };
}

/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/**
 * Validates Firebase user ID format
 * Firebase UIDs are typically 28 characters alphanumeric
 */
export function isValidUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  
  // Firebase UID format: alphanumeric, typically 28 characters
  const uidRegex = /^[a-zA-Z0-9_-]{20,}$/;
  return uidRegex.test(userId);
}

/**
 * Validates verification code format
 * Must be exactly 6 digits
 */
export function isValidVerificationCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  return /^\d{6}$/.test(code);
}

/**
 * Validates display name
 * Must be non-empty and reasonable length
 */
export function validateDisplayName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (name.trim().length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }
  
  return { valid: true };
}

/**
 * Sanitises text input by escaping HTML and trimming
 * Prevents XSS attacks by escaping dangerous characters
 */
export function sanitiseTextInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim whitespace
  let sanitised = input.trim();
  
  // Escape HTML entities to prevent XSS
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  sanitised = sanitised.replace(/[&<>"'/]/g, (match) => htmlEscapes[match] || match);
  
  return sanitised;
}

/**
 * Sanitises text for Firestore storage
 * Removes potentially dangerous characters and limits length
 */
export function sanitiseForFirestore(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, maxLength); // Limit length
}

