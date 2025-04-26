import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseStorageTypes } from '@react-native-firebase/storage';
import { FirebaseError, FirebaseService, OfflineSync, FirebaseDocument } from '../../../shared/services/firebase/types';

import {
  CustomAuth,
  CustomFirestore,
  CustomStorage,
  CustomTransaction,
  CustomWriteBatch,
  CustomDocumentData,
  CustomDocumentReference,
  CustomStorageReference,
  SyncStatus,
  QueueStatus
} from '../../../shared/services/firebase/types';

class MobileOfflineSync implements OfflineSync {
  constructor(private firestoreInstance: FirebaseFirestoreTypes.Module) {}

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async getItem<T>(key: string): Promise<T | null> {
    console.warn('MobileOfflineSync getItem not implemented');
    return null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    console.warn('MobileOfflineSync setItem not implemented');
    return Promise.resolve();
  }

  async removeItem(key: string): Promise<void> {
    console.warn('MobileOfflineSync removeItem not implemented');
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    console.warn('MobileOfflineSync clear not implemented');
    return Promise.resolve();
  }

  async enableSync(): Promise<void> {
    try {
      await this.firestoreInstance.enableNetwork();
    } catch (error) {
      console.error("Error enabling Firestore network:", error);
    }
  }

  async disableSync(): Promise<void> {
    try {
      await this.firestoreInstance.disableNetwork();
    } catch (error) {
      console.error("Error disabling Firestore network:", error);
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    console.warn('MobileOfflineSync getSyncStatus returning mock data');
    return {
      isEnabled: true,
      isOnline: true,
      pendingOperations: 0,
      lastSyncTimestamp: null,
    };
  }

  async queueOperation(): Promise<void> {
    console.warn('MobileOfflineSync queueOperation not implemented');
    return Promise.resolve();
  }

  async getQueueStatus(): Promise<QueueStatus> {
    console.warn('MobileOfflineSync getQueueStatus returning mock data');
    return {
      pending: 0,
      processing: 0,
      lastProcessed: null
    };
  }
}

export class MobileFirebaseService implements FirebaseService {
  protected _firestore: FirebaseFirestoreTypes.Module;
  protected _auth: FirebaseAuthTypes.Module;
  protected _storage: FirebaseStorageTypes.Module;
  private _offlineSync: MobileOfflineSync;

  constructor() {
    this._firestore = firestore();
    this._auth = auth();
    this._storage = storage();
    this._offlineSync = new MobileOfflineSync(this._firestore);
  }

  async initialize(): Promise<void> {
    console.log("MobileFirebaseService initialized (using @react-native-firebase)");
    return Promise.resolve();
  }

  auth(): CustomAuth {
    if (!this._auth) throw new Error('Auth not initialized');
    return this._auth as CustomAuth;
  }

  firestore(): CustomFirestore {
    if (!this._firestore) throw new Error('Firestore not initialized');
    return this._firestore as CustomFirestore;
  }

  storage(): CustomStorage {
    if (!this._storage) throw new Error('Storage not initialized');
    return this._storage as CustomStorage;
  }

  offline(): OfflineSync {
    return this._offlineSync;
  }

  async runTransaction<T>(
    updateFunction: (transaction: CustomTransaction) => Promise<T>
  ): Promise<T> {
    return this._firestore.runTransaction(updateFunction as any);
  }

  batch(): CustomWriteBatch {
    return this._firestore.batch() as CustomWriteBatch;
  }

  private _snapshotToFirebaseDocument<T extends CustomDocumentData>(
    snapshot: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData> | FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
  ): FirebaseDocument<T> {
    const ref = snapshot.ref as CustomDocumentReference<T>;
    const data = snapshot.exists ? snapshot.data() as T : undefined;

    return {
      id: snapshot.id,
      ref: ref,
      data: data,
      get: async (): Promise<T | undefined> => {
        try {
          const docSnapshot = await ref.get();
          return docSnapshot.exists ? docSnapshot.data() as T : undefined;
        } catch (error) {
          this.handleError(`Error getting document ${snapshot.id}`, error);
        }
      },
      set: async (newData: T): Promise<void> => {
        try {
          await ref.set(newData);
        } catch (error) {
          this.handleError(`Error setting document ${snapshot.id}`, error);
        }
      },
      update: async (updateData: Partial<T>): Promise<void> => {
        try {
          await ref.update(updateData);
        } catch (error) {
          this.handleError(`Error updating document ${snapshot.id}`, error);
        }
      },
      delete: async (): Promise<void> => {
        try {
          await ref.delete();
        } catch (error) {
          this.handleError(`Error deleting document ${snapshot.id}`, error);
        }
      },
    };
  }

  listenToDocument<T extends CustomDocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    const listener = this._firestore.doc(path).onSnapshot(
      (snapshot: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) => {
        if (snapshot.exists) {
          const docData = this._snapshotToFirebaseDocument<T>(snapshot);
          onNext(docData);
        } else {
          console.log(`Document at path ${path} does not exist.`);
        }
      },
      (error: Error) => {
        console.error(`Error listening to document ${path}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );
    return listener; 
  }

  listenToCollection<T extends CustomDocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const listener = this._firestore.collection(path).onSnapshot(
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
        const docs = snapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc));
        onNext(docs);
      },
      (error: Error) => {
        console.error(`Error listening to collection ${path}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );
    return listener;
  }

  createDocumentWrapper<T extends CustomDocumentData>(
    path: string
  ): FirebaseDocument<T> {
    const ref = this._firestore.doc(path) as CustomDocumentReference<T>;
    return {
        id: ref.id,
        ref: ref,
        data: undefined,
        get: async (): Promise<T | undefined> => {
            try {
                const docSnapshot = await ref.get();
                return docSnapshot.exists ? docSnapshot.data() as T : undefined;
            } catch (error) {
                this.handleError(`Error getting document ${path}`, error);
            }
        },
        set: async (newData: T): Promise<void> => {
            try {
                await ref.set(newData);
            } catch (error) {
                this.handleError(`Error setting document ${path}`, error);
            }
        },
        update: async (updateData: Partial<T>): Promise<void> => {
            try {
                await ref.update(updateData);
            } catch (error) {
                this.handleError(`Error updating document ${path}`, error);
            }
        },
        delete: async (): Promise<void> => {
            try {
                await ref.delete();
            } catch (error) {
                this.handleError(`Error deleting document ${path}`, error);
            }
        },
    };
  }

  getStorageRef(path: string): CustomStorageReference {
    return this._storage.ref(path) as CustomStorageReference;
  }

  protected handleError(message: string, error: unknown): never {
    console.error("MobileFirebaseService Error:", message, error);
    if (error instanceof Error) {
       throw new FirebaseError(message, (error as any).code || 'UNKNOWN', error);
    }
    throw new FirebaseError(message, 'UNKNOWN', error);
  }
} 