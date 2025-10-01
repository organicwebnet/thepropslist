import type { DocumentData } from 'firebase/firestore';
import type { UserCredential } from 'firebase/auth';

export interface FirebaseDocument<T extends DocumentData> {
  id: string;
  data: T;
}

export interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  pendingOperations: number;
  error?: string;
}

export interface OfflineService {
  enableSync(): Promise<void>;
  disableSync(): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;
}

export interface FirebaseService {
  addDocument<T extends DocumentData>(collectionName: string, data: T): Promise<FirebaseDocument<T>>;
  getDocument<T extends DocumentData>(collectionName: string, id: string): Promise<FirebaseDocument<T> | null>;
  updateDocument<T extends DocumentData>(collectionName: string, id: string, data: Partial<T>): Promise<void>;
  deleteDocument(collectionName: string, id: string): Promise<void>;
  listenToCollection<T extends DocumentData>(
    collectionName: string,
    callback: (documents: FirebaseDocument<T>[]) => void,
    onError: (error: Error) => void,
    options?: { where?: [string, string, any][]; orderBy?: [string, 'asc' | 'desc'][]; limit?: number; startAfter?: DocumentData; },
  ): () => void;
  // Added for consistency with existing mobile context, even if web doesn't fully implement
  offline(): OfflineService;
  auth: {
    signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
    signOut(): Promise<void>;
    createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
  }
} 