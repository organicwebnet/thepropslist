/**
 * Shared types for container comments and activity logs
 * Used by both web and mobile applications
 */

export interface ContainerComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarInitials?: string;
  text: string;
  createdAt: string; // ISO string
}

export interface ContainerActivity {
  id: string;
  type: string;
  userId: string;
  userName?: string;
  timestamp: string; // ISO string
  details?: any;
}

