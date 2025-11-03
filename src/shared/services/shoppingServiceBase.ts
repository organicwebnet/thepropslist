import { FirebaseService, FirebaseDocument } from './firebase/types';
import { ShoppingItem, ShoppingOption, ShoppingOptionComment } from '../../types/shopping';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base ShoppingService with core functionality shared between mobile and web
 * Web-specific features like notifications should be added via extension
 */
export class ShoppingServiceBase {
  constructor(protected firebaseService: FirebaseService) {}

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
    return doc.id;
  }

  async updateShoppingItem(itemId: string, updates: Partial<ShoppingItem>): Promise<void> {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await this.firebaseService.updateDocument('shopping_items', itemId, updatedData);
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
}

