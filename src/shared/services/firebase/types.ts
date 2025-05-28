// import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
// import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
// import type { FirebaseStorageTypes } from '@react-native-firebase/storage';

import { Auth as FirebaseAuthJs, User as FirebaseUserJs } from 'firebase/auth'; // For JS SDK Auth and User types
import { Firestore as WebFirestore, DocumentReference as WebDocumentReference, CollectionReference as WebCollectionReference, Timestamp as WebTimestamp, DocumentData } from 'firebase/firestore'; // Corrected import for WebFirestore and added DocumentData
import { FirebaseAuthTypes } from '@react-native-firebase/auth'; // For RN Firebase User type if needed for mobile-specific parts
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'; // Import RN Firestore types
import { Address } from '../../types/address.ts'; // Corrected import path for the detailed Address type
import { WhereFilterOp } from 'firebase/firestore'; // Make sure this is imported
import { Prop } from '../../types/props.ts'; // Import Prop type

// Placeholder Types - Define the actual structure later based on usage
// export type CustomAuth = any; // Placeholder - REPLACED BELOW
export type CustomFirestore = FirebaseFirestoreTypes.Module | WebFirestore; // Union type
export type CustomStorage = any; // Placeholder
export type CustomTransaction = any; // Placeholder for FirebaseFirestoreTypes.Transaction | import('firebase/firestore').Transaction
export type CustomWriteBatch = any;  // Placeholder for FirebaseFirestoreTypes.WriteBatch | import('firebase/firestore').WriteBatch
export type CustomDocumentData = Record<string, any>; // This is compatible with Firebase DocumentData

// Use specific SDK types where possible, T must extend CustomDocumentData for Web types
export type CustomDocumentReference<T extends CustomDocumentData = CustomDocumentData> = 
  FirebaseFirestoreTypes.DocumentReference<T> | 
  WebDocumentReference<T>; // WebDocumentReference<T extends DocumentData>

export type CustomCollectionReference<T extends CustomDocumentData = CustomDocumentData> = 
  FirebaseFirestoreTypes.CollectionReference<T> |
  WebCollectionReference<T>; // WebCollectionReference<T extends DocumentData>

export type CustomTimestamp = FirebaseFirestoreTypes.Timestamp | WebTimestamp;

export type CustomStorageReference = any; // Placeholder
export type CustomUser = FirebaseUserJs | FirebaseAuthTypes.User; // Union type for user
export type CustomUserCredential = any; // Placeholder for UserCredential

// CustomAuth: Represents the core authentication state and state change notifications.
// Specific auth operations (signIn, signOut, etc.) are on the FirebaseService interface.
export interface CustomAuth {
  onAuthStateChanged(callback: (user: CustomUser | null) => void): () => void;
  currentUser: CustomUser | null;
  // readonly app: FirebaseApp; // Example property from base Auth, if needed by services
  // readonly name: string; // Example property from base Auth
}

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

export interface FirebaseDocument<T extends CustomDocumentData = CustomDocumentData> {
  id: string;
  ref: CustomDocumentReference<T>;
  data?: T;
  get(): Promise<T | undefined>;
  set(data: T): Promise<void>;
  update(data: Partial<T>): Promise<void>;
  delete(): Promise<void>;
}

export interface FirebaseCollection<T extends CustomDocumentData = CustomDocumentData> {
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
  auth(): CustomAuth; // Now uses the more specific CustomAuth interface
  firestore(): CustomFirestore;
  getFirestoreJsInstance(): WebFirestore; // Added for web
  getFirestoreReactNativeInstance(): FirebaseFirestoreTypes.Module; // Added for mobile
  storage(): FirebaseStorage | CustomStorage;
  offline(): OfflineSync;

  // Add Email/Password Auth Methods
  signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
  createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
  sendPasswordResetEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
  // Google Sign-in placeholder - needs specific implementation
  // signInWithGoogle(): Promise<CustomUserCredential>; 
  // signOut(): Promise<void>; // Add if needed

  runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T>;
  batch(): CustomWriteBatch;
  listenToDocument<T extends CustomDocumentData>(
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
  createDocumentWrapper<T extends CustomDocumentData>(
    docRef: CustomDocumentReference<T>
  ): FirebaseDocument<T>;
  getStorageRef(path: string): CustomStorageReference;
  deleteDocument(collectionPath: string, documentId: string): Promise<void>;
  getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null>;
  updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void>;
  addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>>;
  getDocuments<T extends CustomDocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]>;
  setDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: T, options?: { merge?: boolean }): Promise<void>;
  uploadFile(path: string, file: File | string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getSyncStatus?(): boolean;
  enableSync?(): Promise<void>;
  disableSync?(): Promise<void>;
  // Add Show specific methods
  deleteShow(showId: string): Promise<void>;
  getPropsByShowId(showId: string): Promise<FirebaseDocument<Prop>[]>; // Added method
}

// Modify Show interface to use CustomTimestamp
export interface Show {
  id: string;
  userId: string;
  name: string;
  description: string;
  startDate: string | CustomTimestamp | null; // Allow null
  endDate: string | CustomTimestamp | null;   // Allow null
  imageUrl?: string;
  acts?: Act[]; // Define Act interface if not already defined or imported
  createdAt: string | CustomTimestamp;
  updatedAt: string | CustomTimestamp;
  collaborators: ShowCollaborator[]; // Define ShowCollaborator interface
  stageManager: string;
  stageManagerEmail: string;
  stageManagerPhone?: string;
  propsSupervisor: string;
  propsSupervisorEmail: string;
  propsSupervisorPhone?: string;
  productionCompany: string;
  productionContactName: string;
  productionContactEmail: string;
  productionContactPhone?: string;
  venues: Venue[]; // Define Venue interface
  isTouringShow: boolean;
  contacts: Contact[]; // Define Contact interface
  logoImage?: { id: string; url: string; caption?: string };
  status?: 'planning' | 'active' | 'completed';
  rehearsalAddresses?: Address[]; // Define Address interface
  storageAddresses?: Address[];
  defaultActId?: string | number; // Or just number if that's what it will always be
  defaultSceneId?: string | number; // Or just number
}

// Define other related interfaces if they are not present
export interface Act {
    id: string | number;
    name: string;
    description?: string;
    scenes: Scene[];
}

export interface Scene {
    id: string | number;
    name: string;
    setting?: string;
    description?: string;
}

export interface Venue { // Basic structure, expand as needed
    name: string;
    address?: Address; // Assuming Address type is defined
    startDate?: string | CustomTimestamp | null;
    endDate?: string | CustomTimestamp | null;
    notes?: string;
}

export interface Contact { // Basic structure
    name: string;
    role: string;
    email?: string;
    phone?: string;
}

export interface ShowCollaborator {
    email: string;
    role: 'editor' | 'viewer';
    addedAt: string | CustomTimestamp; // Or Date string
    addedBy: string; // User email or ID
}

// export interface Address { // Basic structure -- REMOVE THIS OLD DEFINITION
//     street1?: string;
//     street2?: string;
//     city?: string;
//     state?: string;
//     postalCode?: string;
//     country?: string;
// } 