import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import { OfflineSync, PendingOperation, QueueStatus, SyncStatus } from '../../../shared/services/firebase/types.ts';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const STORAGE_KEYS = {
  OFFLINE_SYNC: 'offlineSync',
  PENDING_OPERATIONS: 'pendingOperations',
  SYNC_STATUS: 'syncStatus',
  RETRY_ATTEMPTS: 'retryAttempts'
};

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

interface RetryMetadata {
  attempts: number;
  lastAttempt: number;
}

export class MobileOfflineSync implements OfflineSync {
  private isEnabled = false;
  private isOnline = true;
  private pendingOperations: PendingOperation[] = [];
  private lastSyncTimestamp: number | null = null;
  private isProcessing = false;
  private lastProcessed: number | null = null;
  private retryMetadata: Map<string, RetryMetadata> = new Map();

  constructor(private firestoreInstance: FirebaseFirestoreTypes.Module) {
    this.initialize();
    this.setupNetworkListener();
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline && this.isEnabled) {
        // Network restored - process pending operations
        this.processPendingOperations();
      }
    });
  }

  async initialize(): Promise<void> {
    const [syncEnabled, operations, retryData] = await Promise.all([
      AsyncStorage.default.getItem(STORAGE_KEYS.OFFLINE_SYNC),
      AsyncStorage.default.getItem(STORAGE_KEYS.PENDING_OPERATIONS),
      AsyncStorage.default.getItem(STORAGE_KEYS.RETRY_ATTEMPTS)
    ]);

    this.isEnabled = syncEnabled === 'true';
    this.pendingOperations = operations ? JSON.parse(operations) : [];
    
    if (retryData) {
      const retryMap = new Map(Object.entries(JSON.parse(retryData)));
      this.retryMetadata = new Map(
        Array.from(retryMap.entries()).map(([key, value]) => [
          key,
          value as RetryMetadata
        ])
      );
    }

    this.lastSyncTimestamp = Date.now();
    
    // Check for operations that were processing when the app closed
    this.resetStuckOperations();
  }

  private async resetStuckOperations(): Promise<void> {
    const stuckOperations = this.pendingOperations.filter(op => op.isProcessing);
    for (const operation of stuckOperations) {
      operation.isProcessing = false;
    }
    await this.saveOperations();
  }

  async getItem<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.default.getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.default.setItem(key, stringValue);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.default.removeItem(key);
  }

  async clear(): Promise<void> {
    await AsyncStorage.default.multiRemove([
      STORAGE_KEYS.OFFLINE_SYNC,
      STORAGE_KEYS.PENDING_OPERATIONS,
      STORAGE_KEYS.SYNC_STATUS
    ]);
    this.pendingOperations = [];
    this.lastSyncTimestamp = null;
    this.lastProcessed = null;
  }

  async enableSync(): Promise<void> {
    this.isEnabled = true;
    await this.setItem(STORAGE_KEYS.OFFLINE_SYNC, 'true');
    if (this.isOnline) {
      await this.processPendingOperations();
    }
    await this.firestoreInstance.enableNetwork();
  }

  async disableSync(): Promise<void> {
    this.isEnabled = false;
    await this.setItem(STORAGE_KEYS.OFFLINE_SYNC, 'false');
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return {
      isEnabled: this.isEnabled,
      isOnline: this.isOnline,
      pendingOperations: this.pendingOperations.length,
      lastSyncTimestamp: this.lastSyncTimestamp
    };
  }

  async queueOperation(operation: PendingOperation): Promise<void> {
    const operationWithMetadata = {
      ...operation,
      id: operation.id || uuidv4(),
      timestamp: Date.now(),
      isProcessing: false,
      priority: operation.priority || 'normal'
    };

    this.pendingOperations.push(operationWithMetadata);
    
    // Sort operations by priority and timestamp
    this.pendingOperations.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      return priorityDiff === 0 ? (a.timestamp || 0) - (b.timestamp || 0) : priorityDiff;
    });
    
    await this.saveOperations();

    if (this.isEnabled && this.isOnline && !this.isProcessing) {
      await this.processPendingOperations();
    }
  }

  private async saveOperations(): Promise<void> {
    await this.setItem(STORAGE_KEYS.PENDING_OPERATIONS, this.pendingOperations);
  }

  private async saveRetryMetadata(): Promise<void> {
    const retryData = Object.fromEntries(this.retryMetadata);
    await this.setItem(STORAGE_KEYS.RETRY_ATTEMPTS, retryData);
  }

  async getQueueStatus(): Promise<QueueStatus> {
    return {
      pending: this.pendingOperations.filter(op => !op.isProcessing).length,
      processing: this.pendingOperations.filter(op => op.isProcessing).length,
      lastProcessed: this.lastProcessed
    };
  }

  private async processPendingOperations(): Promise<void> {
    if (this.isProcessing || !this.isEnabled || !this.isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      const operations = [...this.pendingOperations];
      for (const operation of operations) {
        if (!operation.isProcessing) {
          await this.processOperation(operation);
        }
      }

      this.lastProcessed = Date.now();
      this.lastSyncTimestamp = Date.now();
      
      await this.saveOperations();
      await this.saveRetryMetadata();
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOperation(operation: PendingOperation): Promise<void> {
    const retryMeta = this.retryMetadata.get(operation.id) || {
      attempts: 0,
      lastAttempt: 0
    };

    if (retryMeta.attempts >= MAX_RETRY_ATTEMPTS) {
      // Operation has failed too many times
      operation.error = `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`;
      return;
    }

    const now = Date.now();
    if (retryMeta.lastAttempt && now - retryMeta.lastAttempt < RETRY_DELAY) {
      // Not enough time has passed since last attempt
      return;
    }

    operation.isProcessing = true;
    retryMeta.attempts++;
    retryMeta.lastAttempt = now;
    this.retryMetadata.set(operation.id, retryMeta);

    try {
      await operation.execute();
      // Operation successful - remove it from the queue
      this.pendingOperations = this.pendingOperations.filter(
        op => op.id !== operation.id
      );
      this.retryMetadata.delete(operation.id);
    } catch (error) {
      operation.isProcessing = false;
      operation.error = error instanceof Error ? error.message : String(error);
      
      // Log the error for debugging
      console.error(`Operation ${operation.id} failed:`, operation.error);
      
      // If this was the last retry attempt, mark it as failed
      if (retryMeta.attempts >= MAX_RETRY_ATTEMPTS) {
        operation.status = 'failed';
      }
    }
  }
} 