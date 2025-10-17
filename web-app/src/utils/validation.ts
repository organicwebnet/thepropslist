/**
 * Input validation and sanitization utilities
 * Provides consistent validation across the application
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Sanitizes text input by removing potentially dangerous characters
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
}

/**
 * Validates and sanitizes board title
 */
export function validateBoardTitle(title: string): ValidationResult {
  const sanitized = sanitizeText(title);
  
  if (!sanitized) {
    return {
      isValid: false,
      error: 'Board title is required'
    };
  }
  
  if (sanitized.length < 1) {
    return {
      isValid: false,
      error: 'Board title must be at least 1 character long'
    };
  }
  
  if (sanitized.length > 100) {
    return {
      isValid: false,
      error: 'Board title must be less than 100 characters'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
}

/**
 * Validates and sanitizes list title
 */
export function validateListTitle(title: string): ValidationResult {
  const sanitized = sanitizeText(title);
  
  if (!sanitized) {
    return {
      isValid: false,
      error: 'List title is required'
    };
  }
  
  if (sanitized.length < 1) {
    return {
      isValid: false,
      error: 'List title must be at least 1 character long'
    };
  }
  
  if (sanitized.length > 50) {
    return {
      isValid: false,
      error: 'List title must be less than 50 characters'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
}

/**
 * Validates and sanitizes card title
 */
export function validateCardTitle(title: string): ValidationResult {
  const sanitized = sanitizeText(title);
  
  if (!sanitized) {
    return {
      isValid: false,
      error: 'Card title is required'
    };
  }
  
  if (sanitized.length < 1) {
    return {
      isValid: false,
      error: 'Card title must be at least 1 character long'
    };
  }
  
  if (sanitized.length > 200) {
    return {
      isValid: false,
      error: 'Card title must be less than 200 characters'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
}

/**
 * Validates and sanitizes card description
 */
export function validateCardDescription(description: string): ValidationResult {
  if (!description) {
    return {
      isValid: true,
      sanitizedValue: ''
    };
  }
  
  const sanitized = sanitizeText(description);
  
  if (sanitized.length > 1000) {
    return {
      isValid: false,
      error: 'Card description must be less than 1000 characters'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
}

/**
 * Validates mention text (for @mentions)
 */
export function validateMentionText(text: string): ValidationResult {
  const sanitized = sanitizeText(text);
  
  if (!sanitized) {
    return {
      isValid: false,
      error: 'Mention text is required'
    };
  }
  
  if (sanitized.length < 1) {
    return {
      isValid: false,
      error: 'Mention text must be at least 1 character long'
    };
  }
  
  if (sanitized.length > 50) {
    return {
      isValid: false,
      error: 'Mention text must be less than 50 characters'
    };
  }
  
  // Check for valid mention format
  const mentionRegex = /^@(prop|container|user):[a-zA-Z0-9_-]+$/;
  if (!mentionRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Invalid mention format'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: sanitized
  };
}

/**
 * Validates user ID format
 */
export function validateUserId(userId: string): ValidationResult {
  if (!userId) {
    return {
      isValid: false,
      error: 'User ID is required'
    };
  }
  
  // Firebase user IDs are typically 28 characters long and contain alphanumeric characters
  const userIdRegex = /^[a-zA-Z0-9_-]{20,30}$/;
  if (!userIdRegex.test(userId)) {
    return {
      isValid: false,
      error: 'Invalid user ID format'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: userId
  };
}

/**
 * Validates board ID format
 */
export function validateBoardId(boardId: string): ValidationResult {
  if (!boardId) {
    return {
      isValid: false,
      error: 'Board ID is required'
    };
  }
  
  // Firebase document IDs are typically 20 characters long and contain alphanumeric characters
  const boardIdRegex = /^[a-zA-Z0-9_-]{15,25}$/;
  if (!boardIdRegex.test(boardId)) {
    return {
      isValid: false,
      error: 'Invalid board ID format'
    };
  }
  
  return {
    isValid: true,
    sanitizedValue: boardId
  };
}

/**
 * Generic validation function that can be used with any validator
 */
export function validateInput<T>(
  input: T,
  validator: (input: T) => ValidationResult
): ValidationResult {
  try {
    return validator(input);
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}
