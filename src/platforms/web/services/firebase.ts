import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  Auth,
  User,
  UserCredential
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Firestore,
  CollectionReference as WebCollectionReference,
  DocumentReference as WebDocumentReference,
  Query,
  WhereFilterOp,
  enableIndexedDbPersistence,
  runTransaction as webRunTransaction,
  writeBatch as webWriteBatch,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  type DocumentData as WebDocumentData
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL as getStorageDownloadURL,
  deleteObject,
  StorageReference,
  FirebaseStorage
} from 'firebase/storage';
import type {
  FirebaseService,
  OfflineSync,
  FirebaseDocument,
  CustomAuth,
  CustomFirestore,
  CustomStorage,
  CustomTransaction,
  CustomWriteBatch,
  CustomDocumentData,
  CustomDocumentReference,
  CustomStorageReference,
  CustomUserCredential,
  SyncStatus
} from '../../../shared/services/firebase/types';
import { FirebaseError } from '../../../shared/services/firebase/types';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle';
import { Show } from '@/types/index';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

type QueryOptions = {
  where?: [string, WhereFilterOp, any][];
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
};

export class WebFirebaseService implements FirebaseService {
  private app: FirebaseApp | null = null;
  private authInstance: Auth | null = null;
  private dbInstance: Firestore | null = null;
  private storageInstance: FirebaseStorage | null = null;
  private isInitialized = false;

  constructor() {
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) {
      console.error('Firebase configuration is missing. Ensure environment variables are set.');
      throw new Error('Firebase configuration missing');
    }

