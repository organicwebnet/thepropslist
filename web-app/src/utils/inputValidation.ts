/**
 * Input Validation Utilities
 * 
 * Shared validation functions for forms and user input
 */

/**
 * Sanitise text input by escaping HTML and trimming
 */
export function sanitiseTextInput(input: string): string {
  if (!input) return '';
  
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
 * Validate task title
 */
export function validateTaskTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || !title.trim()) {
    return { isValid: false, error: 'Task title is required' };
  }
  
  const trimmed = title.trim();
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Task title must be at least 3 characters' };
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Task title must be less than 200 characters' };
  }
  
  return { isValid: true };
}

/**
 * Validate due date is not in the past
 */
export function validateDueDate(dueDate: string | null, allowPast: boolean = false): { isValid: boolean; error?: string } {
  if (!dueDate) return { isValid: true }; // Optional field
  
  const date = new Date(dueDate);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  if (!allowPast && date < new Date()) {
    // Allow same day but not past days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);
    
    if (inputDate < today) {
      return { isValid: false, error: 'Due date cannot be in the past' };
    }
  }
  
  return { isValid: true };
}

/**
 * Validate prop name (used in task descriptions)
 */
export function sanitisePropName(name: string): string {
  if (!name) return '';
  // Remove markdown-style link syntax that could cause issues
  return name.replace(/\[@([^\]]+)\]\([^)]+\)/g, '$1').trim();
}








