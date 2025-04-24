import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { 
  Firestore, 
  getFirestore, 
  enableMultiTabIndexedDbPersistence,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  runTransaction as firestoreRunTransaction,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
  Query,
  Transaction,
  WriteBatch,
  QueryDocumentSnapshot,
  DocumentReference
} from 'firebase/firestore';
import { FirebaseStorage, getStorage, ref, StorageReference } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';
import { FirebaseService, OfflineSync, FirebaseDocument } from '../../../shared/services/firebase/types';
import { MobileOfflineSync } from './MobileOfflineSync';
import { BaseFirebaseService } from '../../../shared/services/firebase/BaseFirebaseService';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseStorageTypes } from '@react-native-firebase/storage';

class MobileOfflineSync implements OfflineSync {
  constructor(private firestoreInstance: FirebaseFirestoreTypes.Module) {}

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async getItem<T>(key: string): Promise<T | null> {
    return null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    return Promise.resolve();
  }

  async removeItem(key: string): Promise<void> {
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    return Promise.resolve();
  }

  async enableSync(): Promise<void> {
    await this.firestoreInstance.enableNetwork();
  }

  async disableSync(): Promise<void> {
    await this.firestoreInstance.disableNetwork();
  }

  async getSyncStatus(): Promise<{ isEnabled: boolean; isOnline: boolean; pendingOperations: number; lastSyncTimestamp: number | null; }> {
    return {
      isEnabled: true,
      isOnline: true,
      pendingOperations: 0,
      lastSyncTimestamp: Date.now()
    };
  }

  async queueOperation(): Promise<void> {
    return Promise.resolve();
  }

  async getQueueStatus(): Promise<{ pending: number; processing: number; lastProcessed: number | null; }> {
    return {
      pending: 0,
      processing: 0,
      lastProcessed: null
    };
  }
}

export class MobileFirebaseService extends BaseFirebaseService {
  private _app: FirebaseApp;
  protected _firestore: FirebaseFirestoreTypes.Module;
  protected _auth: FirebaseAuthTypes.Module;
  protected _storage: FirebaseStorageTypes.Module;
  private _offlineSync: MobileOfflineSync;

  constructor() {
    super();
    this._firestore = firestore();
    this._auth = auth();
    this._storage = storage();
    this._offlineSync = new MobileOfflineSync(this._firestore);
  }

  get app(): FirebaseApp {
    return this._app;
  }

  set app(value: FirebaseApp) {
    this._app = value;
  }

  async initialize(config: FirebaseOptions): Promise<void> {
    try {
      this._app = initializeApp(config);
      this._firestore = getFirestore(this._app);
      this._storage = getStorage(this._app);
      
      // Enable offline persistence for Firestore
      await enableMultiTabIndexedDbPersistence(this._firestore);
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw error;
      }
      throw new FirebaseError(
        'initialization-failed',
        'Failed to initialize Firebase'
      );
    }
  }

  auth(): Auth {
    if (!this._auth) throw new Error('Auth not initialized');
    return this._auth;
  }

  firestore(): Firestore {
    if (!this._firestore) throw new Error('Firestore not initialized');
    return this._firestore;
  }

  storage(): FirebaseStorage {
    if (!this._storage) throw new Error('Storage not initialized');
    return this._storage;
  }

  offline(): OfflineSync {
    return this._offlineSync;
  }

  async runTransaction<T>(
    updateFunction: (transaction: FirebaseFirestoreTypes.Transaction) => Promise<T>
  ): Promise<T> {
    return this._firestore.runTransaction(updateFunction);
  }

  batch(): FirebaseFirestoreTypes.WriteBatch {
    return this._firestore.batch();
  }

  listenToDocument<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    return this._firestore.doc(path).onSnapshot(
      (snapshot) => {
        if (snapshot.exists) {
          onNext(this.createDocumentWrapper(snapshot));
        }
      },
      onError
    );
  }

  listenToCollection<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    return this._firestore.collection(path).onSnapshot(
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => this.createDocumentWrapper(doc));
        onNext(docs);
      },
      onError
    );
  }

  getStorageRef(path: string): StorageReference {
    return ref(this._storage, path);
  }

  protected handleError(message: string, error: unknown): never {
    if (error instanceof FirebaseError) {
      throw error;
    }
    throw new FirebaseError(
      'unknown-error',
      message
    );
  }

  createDocumentWrapper<T>(snapshot: QueryDocumentSnapshot<T>): FirebaseDocument<T> {
    return {
      id: snapshot.id,
      data: () => snapshot.data(),
      exists: () => snapshot.exists(),
      ref: snapshot.ref as DocumentReference<T>
    };
  }
} 