import type { ShoppingItem, ShoppingOption } from '../shared/types/shopping';
import type { NotificationType } from '../shared/types/notification';

export interface NotificationTemplate {
  title: (item: ShoppingItem, option?: ShoppingOption) => string;
  message: (item: ShoppingItem, option?: ShoppingOption) => string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'in_app' | 'email')[];
}

export const SHOPPING_NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  // Existing notification types (minimal templates)
  task_assigned: {
    title: (_item: ShoppingItem) => 'Task Assigned',
    message: (_item: ShoppingItem) => 'You have been assigned a new task',
    action: 'View Task',
    priority: 'medium',
    channels: ['in_app']
  },
  task_due_soon: {
    title: (_item: ShoppingItem) => 'Task Due Soon',
    message: (_item: ShoppingItem) => 'A task is due soon',
    action: 'View Task',
    priority: 'high',
    channels: ['push', 'in_app']
  },
  task_due_today: {
    title: (_item: ShoppingItem) => 'Task Due Today',
    message: (_item: ShoppingItem) => 'A task is due today',
    action: 'View Task',
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  prop_change_request: {
    title: (_item: ShoppingItem) => 'Prop Change Request',
    message: (_item: ShoppingItem) => 'A prop change has been requested',
    action: 'Review Request',
    priority: 'medium',
    channels: ['in_app']
  },
  comment: {
    title: (_item: ShoppingItem) => 'New Comment',
    message: (_item: ShoppingItem) => 'A new comment has been added',
    action: 'View Comment',
    priority: 'low',
    channels: ['in_app']
  },
  system: {
    title: (_item: ShoppingItem) => 'System Notification',
    message: (_item: ShoppingItem) => 'System notification',
    action: 'View Details',
    priority: 'medium',
    channels: ['in_app']
  },

  // Shopping List Workflow Notifications
  shopping_item_requested: {
    title: (item: ShoppingItem) => `🛍️ New Shopping Request`,
    message: (item: ShoppingItem) => 
      `${item.description} requested by ${item.requestedBy}. Budget: £${item.budget || 'Not specified'}`,
    action: 'Review Request',
    priority: 'medium',
    channels: ['in_app', 'email']
  },
  
  shopping_item_assigned: {
    title: (item: ShoppingItem) => `📋 ${item.description} Assigned to You`,
    message: (item: ShoppingItem) => 
      `You've been assigned to shop for "${item.description}". Please find suitable options.`,
    action: 'Start Shopping',
    priority: 'high',
    channels: ['push', 'in_app']
  },
  
  shopping_item_approved: {
    title: (item: ShoppingItem) => `✅ ${item.description} Approved`,
    message: (item: ShoppingItem) => 
      `Your request for "${item.description}" has been approved. Budget: £${item.budget || 'Not specified'}`,
    action: 'Start Shopping',
    priority: 'high',
    channels: ['push', 'in_app']
  },
  
  shopping_item_rejected: {
    title: (item: ShoppingItem) => `❌ ${item.description} Rejected`,
    message: (item: ShoppingItem) => 
      `Your request for "${item.description}" has been rejected. Please review requirements.`,
    action: 'Review Request',
    priority: 'medium',
    channels: ['in_app', 'email']
  },
  
  shopping_option_added: {
    title: (item: ShoppingItem) => `🛒 New Option for ${item.description}`,
    message: (item: ShoppingItem) => 
      `A new shopping option has been added for "${item.description}". Please review.`,
    action: 'Review Option',
    priority: 'medium',
    channels: ['in_app']
  },
  
  shopping_option_selected: {
    title: (item: ShoppingItem, option?: ShoppingOption) => 
      `🎯 Option Selected for ${item.description}`,
    message: (item: ShoppingItem, option?: ShoppingOption) => 
      `Please purchase from ${option?.shopName || 'selected shop'} for £${option?.price || 'specified price'}`,
    action: 'View Details',
    priority: 'high',
    channels: ['push', 'in_app']
  },
  
  shopping_option_rejected: {
    title: (item: ShoppingItem) => `❌ Option Rejected for ${item.description}`,
    message: (item: ShoppingItem) => 
      `Your option for "${item.description}" has been rejected. Please find alternatives.`,
    action: 'Find Alternatives',
    priority: 'medium',
    channels: ['in_app']
  },
  
  shopping_item_purchased: {
    title: (item: ShoppingItem) => `🛒 ${item.description} Purchased`,
    message: (item: ShoppingItem) => 
      `"${item.description}" has been purchased and will be delivered soon.`,
    action: 'View Details',
    priority: 'high',
    channels: ['push', 'in_app', 'email']
  },
  
  shopping_item_delivered: {
    title: (item: ShoppingItem) => `📦 ${item.description} Delivered`,
    message: (item: ShoppingItem) => 
      `"${item.description}" has been delivered and is ready for use.`,
    action: 'Confirm Delivery',
    priority: 'medium',
    channels: ['in_app', 'email']
  },
  
  shopping_budget_exceeded: {
    title: (item: ShoppingItem) => `⚠️ Budget Exceeded`,
    message: (item: ShoppingItem) => 
      `${item.description} purchase exceeds budget by £${((item.actualCost || 0) - (item.budget || 0)).toFixed(2)}`,
    action: 'Review Purchase',
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  
  shopping_reminder: {
    title: (item: ShoppingItem) => `⏰ Reminder: ${item.description}`,
    message: (item: ShoppingItem) => 
      `Don't forget to shop for "${item.description}". Due soon!`,
    action: 'Shop Now',
    priority: 'medium',
    channels: ['push', 'in_app']
  },
  
  shopping_approval_needed: {
    title: (item: ShoppingItem) => `⏳ Approval Needed: ${item.description}`,
    message: (item: ShoppingItem) => 
      `"${item.description}" is waiting for your approval.`,
    action: 'Review Request',
    priority: 'high',
    channels: ['push', 'in_app']
  },
  
  shopping_material_request: {
    title: (item: ShoppingItem) => `🔧 Material Request: ${item.description}`,
    message: (item: ShoppingItem) => 
      `New material request for "${item.description}" from maker.`,
    action: 'Review Request',
    priority: 'medium',
    channels: ['in_app', 'email']
  },
  
  shopping_material_approved: {
    title: (item: ShoppingItem) => `✅ Material Approved: ${item.description}`,
    message: (item: ShoppingItem) => 
      `Material request for "${item.description}" has been approved.`,
    action: 'Purchase Materials',
    priority: 'high',
    channels: ['push', 'in_app']
  },
  
  shopping_task_linked: {
    title: (item: ShoppingItem) => `🔗 Task Linked: ${item.description}`,
    message: (item: ShoppingItem) => 
      `"${item.description}" has been linked to a task board item.`,
    action: 'View Task',
    priority: 'low',
    channels: ['in_app']
  },

  // Subscription-related notifications
  subscription_expiring_soon: {
    title: (_item: ShoppingItem) => '⚠️ Subscription Expiring Soon',
    message: (_item: ShoppingItem) => 
      'Your subscription will expire in 7 days. Renew now to continue enjoying all features.',
    action: 'Renew Subscription',
    priority: 'medium',
    channels: ['push', 'in_app', 'email']
  },
  subscription_expiring_today: {
    title: (_item: ShoppingItem) => '🔔 Subscription Expiring Today',
    message: (_item: ShoppingItem) => 
      'Your subscription expires today. Renew now to avoid losing access to premium features.',
    action: 'Renew Now',
    priority: 'high',
    channels: ['push', 'in_app', 'email']
  },
  subscription_expired: {
    title: (_item: ShoppingItem) => '❌ Subscription Expired',
    message: (_item: ShoppingItem) => 
      'Your subscription has expired. Renew now to restore access to all features.',
    action: 'Renew Subscription',
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  subscription_payment_failed: {
    title: (_item: ShoppingItem) => '💳 Payment Failed',
    message: (_item: ShoppingItem) => 
      'Payment for your subscription failed. Please update your payment method to continue service.',
    action: 'Update Payment',
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  subscription_upgrade_available: {
    title: (_item: ShoppingItem) => '⬆️ Upgrade Available',
    message: (_item: ShoppingItem) => 
      'You can upgrade your subscription to access more features and higher limits.',
    action: 'View Plans',
    priority: 'low',
    channels: ['in_app']
  }
};

export const getNotificationTemplate = (type: NotificationType): NotificationTemplate => {
  return SHOPPING_NOTIFICATION_TEMPLATES[type];
};

export const getNotificationTitle = (type: NotificationType, item: ShoppingItem, option?: ShoppingOption): string => {
  const template = getNotificationTemplate(type);
  return template.title(item, option);
};

export const getNotificationMessage = (type: NotificationType, item: ShoppingItem, option?: ShoppingOption): string => {
  const template = getNotificationTemplate(type);
  return template.message(item, option);
};

export const getNotificationAction = (type: NotificationType): string => {
  const template = getNotificationTemplate(type);
  return template.action;
};

export const getNotificationPriority = (type: NotificationType): 'low' | 'medium' | 'high' | 'urgent' => {
  const template = getNotificationTemplate(type);
  return template.priority;
};

export const getNotificationChannels = (type: NotificationType): ('push' | 'in_app' | 'email')[] => {
  const template = getNotificationTemplate(type);
  return template.channels;
};
