import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// import firestore from '@react-native-firebase/firestore'; // Keep this commented, use the passed instance
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'; // Import the specific type
import { FirebaseFirestore, FirebaseDocument } from '../../../../shared/services/firebase/types';
// import { OfflineOperation } from './OfflineOperationStore'; // Commented out: Cannot find module

// Define a placeholder type if OfflineOperation is used elsewhere in the file
type OfflineOperation = any;

interface SyncMetadata {
  lastSyncTimestamp: number;
  collections: string[];
}

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data?: any;
  timestamp: number;
}

export class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private syncMetadataKey = 'propsBible_syncMetadata';
  private pendingOperationsKey = 'propsBible_pendingOperations';
  private isInitialized = false;
  private firestore: FirebaseFirestore;

  private constructor(firestore: FirebaseFirestore) {
    this.firestore = firestore;
  }

  static getInstance(firestore: FirebaseFirestore): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager(firestore);
    }
    return OfflineSyncManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize sync metadata if not exists
      const metadata = await this.getSyncMetadata();
      if (!metadata) {
        await this.updateSyncMetadata({
          lastSyncTimestamp: 0,
          collections: ['props', 'shows', 'users', 'packs'],
        });
      }

      this.isInitialized = true;
      console.log('Offline sync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline sync:', error);
      throw error;
    }
  }

  private async getSyncMetadata(): Promise<SyncMetadata | null> {
    try {
      const stored = await AsyncStorage.getItem(this.syncMetadataKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting sync metadata:', error);
      return null;
    }
  }

  private async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(this.syncMetadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating sync metadata:', error);
      throw error;
    }
  }

  private async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const stored = await AsyncStorage.getItem(this.pendingOperationsKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  }

  private async addPendingOperation(operation: PendingOperation): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      operations.push(operation);
      await AsyncStorage.setItem(this.pendingOperationsKey, JSON.stringify(operations));
    } catch (error) {
      console.error('Error adding pending operation:', error);
      throw error;
    }
  }

  private async removePendingOperation(operationId: string): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      const filtered = operations.filter(op => op.id !== operationId);
      await AsyncStorage.setItem(this.pendingOperationsKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending operation:', error);
      throw error;
    }
  }

  async cacheDocument(collection: string, id: string, data: any): Promise<void> {
    try {
      const key = `${collection}_${id}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error caching document:', error);
      throw error;
    }
  }

  async getCachedDocument(collection: string, id: string): Promise<any | null> {
    try {
      const key = `${collection}_${id}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        // Check if cache is still valid (24 hours)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached document:', error);
      return null;
    }
  }

  async queueOperation(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data?: any
  ): Promise<void> {
    const operation: PendingOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      collection,
      data,
      timestamp: Date.now(),
    };
    await this.addPendingOperation(operation);
    await this.processPendingOperations();
  }

  async processPendingOperations(): Promise<void> {
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (!isConnected) return;

    const operations = await this.getPendingOperations();
    const rnFirestore = this.firestore as FirebaseFirestoreTypes.Module; // Cast to RN type
    for (const operation of operations) {
      try {
        const collection = rnFirestore.collection(operation.collection);
        switch (operation.type) {
          case 'create':
            await collection.add(operation.data);
            break;
          case 'update':
            await collection.doc(operation.data.id).update(operation.data);
            break;
          case 'delete':
            await collection.doc(operation.data.id).delete();
            break;
        }
        await this.removePendingOperation(operation.id);
      } catch (error) {
        console.error('Error processing operation:', error);
        // Keep the operation in the queue if it fails
      }
    }
  }

  async syncCollection(collectionName: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline sync not initialized');
    }

    const metadata = await this.getSyncMetadata();
    if (!metadata) return;
    const rnFirestore = this.firestore as FirebaseFirestoreTypes.Module; // Cast to RN type

    try {
      const collection = rnFirestore.collection(collectionName);
      const query = collection.where('updatedAt', '>', new Date(metadata.lastSyncTimestamp));
      const docsSnapshot = await query.get();

      for (const doc of docsSnapshot.docs) {
        const data = doc.data();
        await this.cacheDocument(collectionName, doc.id, data);
      }

      await this.updateSyncMetadata({
        ...metadata,
        lastSyncTimestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to sync collection ${collectionName}:`, error);
      throw error;
    }
  }

  async syncAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline sync not initialized');
    }

    const metadata = await this.getSyncMetadata();
    if (!metadata) return;

    try {
      for (const collectionName of metadata.collections) {
        await this.syncCollection(collectionName);
      }
    } catch (error) {
      console.error('Failed to sync all collections:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    const metadata = await this.getSyncMetadata();
    if (!metadata) return;

    try {
      // Clear all cached documents
      for (const collectionName of metadata.collections) {
        const keys = await AsyncStorage.getAllKeys();
        const collectionKeys = keys.filter(key => key.startsWith(`${collectionName}_`));
        await AsyncStorage.multiRemove(collectionKeys);
      }

      // Reset sync metadata
      await this.updateSyncMetadata({
        lastSyncTimestamp: 0,
        collections: metadata.collections,
      });

      // Clear pending operations
      await AsyncStorage.removeItem(this.pendingOperationsKey);
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async getSyncStatus(): Promise<{
    isEnabled: boolean;
    lastSync: number;
    syncedCollections: string[];
    pendingOperations: number;
  }> {
    const metadata = await this.getSyncMetadata();
    const operations = await this.getPendingOperations();

    return {
      isEnabled: this.isInitialized,
      lastSync: metadata?.lastSyncTimestamp || 0,
      syncedCollections: metadata?.collections || [],
      pendingOperations: operations.length,
    };
  }
} 