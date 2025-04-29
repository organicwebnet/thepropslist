// import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
// import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
// import type { FirebaseStorageTypes } from '@react-native-firebase/storage';

// Placeholder Types - Define the actual structure later based on usage
export type CustomAuth = any; // Placeholder
export type CustomFirestore = any; // Placeholder
export type CustomStorage = any; // Placeholder
export type CustomTransaction = any; // Placeholder
export type CustomWriteBatch = any; // Placeholder
export type CustomDocumentData = Record<string, any>; // Basic placeholder
export type CustomDocumentReference<T = CustomDocumentData> = any; // Placeholder
export type CustomCollectionReference<T = CustomDocumentData> = any; // Placeholder
export type CustomStorageReference = any; // Placeholder
export type CustomUser = any; // Placeholder
export type CustomUserCredential = any; // Placeholder for UserCredential

// Add exports for core service types using placeholders
export type FirebaseAuth = CustomAuth;
export type FirebaseFirestore = CustomFirestore;
export type FirebaseStorage = CustomStorage;

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
  ref: CustomDocumentReference<T>;
  data?: T;
  get(): Promise<T | undefined>;
  set(data: T): Promise<void>;
  update(data: Partial<T>): Promise<void>;
  delete(): Promise<void>;
}

export interface FirebaseCollection<T = any> {
  add(data: T): Promise<FirebaseDocument<T>>;
  doc(id: string): FirebaseDocument<T>;
  where(field: string, op: string, value: any): FirebaseCollection<T>;
  orderBy(field: string, direction?: 'asc' | 'desc'): FirebaseCollection<T>;
  limit(limit: number): FirebaseCollection<T>;
  get(): Promise<FirebaseDocument<T>[]>;
}

// Change FirebaseError from an interface to a class
export class FirebaseError extends Error {
  code: string;
  originalError?: unknown;

  constructor(message: string, code: string, originalError?: unknown) {
    super(message);
    this.name = 'FirebaseError'; // Standard practice for custom errors
    this.code = code;
    this.originalError = originalError;
    // Ensure the prototype chain is correct
    Object.setPrototypeOf(this, FirebaseError.prototype);
  }
}

// Define QueryOptions type here as well, mirroring the implementation
// (Alternatively, define it once and import it here and in WebFirebaseService)
import { WhereFilterOp } from 'firebase/firestore'; // Make sure this is imported
/**
 * A type representing the options for querying Firestore collections.
 * Allows specifying filtering, ordering, and limiting of query results.
 */
export type QueryOptions = {
  where?: [string, WhereFilterOp, any][];
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
};

export interface FirebaseService {
  initialize(): Promise<void>;
  initializeService?(): Promise<void>;
  auth(): CustomAuth; // Updated type
  firestore(): CustomFirestore; // Updated type
  storage(): FirebaseStorage | CustomStorage; // Updated type
  offline(): OfflineSync;

  // Add Email/Password Auth Methods
  signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
  createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
  sendPasswordResetEmail(email: string): Promise<void>;
  // Google Sign-in placeholder - needs specific implementation
  // signInWithGoogle(): Promise<CustomUserCredential>; 
  // signOut(): Promise<void>; // Add if needed

  runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T>; // Updated type
  batch(): CustomWriteBatch; // Updated type
  listenToDocument<T extends CustomDocumentData>( // Updated constraint
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void;
  listenToCollection<T extends CustomDocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void,
    options?: QueryOptions
  ): () => void;
  createDocumentWrapper<T extends CustomDocumentData>( // Updated constraint
    docRef: CustomDocumentReference<T>
  ): FirebaseDocument<T>; // Use the updated FirebaseDocument type
  getStorageRef(path: string): CustomStorageReference; // Updated return type
  deleteDocument(collectionPath: string, documentId: string): Promise<void>;
  getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null>;
  updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void>;
  addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>>;
  uploadFile(path: string, file: File): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getSyncStatus?(): boolean;
  enableSync?(): Promise<void>;
  disableSync?(): Promise<void>;
  // Add Show specific methods
  deleteShow(showId: string): Promise<void>;
} 