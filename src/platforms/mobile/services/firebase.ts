import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FirebaseService, 
  FirebaseError, 
  FirebaseDocument,
  OfflineSync,
  PendingOperation,
  QueueStatus,
  SyncStatus,
  CustomDocumentData, 
  CustomDocumentReference
} from '../../../shared/services/firebase/types';

export class MobileFirebaseService implements FirebaseService {
  protected _auth: FirebaseAuthTypes.Module;
  protected _firestore: FirebaseFirestoreTypes.Module;
  protected _storage: FirebaseStorageTypes.Module;
  private syncEnabled = true;
  private offlineQueue: OfflineSync;

  constructor() {
    this._auth = auth();
    this._firestore = firestore();
    this._storage = storage();

    this.offlineQueue = {
      initialize: async () => {
        // Initialize offline queue
      },
      getItem: async <T>(key: string): Promise<T | null> => {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      },
      setItem: async <T>(key: string, value: T): Promise<void> => {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      },
      removeItem: async (key: string): Promise<void> => {
        await AsyncStorage.removeItem(key);
      },
      clear: async (): Promise<void> => {
        await AsyncStorage.clear();
      },
      enableSync: async (): Promise<void> => {
        // Enable sync
      },
      disableSync: async (): Promise<void> => {
        // Disable sync
      },
      getSyncStatus: async (): Promise<SyncStatus> => {
        return {
          isEnabled: this.syncEnabled,
          isOnline: true,
          pendingOperations: 0,
          lastSyncTimestamp: null
        };
      },
      queueOperation: async (operation: PendingOperation): Promise<void> => {
        // Queue operation
      },
      getQueueStatus: async (): Promise<QueueStatus> => {
        return {
          pending: 0,
          processing: 0,
          lastProcessed: null,
          failedOperations: 0
        };
      }
    };
  }

  private createError(error: unknown): FirebaseError {
    const err = error as { code?: string; message?: string };
    return {
      code: err.code || 'unknown',
      message: err.message || 'An unknown error occurred',
      originalError: error,
      name: 'FirebaseError'
    };
  }

  async initialize(): Promise<void> {
    await this.offlineQueue.initialize();
  }

  async enableSync(): Promise<void> {
    this.syncEnabled = true;
    await this.offlineQueue.enableSync();
  }

  async disableSync(): Promise<void> {
    this.syncEnabled = false;
    await this.offlineQueue.disableSync();
  }

  getSyncStatus(): boolean {
    return this.syncEnabled;
  }

  listenToDocument<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    const docRef = firestore().doc(path) as FirebaseFirestoreTypes.DocumentReference<T>;
    
    return docRef.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.DocumentSnapshot<T>) => {
        if (snapshot.exists) {
          const wrappedDoc = this.createDocumentWrapper(docRef) as FirebaseDocument<T>;
          onNext(wrappedDoc);
        }
      },
      (error: Error) => {
        if (onError) {
          onError(this.createError(error));
        }
      }
    );
  }

  listenToCollection<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const collectionRef = firestore().collection(path) as FirebaseFirestoreTypes.CollectionReference<T>;
    
    return collectionRef.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot<T>) => {
        const docs = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<T>) => {
          const wrappedDoc = this.createDocumentWrapper(doc.ref) as FirebaseDocument<T>;
          return wrappedDoc;
        });
        onNext(docs);
      },
      (error: Error) => {
        if (onError) {
          onError(this.createError(error));
        }
      }
    );
  }

  async runTransaction<T>(
    updateFunction: (transaction: FirebaseFirestoreTypes.Transaction) => Promise<T>
  ): Promise<T> {
    return this._firestore.runTransaction(updateFunction);
  }

  batch(): FirebaseFirestoreTypes.WriteBatch {
    return this._firestore.batch();
  }

  getStorageRef(path: string): FirebaseStorageTypes.Reference {
    return this._storage.ref(path);
  }

  createDocumentWrapper(
    docRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>
  ): FirebaseDocument<any> {
    const firestoreDocRef = docRef;
    return {
      id: firestoreDocRef.id,
      ref: firestoreDocRef as any,
      data: undefined,
      get: async () => {
        const snapshot = await firestoreDocRef.get();
        return snapshot.exists ? snapshot.data() : undefined;
      },
      set: async (data: any) => {
        await firestoreDocRef.set(data);
      },
      update: async (data: any) => {
        await firestoreDocRef.update(data);
      },
      delete: async () => {
        await firestoreDocRef.delete();
      },
    };
  }

  offline(): OfflineSync {
    return this.offlineQueue;
  }

  auth(): FirebaseAuthTypes.Module {
    return this._auth;
  }

  firestore(): FirebaseFirestoreTypes.Module {
    return this._firestore;
  }

  storage(): FirebaseStorageTypes.Module {
    return this._storage;
  }
} 