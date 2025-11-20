export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_due_today'
  | 'prop_change_request'
  | 'comment'
  | 'system'
  // Shopping List Workflow Notifications
  | 'shopping_item_requested'      // Designer requests new item
  | 'shopping_item_assigned'       // Item assigned to buyer
  | 'shopping_item_approved'       // Supervisor approves request
  | 'shopping_item_rejected'       // Supervisor rejects request
  | 'shopping_option_added'        // Buyer adds shopping option
  | 'shopping_option_selected'     // Supervisor selects option to buy
  | 'shopping_option_rejected'     // Supervisor rejects option
  | 'shopping_item_purchased'      // Buyer confirms purchase
  | 'shopping_item_delivered'      // Item delivered
  | 'shopping_budget_exceeded'     // Purchase exceeds budget
  | 'shopping_reminder'            // Reminder for pending items
  | 'shopping_approval_needed'     // Items waiting for approval
  | 'shopping_material_request'    // Material request from maker
  | 'shopping_material_approved'   // Material request approved
  | 'shopping_task_linked'         // Material linked to task board
  // Subscription-related notifications
  | 'subscription_expiring_soon'   // Subscription expiring in 7 days
  | 'subscription_expiring_today'  // Subscription expiring today
  | 'subscription_expired'         // Subscription has expired
  | 'subscription_payment_failed'  // Payment failed for subscription
  | 'subscription_upgrade_available'; // Upgrade available to higher tier

export interface AppNotification {
  id: string;
  userId: string;
  showId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  entity?: { kind: 'task' | 'prop' | 'packList' | 'container' | 'shopping_item'; id: string };
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ShoppingNotificationData {
  shoppingItemId: string;
  itemDescription: string;
  itemType: 'prop' | 'material' | 'hired';
  showId: string;
  budget?: number;
  actualCost?: number;
  assignedTo?: string;
  requestedBy: string;
  approvedBy?: string;
  optionIndex?: number;
  shopName?: string;
  taskId?: string; // For materials
  propId?: string; // For materials
}

export type AppNotificationDocument = Omit<AppNotification, 'id'>;


