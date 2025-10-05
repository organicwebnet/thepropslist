import { FirebaseService } from './types.ts';
import { FirebaseDocument } from './types.ts';

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
    await this.firebase.offline().enableSync();
    this.isInitialized = true;
  }

  private async getSyncMetadata(): Promise<SyncMetadata> {
    const stored = localStorage.getItem(this.syncMetadataKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      lastSyncTimestamp: 0,
      collections: ['props', 'shows', 'userProfiles', 'packs']
    };
  }

  private async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    localStorage.setItem(this.syncMetadataKey, JSON.stringify(metadata));
  }

  private async getCollectionDocs(collectionName: string, afterTimestamp: number): Promise<FirebaseDocument[]> {
    const options = {
      where: [['updatedAt', '>', new Date(afterTimestamp)] as [string, any, any]]
    };
    const documents = await this.firebase.getDocuments<any>(collectionName, options);
    return documents;
  }

  async syncCollection(collectionName: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline sync not initialized');
    }
    const metadata = await this.getSyncMetadata();
    // Get documents updated since last sync
    const docs = await this.getCollectionDocs(collectionName, metadata.lastSyncTimestamp);
    // Cache documents locally
    for (const doc of docs) {
      const data = await (doc as any).get();
      if (data) {
        await this.cacheDocument(collectionName, doc.id, data);
      }
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
    for (const collectionName of metadata.collections) {
      await this.syncCollection(collectionName);
    }
    // Update sync metadata
    await this.updateSyncMetadata({
      ...metadata,
      lastSyncTimestamp: Date.now()
    });
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
  }

  async getSyncStatus(): Promise<{
    isEnabled: boolean;
    lastSync: number;
    syncedCollections: string[];
  }> {
    const metadata = await this.getSyncMetadata();
    const syncStatus = await this.firebase.offline().getSyncStatus();

    return {
      isEnabled: (syncStatus as any).isEnabled,
      lastSync: metadata.lastSyncTimestamp,
      syncedCollections: metadata.collections
    };
  }
} 
