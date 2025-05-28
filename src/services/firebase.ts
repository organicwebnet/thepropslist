import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  Auth as FirebaseAuthWeb,
  User as FirebaseUserWeb,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as signOutWeb,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as onAuthStateChangedWeb,
  getAuth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch as webWriteBatch,
  runTransaction as webRunTransaction,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp as webServerTimestamp,
  Timestamp as WebTimestamp,
  DocumentReference as WebDocumentReference,
  CollectionReference as WebCollectionReference,
  WriteBatch as WebWriteBatchSdk,
  Transaction as WebTransactionSdk,
  DocumentSnapshot as WebDocumentSnapshot,
  Query as WebQuery,
  QuerySnapshot as WebQuerySnapshot,
  where as webWhere,
  orderBy as webOrderBy,
  limit as webLimit,
  enableIndexedDbPersistence,
  setDoc,
  onSnapshot,
  type Firestore,
  type DocumentReference,
  type CollectionReference,
  type Query,
  type DocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL as getStorageDownloadURL,
  deleteObject,
  UploadTask as WebUploadTask,
  UploadTaskSnapshot as WebUploadTaskSnapshot,
  type StorageReference as WebStorageReference,
  uploadBytes,
} from 'firebase/storage';
import type {
  FirebaseService,
  CustomUser,
  CustomAuth,
  CustomFirestore,
  CustomStorage,
  CustomTimestamp,
  FirebaseDocument,
  CustomDocumentReference,
  CustomCollectionReference,
  Show,
  ShowCollaborator,
  QueryOptions,
  OfflineSync,
  SyncStatus,
  CustomTransaction,
  CustomWriteBatch,
  CustomDocumentData,
  CustomStorageReference,
} from '../shared/services/firebase/types.ts';
import { FirebaseError } from '../shared/services/firebase/types.ts';
import { PropLifecycleStatus, lifecycleStatusLabels } from '../types/lifecycle.ts';
import type { Show as AppShow } from '../types/index.ts';
import { getFirebaseConfig } from '../config/firebase.ts';

export class WebFirebaseService implements FirebaseService {
  private app: FirebaseApp | null = null;
  private authInstance: FirebaseAuthWeb | null = null;
  private dbInstance: CustomFirestore | null = null;
  private storageInstance: CustomStorage | null = null;
  private isInitialized = false;

