// Web-only Firebase types - React Native Firebase not available in web environment
// import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
// import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
// import type { FirebaseStorageTypes } from '@react-native-firebase/storage';
import { Auth as FirebaseAuthJs, User as FirebaseUserJs, UserCredential } from 'firebase/auth';
import { 
  Firestore as WebFirestore, 
  DocumentReference as WebDocumentReference, 
  CollectionReference as WebCollectionReference, 
  Timestamp as WebTimestamp, 
  DocumentData as WebDocumentData,
  DocumentSnapshot as WebDocumentSnapshot,
  QuerySnapshot as WebQuerySnapshot,
  QueryDocumentSnapshot as WebQueryDocumentSnapshot,
  Query as WebQuery,
  WhereFilterOp,
  Transaction as WebTransaction,
  WriteBatch as WebWriteBatch,
} from 'firebase/firestore';
import type { CardData, MemberData, ListData } from '../../types/taskManager';

// Re-export specific types that are used elsewhere
export type { Show } from '../../../types/index';
export type { Prop } from '../../types/props';
export type { Task } from '../../types/tasks';
export type { BoardData as TodoBoard, ListData, MemberData } from '../../types/taskManager';

// --- App-Specific Data Structures ---

export type { Act, Contact, Scene, Venue, ShowCollaborator } from '../../types/index';

// --- Custom Error ---
export class FirebaseError extends Error {
    constructor(public message: string, public code: string, public originalError?: any) {
        super(message);
        this.name = 'FirebaseError';
    }
}

// --- Web-Only Firebase Types (React Native Firebase not available in web) ---

export type CustomFirestore = WebFirestore;
export type CustomAuth = FirebaseAuthJs;
export type CustomUser = FirebaseUserJs;
export type CustomStorage = any; // Web storage type placeholder
export type CustomTimestamp = WebTimestamp;
export type DocumentData = WebDocumentData;

export type CustomDocumentReference<T extends DocumentData = DocumentData> = WebDocumentReference<T>;
export type CustomCollectionReference<T extends DocumentData = DocumentData> = WebCollectionReference<T>;
export type DocumentSnapshot<T extends DocumentData = DocumentData> = WebDocumentSnapshot<T>;
export type QuerySnapshot<T extends DocumentData = DocumentData> = WebQuerySnapshot<T>;
export type QueryDocumentSnapshot<T extends DocumentData = DocumentData> = WebQueryDocumentSnapshot<T>;
export type FirestoreQuery<T extends DocumentData = DocumentData> = WebQuery<T>;
export type CustomTransaction = WebTransaction;
export type CustomWriteBatch = WebWriteBatch;
export type CustomUserCredential = UserCredential;

// Wrapper for document to include ID
export interface FirebaseDocument<T extends DocumentData = DocumentData> {
  id: string;
  data: T;
  exists: boolean;
  ref: CustomDocumentReference<T>;
}

// --- Querying ---
export type QueryOptions = {
  where?: [string, WhereFilterOp, any][];
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
};

// Re-export for use in other services
export type { WhereFilterOp };

// --- Offline Sync ---
export interface PendingOperation {
  id: string;
  type: 'add' | 'update' | 'delete';
  collection: string;
  docId?: string;
  data: any;
  timestamp: number;
}

export interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  pendingOperations: number;
  error?: string;
}

export interface QueueStatus {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
}


export interface OfflineSync {
  enableSync(): Promise<void>;
  disableSync(): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;
  getQueueStatus(): Promise<QueueStatus>;
  retryFailedOperations(): Promise<void>;
  clearQueue(): Promise<void>;
}


// --- Main Firebase Service Interface ---

export type WhereClause = [string, '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'not-in' | 'array-contains-any', any];

export interface FirebaseService {
    // Properties
    auth: CustomAuth;
    firestore: CustomFirestore;
    storage: CustomStorage;
    offline: () => OfflineSync;

    // Core Methods
    initialize(): Promise<void>;
    
    // Firestore Document/Collection Methods
    getDocument<T extends DocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null>;
    getDocuments<T extends DocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]>;
    addDocument<T extends DocumentData>(collectionPath: string, data: Omit<T, 'id'>): Promise<FirebaseDocument<T>>;
    setDocument<T extends DocumentData>(collectionPath: string, docId: string, data: T): Promise<void>;
    updateDocument<T extends DocumentData>(collectionPath: string, docId: string, data: Partial<T>): Promise<void>;
    deleteDocument(collectionPath: string, docId: string): Promise<void>;
    
    // Firestore Listener Methods
    listenToDocument<T extends DocumentData>(path: string, onNext: (doc: FirebaseDocument<T>) => void, onError?: (error: Error) => void): () => void;
    listenToCollection<T extends DocumentData>(
      collectionName: string,
      callback: (data: FirebaseDocument<T>[]) => void,
      errorCallback: (error: Error) => void,
      options?: {
        where?: WhereClause[];
        orderBy?: [string, 'asc' | 'desc'][];
      }
    ): () => void;
    getBoardMembers(boardId: string): Promise<MemberData[]>;

    // Transaction and Batch
    runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T>;
    batch(): CustomWriteBatch;

    // Auth methods
    signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
    createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
    sendPasswordResetEmail(email: string): Promise<void>;
    signOut(): Promise<void>;

    // Storage methods
    uploadFile(path: string, file: string | File, metadata?: any): Promise<string>;
    deleteFile(path: string): Promise<void>;

    // Helpers
    getFirestoreJsInstance(): WebFirestore;

    // App-specific methods (consider moving to a dedicated service)
    deleteShow(showId: string): Promise<void>;

    // Task board card methods
    updateCard(boardId: string, listId: string, cardId: string, updates: Partial<CardData>): Promise<void>;
    deleteCard(boardId: string, listId: string, cardId: string): Promise<void>;
    reorderCardsInList(boardId: string, listId: string, orderedCards: CardData[]): Promise<void>;

    // Task board methods
    addList(boardId: string, listData: Omit<ListData, 'id'>): Promise<ListData>;
    reorderLists(boardId: string, orderedLists: ListData[]): Promise<void>;
    addCard(boardId: string, listId: string, cardData: Omit<CardData, 'id' | 'boardId' | 'listId'>): Promise<CardData>;
    moveCardToList(boardId: string, cardId: string, originalListId: string, targetListId: string, newOrder: number): Promise<void>;

    getCollection<T extends DocumentData>(
      collectionName: string,
      options?: {
        where?: WhereClause[];
        orderBy?: [string, 'asc' | 'desc'][];
        limit?: number;
      }
    ): Promise<FirebaseDocument<T>[]>;
}

// --- Timestamp Helper Functions ---

export const isWebTimestamp = (timestamp: any): timestamp is WebTimestamp => {
    return timestamp && typeof timestamp.toDate === 'function' && !timestamp.nanoseconds;
};

export const getTimestamp = (date: Date): CustomTimestamp => {
    // Web-only implementation
    return WebTimestamp.fromDate(date);
};

// --- Storage Reference Types ---
// Platform-specific types should be imported in platform code, not here, to avoid linter errors if modules are missing.
// export type CustomStorageReference = RNStorageReference | WebStorageReference;
// export type FirebaseStorage = WebFirebaseStorage | FirebaseStorageTypes.Module;
// export type FirebaseFirestore = FirebaseFirestoreTypes.Module; 
