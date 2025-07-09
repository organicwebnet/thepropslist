import type { CustomTimestamp } from '../services/firebase/types';

export interface Task {
  id: string;
  title: string;
  description?: string;
  showId: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: CustomTimestamp;
  updatedAt: CustomTimestamp;
  dueDate?: CustomTimestamp;
  createdBy: string; // User ID
  assignedTo: string[]; // Array of User IDs
  tags?: string[];
  attachments?: { name: string; url: string }[];
  comments?: any[]; // Replace with a proper Comment type if needed
  relatedTo?: string; // e.g., Prop ID, Character ID
  department?: string;
  completedAt?: CustomTimestamp;
  isRecurring?: boolean;
  recurringPattern?: any; // Define a proper recurring pattern type
} 