  constructor() {
    // Constructor for WebFirebaseService
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const firebaseConfig = getFirebaseConfig(); // Use the imported config getter

    if (!firebaseConfig.apiKey) {
      console.error('Firebase configuration is missing. Ensure environment variables (VITE_*) are set.');
      throw new Error('Firebase configuration missing');
    }

    try {
      this.app = initializeApp(firebaseConfig);
      this.authInstance = getAuth(this.app);
      this.dbInstance = getFirestore(this.app);
      this.storageInstance = getStorage(this.app);
      
      await enableIndexedDbPersistence(this.dbInstance as Firestore)
        .catch((err: any) => { 
          if (err.code == 'failed-precondition') {
            console.warn('Firestore Persistence failed precondition. Multiple tabs open?');
          } else if (err.code == 'unimplemented') {
            console.warn('Firestore Persistence not available in this browser.');
          } else {
            console.error('Firestore Persistence error:', err);
          }
        });
      
      this.isInitialized = true;
      console.log('Firebase Web initialized successfully');
    } catch (error) {
      console.error('Firebase Web initialization error:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  auth(): CustomAuth {
    if (!this.isInitialized || !this.authInstance) throw new Error('Firebase not initialized');
    return this.authInstance as CustomAuth;
  }

  firestore(): CustomFirestore {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return this.dbInstance as CustomFirestore;
  }

  storage(): CustomStorage {
    if (!this.isInitialized || !this.storageInstance) throw new Error('Firebase not initialized');
    return this.storageInstance as CustomStorage;
  }

  offline(): OfflineSync {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    const db = this.dbInstance;

    return {
      initialize: async () => { /* Web might not need explicit init here */ },
      getItem: async <T>(key: string): Promise<T | null> => {
        console.warn('Web OfflineSync getItem not implemented'); return null;
      },
      setItem: async <T>(key: string, value: T): Promise<void> => {
        console.warn('Web OfflineSync setItem not implemented');
      },
      removeItem: async (key: string): Promise<void> => {
        console.warn('Web OfflineSync removeItem not implemented');
      },
      clear: async (): Promise<void> => {
        console.warn('Web OfflineSync clear not implemented');
      },
      enableSync: async () => {
        console.log('Web Firestore persistence already enabled during initialization.');
      },
      disableSync: async () => {
        console.warn('Disabling offline sync/network is not directly supported in Firebase Web SDK once enabled.');
      },
      getSyncStatus: async (): Promise<SyncStatus> => {
        return {
          isEnabled: true,
          isOnline: navigator.onLine,
          pendingOperations: 0,
          lastSyncTimestamp: null
        };
      },
      queueOperation: async (): Promise<void> => {
         console.warn('Web OfflineSync queueOperation not implemented');
      },
      getQueueStatus: async (): Promise<any> => {
         console.warn('Web OfflineSync getQueueStatus not implemented');
         return { pending: 0, processing: 0, lastProcessed: null };
      }
    };
  }

  async runTransaction<T>(
    updateFunction: (transaction: CustomTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return webRunTransaction(this.dbInstance as Firestore, (transaction: WebTransactionSdk) => updateFunction(transaction as CustomTransaction));
  }

  batch(): CustomWriteBatch {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return webWriteBatch(this.dbInstance as Firestore) as CustomWriteBatch;
  }

  createDocumentWrapper<T extends CustomDocumentData>(
    docRef: CustomDocumentReference<T>
  ): FirebaseDocument<T> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    
    const firestoreDocRef = docRef as DocumentReference<T>;
    return {
      id: firestoreDocRef.id,
      ref: firestoreDocRef as CustomDocumentReference<T>,
      data: undefined,
      get: async () => {
        const snapshot = await getDoc(firestoreDocRef);
        return snapshot.exists() ? (snapshot.data() as T) : undefined;
      },
      set: async (data: T) => {
        await setDoc(firestoreDocRef, data);
      },
      update: async (data: Partial<T>) => {
        await updateDoc(firestoreDocRef, data as any);
      },
      delete: async () => {
        await deleteDoc(firestoreDocRef);
      },
    };
  }

  listenToDocument<T extends CustomDocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    const docRef = doc(this.dbInstance as Firestore, path) as DocumentReference<T>;
    
    const unsubscribe = onSnapshot(docRef, 
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const wrappedDoc = this.createDocumentWrapper(docRef as CustomDocumentReference<T>);
          onNext(wrappedDoc as FirebaseDocument<T>);
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
    return unsubscribe;
  }

  listenToCollection<T extends CustomDocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void,
    options?: QueryOptions
  ): Unsubscribe {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');

    let q: Query<T> = collection(this.dbInstance as Firestore, path) as CollectionReference<T>;

    if (options?.where) {
      options.where.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });
    }
    if (options?.orderBy) {
      options.orderBy.forEach(([field, direction]) => {
        q = query(q, orderBy(field, direction));
      });
    }
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const unsubscribe = onSnapshot(q,
      (querySnapshot: QuerySnapshot) => {
        const documents = querySnapshot.docs.map(snapshotDoc => {
          const docRef = snapshotDoc.ref as DocumentReference<T>;
          const wrappedDoc = this.createDocumentWrapper(docRef as CustomDocumentReference<T>);
          wrappedDoc.data = snapshotDoc.data() as T;
          return wrappedDoc;
        });
        onNext(documents as FirebaseDocument<T>[]);
      },
      (error: Error) => {
        console.error(`Error listening to collection ${path}:`, error);
        if (onError) {
          onError(error);
        }
      }
    );
    return unsubscribe;
  }

  getStorageRef(path: string): CustomStorageReference {
    if (!this.isInitialized || !this.storageInstance) throw new Error('Firebase not initialized');
    return ref(this.storageInstance, path) as CustomStorageReference;
  }

  async uploadFile(path: string, file: File): Promise<string> {
    if (!this.isInitialized || !this.storageInstance) throw new Error('Firebase not initialized');
    try {
      const storageRef = ref(this.storageInstance, path) as WebStorageReference;
      await uploadBytes(storageRef, file);
      const downloadURL = await getStorageDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error(`Error uploading file to ${path}:`, error);
      throw this.createError(error);
    }
  }

  protected handleError(message: string, error: unknown): never {
    console.error("WebFirebaseService Error:", message, error);
    if (error instanceof Error && 'code' in error) {
       throw error; 
    }    
    throw new Error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }

  async initializeService(): Promise<void> {
    console.log("WebFirebaseService initializeService() called.");
  }

  private createError(error: unknown): FirebaseError {
    const err = error as { code?: string; message?: string };
    const firebaseError: FirebaseError = {
      code: err.code || 'unknown',
      message: err.message || 'An unknown web error occurred',
      originalError: error,
      name: 'FirebaseError'
    };
    return firebaseError;
  }

  // --- CRUD Methods Implementation ---

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.dbInstance as Firestore, collectionPath, documentId) as DocumentReference<T>;
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const wrappedDoc = this.createDocumentWrapper(docRef as CustomDocumentReference<T>);
        wrappedDoc.data = docSnap.data() as T; 
        return wrappedDoc as FirebaseDocument<T>;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error);
    }
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const collRef = collection(this.dbInstance as Firestore, collectionPath) as CollectionReference<T>;
      const dataWithTimestamps = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collRef, dataWithTimestamps as any);
      return this.createDocumentWrapper(docRef as CustomDocumentReference<T>) as FirebaseDocument<T>;
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw this.createError(error);
    }
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.dbInstance as Firestore, collectionPath, documentId) as DocumentReference<T>;
      const dataWithTimestamp = { 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
      await updateDoc(docRef, dataWithTimestamp as any);
    } catch (error) {
      console.error(`Error updating document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error);
    }
  }

  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.dbInstance as Firestore, collectionPath, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error);
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.isInitialized || !this.storageInstance) throw new Error('Firebase not initialized');
    try {
      const storageRef = ref(this.storageInstance, path) as WebStorageReference;
      await deleteObject(storageRef);
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.warn(`Attempted to delete non-existent file: ${path}`);
        return;
      }
      console.error(`Error deleting file at ${path}:`, error);
      throw this.createError(error);
    }
  }

  async deleteShow(showId: string): Promise<void> {
    console.warn(`deleteShow(${showId}) is not implemented in WebFirebaseService.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<any> {
    if (!this.isInitialized || !this.authInstance) throw new Error('Firebase Auth not initialized');
    try {
      return await signInWithEmailAndPassword(this.authInstance, email, password);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<any> {
    if (!this.isInitialized || !this.authInstance) throw new Error('Firebase Auth not initialized');
    try {
      return await createUserWithEmailAndPassword(this.authInstance, email, password);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!this.isInitialized || !this.authInstance) throw new Error('Firebase Auth not initialized');
    try {
      await sendPasswordResetEmail(this.authInstance, email);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized || !this.authInstance) throw this.createError(new Error('Firebase not initialized'));
    try {
      await signOutWeb(this.authInstance);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async setDocument<T extends CustomDocumentData>(
    collectionPath: string,
    documentId: string,
    data: T,
    options?: { merge?: boolean }
  ): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw this.createError(new Error('Firebase not initialized'));
    try {
      await setDoc(doc(this.dbInstance as Firestore, collectionPath, documentId), data, options || {});
    } catch (error) {
      throw this.createError(error);
    }
  }

  getFirestoreJsInstance(): Firestore {
    if (!this.isInitialized || !this.dbInstance) throw new FirebaseError('Firebase not initialized', 'initialization-error');
    return this.dbInstance as Firestore;
  }

  getFirestoreReactNativeInstance(): any {
    console.warn('getFirestoreReactNativeInstance called on WebFirebaseService. This is not applicable.');
    throw new FirebaseError('Not applicable for web platform', 'unsupported-operation');
  }

  async getDocuments<T extends CustomDocumentData>(
    collectionPath: string, 
    queryOptions?: QueryOptions
  ): Promise<FirebaseDocument<T>[]> {
    if (!this.isInitialized || !this.dbInstance) throw new FirebaseError('Firebase not initialized', 'initialization-error');
    
    let q: Query<T> = collection(this.dbInstance as Firestore, collectionPath) as CollectionReference<T>;

    if (queryOptions?.where) {
      for (const w of queryOptions.where) {
        q = query(q, where(w[0], w[1], w[2]));
      }
    }
    if (queryOptions?.orderBy) {
      for (const o of queryOptions.orderBy) {
        q = query(q, orderBy(o[0], o[1]));
      }
    }
    if (queryOptions?.limit) {
      q = query(q, limit(queryOptions.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => 
      this.createDocumentWrapper(docSnapshot.ref as CustomDocumentReference<T>)
    );
  }
} 