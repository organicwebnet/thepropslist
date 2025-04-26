import { FirebaseService } from './types';
import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  CollectionReference,
  Query,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { FirebaseDocument } from './types';

interface SyncMetadata {
  lastSyncTimestamp: number;
  collections: string[];
}

export class OfflineSyncService {
  private syncMetadataKey = 'propsBible_syncMetadata';
  private isInitialized = false;

  constructor(private firebase: FirebaseService) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.firebase.offline().enableSync();
      this.isInitialized = true;
      console.log('Offline sync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline sync:', error);
      throw error;
    }
  }

  private async getSyncMetadata(): Promise<SyncMetadata> {
    const stored = localStorage.getItem(this.syncMetadataKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      lastSyncTimestamp: 0,
      collections: ['props', 'shows', 'users', 'packs']
    };
  }

  private async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    localStorage.setItem(this.syncMetadataKey, JSON.stringify(metadata));
  }

  private async getCollectionDocs(collectionName: string, afterTimestamp: number): Promise<FirebaseDocument[]> {
    const db = this.firebase.firestore();
    const collectionRef = db.collection(collectionName);
    const docs = await collectionRef.where('updatedAt', '>', new Date(afterTimestamp)).get();
    return docs;
  }

  async syncCollection(collectionName: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline sync not initialized');
    }

    const metadata = await this.getSyncMetadata();
    
    try {
      // Get documents updated since last sync
      const docs = await this.getCollectionDocs(collectionName, metadata.lastSyncTimestamp);
      console.log(`Syncing ${docs.length} documents from ${collectionName}`);

      // Cache documents locally
      for (const doc of docs) {
        const data = await doc.get();
        if (data) {
          await this.cacheDocument(collectionName, doc.id, data);
        }
      }

    } catch (error) {
      console.error(`Failed to sync collection ${collectionName}:`, error);
      throw error;
    }
  }

  private async cacheDocument(collection: string, id: string, data: any): Promise<void> {
    const cacheKey = `${collection}_${id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  async getCachedDocument(collection: string, id: string): Promise<any | null> {
    const cacheKey = `${collection}_${id}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Check if cache is still valid (24 hours)
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    }
    return null;
  }

  async syncAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline sync not initialized');
    }

    const metadata = await this.getSyncMetadata();
    
    try {
      for (const collectionName of metadata.collections) {
        await this.syncCollection(collectionName);
      }

      // Update sync metadata
      await this.updateSyncMetadata({
        ...metadata,
        lastSyncTimestamp: Date.now()
      });

      console.log('All collections synced successfully');
    } catch (error) {
      console.error('Failed to sync all collections:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    const metadata = await this.getSyncMetadata();
    
    // Clear all cached documents
    for (const collectionName of metadata.collections) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`${collectionName}_`));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    }

    // Reset sync metadata
    await this.updateSyncMetadata({
      lastSyncTimestamp: 0,
      collections: metadata.collections
    });

    console.log('Cache cleared successfully');
  }

  async getSyncStatus(): Promise<{
    isEnabled: boolean;
    lastSync: number;
    syncedCollections: string[];
  }> {
    const metadata = await this.getSyncMetadata();
    const syncStatus = await this.firebase.offline().getSyncStatus();

    return {
      isEnabled: syncStatus.isEnabled,
      lastSync: metadata.lastSyncTimestamp,
      syncedCollections: metadata.collections
    };
  }
} 