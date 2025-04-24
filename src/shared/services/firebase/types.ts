import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { FirebaseStorageTypes } from '@react-native-firebase/storage';

export type OperationType = 'create' | 'update' | 'delete' | 'upload';

export interface OfflineOperation<T = any> {
  id: string;
  type: OperationType;
  collection: string;
  data: T;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

export type OperationPriority = 'high' | 'normal' | 'low';
export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncStatus {
  isEnabled: boolean;
  isOnline: boolean;
  pendingOperations: number;
  lastSyncTimestamp: number | null;
  failedOperations?: number;
  nextRetryAttempt?: number;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  lastProcessed: number | null;
  failedOperations?: number;
}

export interface PendingOperation {
  id: string;
  execute: () => Promise<void>;
  timestamp?: number;
  isProcessing?: boolean;
  error?: string;
  priority?: OperationPriority;
  status?: OperationStatus;
  type?: string;
  collection?: string;
  documentId?: string;
  data?: any;
}

export interface OfflineSync {
  initialize(): Promise<void>;
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  enableSync(): Promise<void>;
  disableSync(): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;
  queueOperation(operation: PendingOperation): Promise<void>;
  getQueueStatus(): Promise<QueueStatus>;
}

export interface FirebaseDocument<T = any> {
  id: string;
  data: T;
  ref: FirebaseFirestoreTypes.DocumentReference<T>;
}

export interface FirebaseCollection<T = any> {
  add(data: T): Promise<FirebaseDocument<T>>;
  doc(id: string): FirebaseDocument<T>;
  where(field: string, op: string, value: any): FirebaseCollection<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): FirebaseCollection<T>;
  limit(limit: number): FirebaseCollection<T>;
  get(): Promise<FirebaseDocument<T>[]>;
}

export interface FirebaseError {
  message: string;
  code: string;
  originalError?: unknown;
}

export interface FirebaseService {
  initialize(): Promise<void>;
  auth(): FirebaseAuthTypes.Module;
  firestore(): FirebaseFirestoreTypes.Module;
  storage(): FirebaseStorageTypes.Module;
  offline(): OfflineSync;
  runTransaction<T>(updateFunction: (transaction: FirebaseFirestoreTypes.Transaction) => Promise<T>): Promise<T>;
  batch(): FirebaseFirestoreTypes.WriteBatch;
  listenToDocument<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void;
  listenToCollection<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void
  ): () => void;
  createDocumentWrapper<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string
  ): FirebaseFirestoreTypes.DocumentReference<T>;
  getStorageRef(path: string): FirebaseStorageTypes.Reference;
} 