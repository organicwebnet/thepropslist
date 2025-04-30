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
  protected _auth: FirebaseAuthTypes.Module | undefined;
  protected _firestore: FirebaseFirestoreTypes.Module | undefined;
  protected _storage: FirebaseStorageTypes.Module | undefined;
  private syncEnabled = true;
  private offlineQueue: OfflineSync;

  constructor() {
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

  async initializeService(): Promise<void> {
    if (!this._auth) this._auth = auth();
    if (!this._firestore) this._firestore = firestore();
    if (!this._storage) this._storage = storage();
    await this.offlineQueue.initialize();
    console.log("MobileFirebaseService modules initialized.");
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
    console.log("MobileFirebaseService initialize() called (should be potentially removed or rely on initializeService).");
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
    if (!this._firestore) throw new Error("Firestore not initialized");
    const docRef = this._firestore.doc(path) as FirebaseFirestoreTypes.DocumentReference<T>;
    
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
    if (!this._firestore) throw new Error("Firestore not initialized");
    const collectionRef = this._firestore.collection(path) as FirebaseFirestoreTypes.CollectionReference<T>;
    
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
    if (!this._firestore) throw new Error("Firestore not initialized");
    return this._firestore.runTransaction(updateFunction);
  }

  batch(): FirebaseFirestoreTypes.WriteBatch {
    if (!this._firestore) throw new Error("Firestore not initialized");
    return this._firestore.batch();
  }

  getStorageRef(path: string): FirebaseStorageTypes.Reference {
    if (!this._storage) throw new Error("Storage not initialized");
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
    if (!this._auth) throw new Error("Auth not initialized");
    return this._auth;
  }

  firestore(): FirebaseFirestoreTypes.Module {
    if (!this._firestore) throw new Error("Firestore not initialized");
    return this._firestore;
  }

  storage(): FirebaseStorageTypes.Module {
    if (!this._storage) throw new Error("Storage not initialized");
    return this._storage;
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

  // --- Add Missing Auth Method Stubs ---
  async signInWithEmailAndPassword(email: string, password: string): Promise<any> { // Use actual RNFirebase Auth if available
    if (!this._auth) throw new Error("Auth not initialized");
    console.log(`Mobile attempting signInWithEmailAndPassword for ${email}`);
    try {
      return await this._auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error("Mobile signIn failed:", error);
      throw this.createError(error); // Re-throw as FirebaseError
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<any> { // Use actual RNFirebase Auth if available
    if (!this._auth) throw new Error("Auth not initialized");
    console.log(`Mobile attempting createUserWithEmailAndPassword for ${email}`);
    try {
      return await this._auth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
      console.error("Mobile signUp failed:", error);
      throw this.createError(error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!this._auth) throw new Error("Auth not initialized");
    console.log(`Mobile attempting sendPasswordResetEmail for ${email}`);
    try {
      await this._auth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error("Mobile password reset failed:", error);
      throw this.createError(error);
    }
  }
  // --- End Missing Auth Method Stubs ---
} 