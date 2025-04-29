import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import app, { getApps } from '@react-native-firebase/app';
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
  protected _firestore: FirebaseFirestoreTypes.Module | undefined;
  protected _auth: FirebaseAuthTypes.Module | undefined;
  protected _storage: FirebaseStorageTypes.Module | undefined;
  private _offlineSync: MobileOfflineSync | undefined;
  private _isInitialized = false;

  constructor() {
    console.log("[MobileFirebaseService] Constructor called.");
  }

  async initialize(): Promise<void> {
    console.log("[MobileFirebaseService] initialize() called.");
    if (this._isInitialized) {
        console.log("[MobileFirebaseService] Already initialized. Skipping.");
        return;
    }
    try {
        console.log("[MobileFirebaseService] Attempting @react-native-firebase initialization...");

        // Check native app initialization status using getApps()
        const apps = getApps(); // Use getApps()
        console.log(`[MobileFirebaseService] Checking apps.length: ${apps.length}`);
        if (apps.length === 0) { // Check the length of the result
            console.error("[MobileFirebaseService] Error: No native Firebase app instance found! Check native setup (google-services.json) and ensure native modules are linked correctly.");
            throw new Error("No Firebase app instance found. Check native setup.");
        } else {
             console.log(`[MobileFirebaseService] Native Default app instance found: ${apps[0].name}. Proceeding to get service instances.`);
        }

        console.log("[MobileFirebaseService] Getting Auth instance...");
        this._auth = auth();
        console.log("[MobileFirebaseService] Auth instance obtained:", this._auth ? 'Exists' : 'Failed');

        console.log("[MobileFirebaseService] Getting Firestore instance...");
        this._firestore = firestore();
        console.log("[MobileFirebaseService] Firestore instance obtained:", this._firestore ? 'Exists' : 'Failed');

        console.log("[MobileFirebaseService] Getting Storage instance...");
        this._storage = storage();
        console.log("[MobileFirebaseService] Storage instance obtained:", this._storage ? 'Exists' : 'Failed');

        console.log("[MobileFirebaseService] Initializing Offline Sync...");
        if (!this._firestore) throw new Error("Firestore must be initialized before Offline Sync");
        this._offlineSync = new MobileOfflineSync(this._firestore);
        // await this._offlineSync.initialize(); // If MobileOfflineSync needs async init
        console.log("[MobileFirebaseService] Offline Sync initialized.");

        // Final check
        if (!this._auth || !this._firestore || !this._storage || !this._offlineSync) {
           console.error("[MobileFirebaseService] One or more services failed to initialize.");
           throw new Error("Firebase service initialization failed internally.");
        }

        this._isInitialized = true;
        console.log("[MobileFirebaseService] Initialization flag set to true. Initialization successful.");
    } catch (error) {
        console.error("[MobileFirebaseService] Error during initialize():", error);
        this._isInitialized = false; // Ensure flag is reset on error
        if (error instanceof Error) {
             throw new FirebaseError(error.message, 'initialization-failed');
        } else {
             throw new FirebaseError('An unknown error occurred during Firebase initialization.', 'unknown');
        }
    }
  }

  auth(): CustomAuth {
    if (!this._isInitialized || !this._auth) {
        console.error('MobileFirebaseService not initialized or Auth module failed to initialize.');
        throw new FirebaseError('MobileFirebaseService not initialized or Auth module failed to initialize.', 'not-initialized');
    }
    // Cast needed if CustomAuth differs structurally from FirebaseAuthTypes.Module
    // If they are compatible, casting might not be strictly necessary but clarifies intent.
    return this._auth as CustomAuth;
  }

  firestore(): CustomFirestore {
    if (!this._isInitialized || !this._firestore) {
        console.error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
        throw new FirebaseError('MobileFirebaseService not initialized or Firestore module failed to initialize.', 'not-initialized');
    }
     // Cast needed if CustomFirestore differs structurally
    return this._firestore as CustomFirestore;
  }

  storage(): CustomStorage {
    if (!this._isInitialized || !this._storage) {
        console.error('MobileFirebaseService not initialized or Storage module failed to initialize.');
        throw new FirebaseError('MobileFirebaseService not initialized or Storage module failed to initialize.', 'not-initialized');
    }
     // Cast needed if CustomStorage differs structurally
    return this._storage as CustomStorage;
  }

  offline(): OfflineSync {
     if (!this._isInitialized || !this._offlineSync) {
       console.error('MobileFirebaseService not initialized or OfflineSync module failed to initialize.');
       throw new FirebaseError('MobileFirebaseService not initialized or OfflineSync module failed to initialize.', 'not-initialized');
     }
     return this._offlineSync;
  }

  async runTransaction<T>(
    updateFunction: (transaction: CustomTransaction) => Promise<T>
  ): Promise<T> {
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
    return this._firestore.runTransaction(updateFunction as any);
  }

  batch(): CustomWriteBatch {
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
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
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
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
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
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
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
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
    if (!this._isInitialized || !this._storage) throw new Error('MobileFirebaseService not initialized or Storage module failed to initialize.');
    return this._storage.ref(path) as CustomStorageReference;
  }

  protected handleError(message: string, error: unknown): never {
    console.error("MobileFirebaseService Error:", message, error);
    // Optionally check error codes specific to @react-native-firebase
    if (error instanceof Error) {
       // You might want to check error.code for specific Firebase errors
       throw new FirebaseError(`${message}: ${error.message}`, (error as any).code || 'unknown-mobile-error');
    }
    throw new FirebaseError(message, 'unknown-mobile-error');
  }

  // Add placeholder implementations for missing FirebaseService methods
  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    console.warn(`Mobile deleteDocument(${collectionPath}, ${documentId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    console.warn(`Mobile getDocument(${collectionPath}, ${documentId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    console.warn(`Mobile updateDocument(${collectionPath}, ${documentId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    console.warn(`Mobile addDocument(${collectionPath}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async uploadFile(path: string, file: File): Promise<string> {
    console.warn(`Mobile uploadFile(${path}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async deleteFile(path: string): Promise<void> {
    console.warn(`Mobile deleteFile(${path}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async deleteShow(showId: string): Promise<void> {
    console.warn(`Mobile deleteShow(${showId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }
} 