import { FirebaseService, FirebaseDocument } from './firebase/types';
import { ShoppingItem, ShoppingOption, ShoppingOptionComment } from '../types/shopping';
import { NotificationService } from './notificationService';
import { NotificationTargetingService, TeamMember } from '../../utils/notificationTargeting';
import { getNotificationTitle, getNotificationMessage } from '../../utils/notificationTemplates';
import type { NotificationType } from '../types/notification';
import { v4 as uuidv4 } from 'uuid';

export class ShoppingService {
  private notificationService: NotificationService;
  private notificationTargeting: NotificationTargetingService | null = null;

  constructor(
    private firebaseService: FirebaseService,
    teamMembers?: TeamMember[],
    currentUser?: { id: string; roles: string[] }
  ) {
    this.notificationService = new NotificationService(firebaseService);
    if (teamMembers && currentUser) {
      this.notificationTargeting = new NotificationTargetingService(teamMembers, currentUser);
    }
  }

  async getShoppingItems(showId?: string): Promise<FirebaseDocument<ShoppingItem>[]> {
    const options = showId 
      ? { where: [['showId', '==', showId] as [string, any, any]] }
      : undefined;
    
    return this.firebaseService.getDocuments<ShoppingItem>('shopping_items', options);
  }

  async addShoppingItem(item: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>): Promise<string> {
    const now = new Date().toISOString();
    const newItem: Omit<ShoppingItem, 'id'> = {
      ...item,
      createdAt: now,
      updatedAt: now,
      lastUpdated: now,
      options: []
    };

    const doc = await this.firebaseService.addDocument<ShoppingItem>('shopping_items', newItem);
    
    // Send notification to supervisors (don't fail if notification fails)
    try {
      await this.sendNotification('shopping_item_requested', { ...newItem, id: doc.id }, doc.id);
    } catch (notificationError) {
      console.warn('Failed to send notification for new shopping item:', notificationError);
      // Don't throw - the item was added successfully
    }
    
    return doc.id;
  }

  async updateShoppingItem(itemId: string, updates: Partial<ShoppingItem>): Promise<void> {
    const currentItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', itemId);
    if (!currentItem?.data) {
      throw new Error('Shopping item not found');
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await this.firebaseService.updateDocument('shopping_items', itemId, updatedData);

    // Send notifications based on status change (don't fail if notification fails)
    if (updates.status) {
      try {
        await this.handleStatusChangeNotification(currentItem.data, updates.status, itemId);
      } catch (notificationError) {
        console.warn('Failed to send status change notification:', notificationError);
        // Don't throw - the item was updated successfully
      }
    }

    // Check for budget exceeded (don't fail if notification fails)
    if (updates.actualCost && currentItem.data.budget && updates.actualCost > currentItem.data.budget) {
      const updatedItem = { ...currentItem.data, ...updates };
      try {
        await this.sendNotification('shopping_budget_exceeded', updatedItem, itemId);
      } catch (notificationError) {
        console.warn('Failed to send budget exceeded notification:', notificationError);
        // Don't throw - the item was updated successfully
      }
    }
  }

  async addOptionToItem(itemId: string, option: Omit<ShoppingOption, 'createdAt' | 'updatedAt'>): Promise<void> {
    // Get current item
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

    const updatedOptions = [...(currentItem.data.options || []), newOption];
    
    await this.updateShoppingItem(itemId, { 
      options: updatedOptions,
      // Update item status if this is the first option
      status: currentItem.data.options.length === 0 ? 'approved' : currentItem.data.status
    });

    // Send notification about new option (don't fail if notification fails)
    try {
      await this.sendNotification('shopping_option_added', currentItem.data, itemId, newOption);
    } catch (notificationError) {
      console.warn('Failed to send notification for new option:', notificationError);
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
    options[optionIndex] = {
      ...options[optionIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Check if any option is marked as 'buy' to update item status
    const hasBuyOption = options.some(opt => opt.status === 'buy');
    const itemStatus = hasBuyOption ? 'picked' : currentItem.data.status;

    await this.updateShoppingItem(itemId, { 
      options,
      status: itemStatus
    });

    // Send notifications for option status changes (don't fail if notification fails)
    if (updates.status && updates.status !== previousStatus) {
      const notificationType = this.getNotificationTypeForOptionStatus(updates.status);
      if (notificationType) {
        try {
          await this.sendNotification(notificationType, currentItem.data, itemId, options[optionIndex], optionIndex);
        } catch (notificationError) {
          console.warn('Failed to send notification for option status change:', notificationError);
          // Don't throw - the option was updated successfully
        }
      }
    }
  }

  async addCommentToOption(
    itemId: string, 
    optionIndex: number, 
    commentText: string, 
    author: string, 
    authorType: 'shopper' | 'supervisor' | 'system' = 'shopper'
  ): Promise<void> {
    const currentItem = await this.firebaseService.getDocument<ShoppingItem>('shopping_items', itemId);
    if (!currentItem?.data) {
      throw new Error('Shopping item not found');
    }

    const options = [...(currentItem.data.options || [])];
    if (optionIndex >= options.length) {
      throw new Error('Option not found');
    }

    const newComment: ShoppingOptionComment = {
      id: uuidv4(),
      text: commentText.trim(),
      author: author,
      timestamp: new Date().toISOString(),
      type: authorType
    };

    // Add comment to the option
    const existingComments = options[optionIndex].comments || [];
    options[optionIndex] = {
      ...options[optionIndex],
      comments: [...existingComments, newComment],
      updatedAt: new Date().toISOString()
    };

    await this.updateShoppingItem(itemId, { 
      options,
    });
  }

  async deleteShoppingItem(itemId: string): Promise<void> {
    await this.firebaseService.deleteDocument('shopping_items', itemId);
  }

  async uploadOptionImages(images: string[]): Promise<string[]> {
    const uploadPromises = images.map(async (imageUri, index) => {
      const fileName = `shopping_option_${uuidv4()}_${index}.jpg`;
      const storagePath = `shopping_images/${fileName}`;
      return this.firebaseService.uploadFile(storagePath, imageUri);
    });

    return Promise.all(uploadPromises);
  }

  listenToShoppingItems(
    onUpdate: (items: FirebaseDocument<ShoppingItem>[]) => void,
    onError: (error: Error) => void,
    showId?: string
  ): () => void {
    const options = showId 
      ? { where: [['showId', '==', showId] as [string, any, any]] }
      : undefined;

    return this.firebaseService.listenToCollection<ShoppingItem>(
      'shopping_items',
      onUpdate,
      onError,
      options
    );
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
      console.warn('Notification targeting not configured, skipping notification');
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
      console.error('Failed to send notification:', error);
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
        console.warn('Failed to send status change notification:', error);
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
