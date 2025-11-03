/**
 * Task Helper Utilities
 * 
 * Shared utilities for task-related calculations and formatting
 */

export type UrgencyLevel = 'overdue' | 'urgent' | 'upcoming' | 'soon';

export interface TaskUrgency {
  level: UrgencyLevel;
  label: string;
  color: string;
  daysUntil: number;
}

/**
 * Calculate task urgency based on due date
 */
export function getTaskUrgency(dueDate: Date, now: Date = new Date()): TaskUrgency {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      level: 'overdue',
      label: 'Overdue',
      color: 'bg-red-600 text-white',
      daysUntil: diffDays,
    };
  } else if (diffDays <= 2) {
    return {
      level: 'urgent',
      label: 'Due Soon',
      color: 'bg-orange-500 text-white',
      daysUntil: diffDays,
    };
  } else if (diffDays <= 7) {
    return {
      level: 'upcoming',
      label: 'This Week',
      color: 'bg-yellow-500 text-white',
      daysUntil: diffDays,
    };
  } else {
    return {
      level: 'soon',
      label: 'Upcoming',
      color: 'bg-green-600 text-white',
      daysUntil: diffDays,
    };
  }
}

/**
 * Format due date with relative time
 */
export function formatDueDate(dueDate: Date, now: Date = new Date()): string {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return dueDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined,
    });
  }
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < now.getTime();
}

/**
 * Check if a date is within N days
 */
export function isWithinDays(date: Date, days: number, now: Date = new Date()): boolean {
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

