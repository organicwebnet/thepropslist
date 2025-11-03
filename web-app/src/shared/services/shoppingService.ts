import { FirebaseService, FirebaseDocument } from './firebase/types';
import { ShoppingItem, ShoppingOption, ShoppingOptionComment } from '../types/shopping';
import { NotificationService } from './notificationService';
import { NotificationTargetingService, TeamMember } from '../../utils/notificationTargeting';
import { getNotificationTitle, getNotificationMessage } from '../../utils/notificationTemplates';
import type { NotificationType } from '../types/notification';
import { ShoppingServiceBase } from '../../../../src/shared/services/shoppingServiceBase';

/**
 * Web ShoppingService - extends base service with notification capabilities
 * Uses shared base implementation to reduce code duplication while adding web-specific features
 */
export class ShoppingService extends ShoppingServiceBase {
  private notificationService: NotificationService;
  private notificationTargeting: NotificationTargetingService | null = null;

  constructor(
    firebaseService: FirebaseService,
    teamMembers?: TeamMember[],
    currentUser?: { id: string; roles: string[] }
  ) {
    super(firebaseService);
    this.notificationService = new NotificationService(firebaseService);
    if (teamMembers && currentUser) {
      this.notificationTargeting = new NotificationTargetingService(teamMembers, currentUser);
    }
  }

  // Override addShoppingItem to add notifications

  async addShoppingItem(item: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>): Promise<string> {
    const docId = await super.addShoppingItem(item);
    
    // Send notification to supervisors (don't fail if notification fails)
    try {
      const newItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', docId);
      if (newItem?.data) {
        await this.sendNotification('shopping_item_requested', { ...newItem.data, id: docId }, docId);
      }
    } catch (notificationError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send notification for new shopping item:', notificationError);
      }
      // Don't throw - the item was added successfully
    }
    
    return docId;
  }

  async updateShoppingItem(itemId: string, updates: Partial<ShoppingItem>): Promise<void> {
    const currentItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', itemId);
    if (!currentItem?.data) {
      throw new Error('Shopping item not found');
    }

    // Call base implementation
    await super.updateShoppingItem(itemId, updates);

    // Send notifications based on status change (don't fail if notification fails)
    if (updates.status) {
      try {
        await this.handleStatusChangeNotification(currentItem.data, updates.status, itemId);
      } catch (notificationError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send status change notification:', notificationError);
        }
        // Don't throw - the item was updated successfully
      }
    }

    // Check for budget exceeded (don't fail if notification fails)
    if (updates.actualCost && currentItem.data.budget && updates.actualCost > currentItem.data.budget) {
      const updatedItem = { ...currentItem.data, ...updates };
      try {
        await this.sendNotification('shopping_budget_exceeded', updatedItem, itemId);
      } catch (notificationError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send budget exceeded notification:', notificationError);
        }
        // Don't throw - the item was updated successfully
      }
    }
  }

  async addOptionToItem(itemId: string, option: Omit<ShoppingOption, 'createdAt' | 'updatedAt'>): Promise<void> {
    // Get current item before calling super
    const currentItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', itemId);
    if (!currentItem?.data) {
      throw new Error('Shopping item not found');
    }

    const now = new Date().toISOString();
    const newOption: ShoppingOption = {
      ...option,
      createdAt: now,
      updatedAt: now
    };

    // Call base implementation
    await super.addOptionToItem(itemId, option);

    // Send notification about new option (don't fail if notification fails)
    try {
      await this.sendNotification('shopping_option_added', currentItem.data, itemId, newOption);
    } catch (notificationError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send notification for new option:', notificationError);
      }
      // Don't throw - the option was added successfully
    }
  }

  async updateOption(itemId: string, optionIndex: number, updates: Partial<ShoppingOption>): Promise<void> {
    const currentItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', itemId);
    if (!currentItem?.data) {
      throw new Error('Shopping item not found');
    }

    const options = [...(currentItem.data.options || [])];
    if (optionIndex >= options.length) {
      throw new Error('Option not found');
    }

    const previousStatus = options[optionIndex].status;

    // Call base implementation
    await super.updateOption(itemId, optionIndex, updates);

    // Get updated item for notification
    const updatedItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', itemId);
    const updatedOptions = updatedItem?.data?.options || [];

    // Send notifications for option status changes (don't fail if notification fails)
    if (updates.status && updates.status !== previousStatus && updatedOptions[optionIndex]) {
      const notificationType = this.getNotificationTypeForOptionStatus(updates.status);
      if (notificationType) {
        try {
          await this.sendNotification(notificationType, updatedItem.data, itemId, updatedOptions[optionIndex], optionIndex);
        } catch (notificationError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to send notification for option status change:', notificationError);
          }
          // Don't throw - the option was updated successfully
        }
      }
    }
  }

  // Notification helper methods
  private async sendNotification(
    type: NotificationType,
    item: ShoppingItem,
    itemId: string,
    option?: ShoppingOption,
    optionIndex?: number
  ): Promise<void> {
    if (!this.notificationTargeting) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Notification targeting not configured, skipping notification');
      }
      return;
    }

    try {
      const targets = this.notificationTargeting.getNotificationTargets(type, item, { optionIndex });
      
      for (const target of targets) {
        await this.notificationService.create({
          userId: target.userId,
          showId: item.showId,
          type,
          title: getNotificationTitle(type, item, option),
          message: getNotificationMessage(type, item, option),
          entity: { kind: 'shopping_item', id: itemId },
          read: false,
          createdAt: new Date(),
          metadata: {
            shoppingItemId: itemId,
            itemDescription: item.description,
            itemType: item.type,
            showId: item.showId,
            budget: item.budget,
            actualCost: item.actualCost,
            assignedTo: item.assignedTo,
            requestedBy: item.requestedBy,
            optionIndex,
            shopName: option?.shopName
          }
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send notification:', error);
      }
    }
  }

  private async handleStatusChangeNotification(
    item: ShoppingItem,
    newStatus: string,
    itemId: string
  ): Promise<void> {
    const notificationType = this.getNotificationTypeForStatus(newStatus);
    if (notificationType) {
      try {
        await this.sendNotification(notificationType, item, itemId);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send status change notification:', error);
        }
        // Don't throw - the status was updated successfully
      }
    }
  }

  private getNotificationTypeForStatus(status: string): NotificationType | null {
    switch (status) {
      case 'approved': return 'shopping_item_approved';
      case 'rejected': return 'shopping_item_rejected';
      case 'assigned': return 'shopping_item_assigned';
      case 'purchased': return 'shopping_item_purchased';
      case 'delivered': return 'shopping_item_delivered';
      default: return null;
    }
  }

  private getNotificationTypeForOptionStatus(status: string): NotificationType | null {
    switch (status) {
      case 'buy': return 'shopping_option_selected';
      case 'rejected': return 'shopping_option_rejected';
      default: return null;
    }
  }

  // Method to update team members and current user for notification targeting
  updateNotificationTargeting(
    teamMembers: TeamMember[],
    currentUser: { id: string; roles: string[] }
  ): void {
    this.notificationTargeting = new NotificationTargetingService(teamMembers, currentUser);
  }
}
