export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_due_today'
  | 'prop_change_request'
  | 'comment'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  showId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  entity?: { kind: 'task' | 'prop' | 'packList' | 'container'; id: string };
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export type AppNotificationDocument = Omit<AppNotification, 'id'>;