    try {
      this.app = initializeApp(firebaseConfig);
      this.authInstance = getAuth(this.app);
      this.dbInstance = getFirestore(this.app);
      
      // Attempt standard IndexedDB Persistence
      try {
          await enableIndexedDbPersistence(this.dbInstance);
          console.log('[Firebase Init] Firestore persistence enabled.');
      } catch (err: any) {
          if (err.code === 'failed-precondition') {
              console.warn('[Firebase Init] Firestore Persistence failed precondition. Multiple tabs open? Falling back to memory cache for this session.');
          } else if (err.code === 'unimplemented') {
              console.warn('[Firebase Init] Firestore Persistence is not available in this browser environment. Using memory cache.');
          } else {
              console.error('[Firebase Init] Error enabling Firestore persistence:', err);
          }
          // Firestore automatically uses memory cache on failure
      }

      this.storageInstance = getStorage(this.app);
      this.isInitialized = true;
      console.log('Firebase Web initialized successfully (persistence attempt completed).');
    } catch (error) {
      // Catch errors from initializeApp, getAuth, getFirestore, getStorage
      console.error('Firebase Web core initialization error:', error);
      this.isInitialized = false;
      throw error; // Re-throw critical initialization errors
    }
  }

  // Method for FirebaseService interface (returns minimal CustomAuth)
  auth(): CustomAuth {
    if (!this.isInitialized || !this.authInstance) throw new Error('Firebase not initialized');
    // This cast is for the interface, consumers should be aware CustomAuth is minimal.
    return this.authInstance as CustomAuth;
  }

  // Method for web-specific consumers to get the full Firebase JS SDK Auth object
  getFirebaseAuthJsInstance(): Auth {
    if (!this.isInitialized || !this.authInstance) throw new Error('Firebase not initialized');
    return this.authInstance;
  }

  firestore(): CustomFirestore {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return this.dbInstance as CustomFirestore;
  }

  getFirestoreJsInstance(): Firestore {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return this.dbInstance;
  }

  getFirestoreReactNativeInstance(): FirebaseFirestoreTypes.Module {
    throw new Error('getFirestoreReactNativeInstance is not available in WebFirebaseService');
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
    return webRunTransaction(this.dbInstance, (transaction) => updateFunction(transaction as CustomTransaction));
  }

  batch(): CustomWriteBatch {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return webWriteBatch(this.dbInstance) as CustomWriteBatch;
  }

  createDocumentWrapper<T extends CustomDocumentData>(
    docRef: WebDocumentReference<T>
  ): FirebaseDocument<T> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    
    return {
      id: docRef.id,
      ref: docRef,
      data: undefined,
      get: async () => {
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? (snapshot.data() as T) : undefined;
      },
      set: async (data: T) => {
        await setDoc(docRef, data);
      },
      update: async (data: Partial<T>) => {
        await updateDoc(docRef, data as any);
      },
      delete: async () => {
        await deleteDoc(docRef);
      },
    };
  }

  listenToDocument<T extends CustomDocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    const docRef = doc(this.dbInstance, path) as WebDocumentReference<T>;
    
    const unsubscribe = onSnapshot(docRef, 
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          const wrappedDoc = this.createDocumentWrapper(docRef);
          wrappedDoc.data = snapshot.data() as T;
          onNext(wrappedDoc);
        } else {
          console.log(`Document at path ${path} does not exist.`);
          onNext(null as any);
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
  ): () => void {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');

    let q: Query<T> = collection(this.dbInstance, path) as WebCollectionReference<T>;

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
      (querySnapshot: QuerySnapshot<T>) => {
        const documents = querySnapshot.docs.map(snapshotDoc => {
          const wrappedDoc = this.createDocumentWrapper(snapshotDoc.ref as WebDocumentReference<T>);
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
      const storageRef = ref(this.storageInstance, path);
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
    let message = 'An unknown Firebase web error occurred.';
    let code = 'unknown';
    const originalError = error;

    if (error instanceof Error) {
        message = error.message;
        if ('code' in error && typeof (error as any).code === 'string') {
            code = (error as any).code;
        }
    } else if (typeof error === 'string') {
        message = error;
    }

    console.error('Firebase Web Error:', message, `(Code: ${code})`, originalError);
    return new FirebaseError(message, code, originalError);
  }

  // --- CRUD Methods Implementation ---

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.getFirestoreJsInstance(), collectionPath, documentId) as WebDocumentReference<T>;
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const wrappedDoc = this.createDocumentWrapper(docRef);
        wrappedDoc.data = docSnap.data() as T;
        return wrappedDoc;
      }
      return null;
    } catch (error) {
      this.handleError(`Error getting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocuments<T extends CustomDocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const firestoreInstance = this.getFirestoreJsInstance();
      let q: Query<T> = collection(firestoreInstance, collectionPath) as Query<T>; // Use Query<T>

      if (options?.where) {
        for (const w of options.where) {
          q = query(q, where(w[0], w[1], w[2]));
        }
      }
      if (options?.orderBy) {
        for (const o of options.orderBy) {
          q = query(q, orderBy(o[0], o[1]));
        }
      }
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(docSnap => {
        // We need to cast docSnap.ref because createDocumentWrapper expects WebDocumentReference<T>
        // and docSnap.ref is DocumentReference<DocumentData> by default from Query<T> if T is not specific enough
        // or Query<T> where T is CustomDocumentData.
        // This cast should be safe if T is indeed the type stored in Firestore.
        const webDocRef = docSnap.ref as WebDocumentReference<T>;
        const wrappedDoc = this.createDocumentWrapper(webDocRef);
        wrappedDoc.data = docSnap.data() as T;
        return wrappedDoc;
      });
    } catch (error) {
      this.handleError(`Error getting documents from ${collectionPath}`, error);
    }
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const collRef = collection(this.dbInstance, collectionPath) as WebCollectionReference<T>;
      // Add createdAt/updatedAt timestamps if they aren't part of the data/backend rules
      const dataWithTimestamps = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collRef, dataWithTimestamps as any); // Use any for potential timestamp mismatch temporarily
      return this.createDocumentWrapper(docRef as WebDocumentReference<T>) as FirebaseDocument<T>;
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw this.createError(error);
    }
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.dbInstance, collectionPath, documentId) as WebDocumentReference<T>;
      // Add updatedAt timestamp
      const dataWithTimestamp = { 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
      await updateDoc(docRef, dataWithTimestamp as any); // Use any for potential timestamp mismatch temporarily
    } catch (error) {
      console.error(`Error updating document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error);
    }
  }

  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.dbInstance, collectionPath, documentId) as WebDocumentReference<any>;
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error);
    }
  }

  // TODO: Implement deleteFile if needed
  async deleteFile(path: string): Promise<void> {
    if (!this.isInitialized || !this.storageInstance) throw new Error('Firebase not initialized');
    try {
      const storageRef = ref(this.storageInstance, path);
      await deleteObject(storageRef);
    } catch (error: any) {
      // It's common for delete to fail if the file doesn't exist, 
      // check for 'storage/object-not-found' code and potentially ignore it.
      if (error.code === 'storage/object-not-found') {
        console.warn(`Attempted to delete non-existent file: ${path}`);
        return; // Don't throw an error if the file wasn't there anyway
      }
      console.error(`Error deleting file at ${path}:`, error);
      throw this.createError(error);
    }
  }

  // --- Add missing FirebaseService methods ---

  async deleteShow(showId: string): Promise<void> {
    // TODO: Implement actual delete logic for shows using web SDK
    console.warn(`deleteShow(${showId}) is not implemented in WebFirebaseService.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    if (!this.isInitialized || !this.authInstance) throw this.createError(new Error('Firebase not initialized'));
    try {
      const userCredential = await signInWithEmailAndPassword(this.authInstance, email, password);
      return userCredential as CustomUserCredential;
    } catch (error) {
      throw this.createError(error);
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    if (!this.isInitialized || !this.authInstance) throw this.createError(new Error('Firebase not initialized'));
    try {
      const userCredential = await createUserWithEmailAndPassword(this.authInstance, email, password);
      return userCredential as CustomUserCredential;
    } catch (error) {
      throw this.createError(error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!this.isInitialized || !this.authInstance) throw this.createError(new Error('Firebase not initialized'));
    try {
      await sendPasswordResetEmail(this.authInstance, email);
    } catch (error) {
      throw this.createError(error);
    }
  }

  async signOut(): Promise<void> {
    if (!this.isInitialized || !this.authInstance) throw this.createError(new Error('Firebase not initialized'));
    try {
      await signOut(this.authInstance);
    } catch (error) {
      throw this.createError(error);
    }
  }

  // Implementation for setDocument
  async setDocument<T extends CustomDocumentData>(
    collectionPath: string,
    documentId: string,
    data: T,
    options?: { merge?: boolean }
  ): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    const docRef = doc(this.dbInstance, collectionPath, documentId) as WebDocumentReference<T>;
    try {
      await setDoc(docRef, data, options || {});
    } catch (error) {
      console.error(`Error setting document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error); // Re-throw custom error
    }
  }
} 