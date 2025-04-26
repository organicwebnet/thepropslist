import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  Auth,
  User
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
  CollectionReference,
  DocumentReference,
  Query,
  WhereFilterOp,
  enableIndexedDbPersistence,
  runTransaction as webRunTransaction,
  writeBatch as webWriteBatch,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot
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
  SyncStatus,
  FirebaseError
} from '../../../shared/services/firebase/types';

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
      apiKey: import.meta.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: import.meta.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.EXPO_PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) {
      console.error('Firebase configuration is missing. Ensure environment variables are set.');
      throw new Error('Firebase configuration missing');
    }

    try {
      this.app = initializeApp(firebaseConfig);
      this.authInstance = getAuth(this.app);
      this.dbInstance = getFirestore(this.app);
      this.storageInstance = getStorage(this.app);
      
      await enableIndexedDbPersistence(this.dbInstance)
        .catch((err) => { 
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
    return webRunTransaction(this.dbInstance, (transaction) => updateFunction(transaction as CustomTransaction));
  }

  batch(): CustomWriteBatch {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    return webWriteBatch(this.dbInstance) as CustomWriteBatch;
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
  ): () => void {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    const docRef = doc(this.dbInstance, path) as DocumentReference<T>;
    
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
    onError?: (error: Error) => void
  ): () => void {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    const collRef = collection(this.dbInstance, path) as CollectionReference<T>;

    const unsubscribe = onSnapshot(collRef,
      (snapshot: QuerySnapshot) => {
        const docs = snapshot.docs.map(docSnapshot => 
          this.createDocumentWrapper(docSnapshot.ref as CustomDocumentReference<T>)
        );
        onNext(docs as FirebaseDocument<T>[]);
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

  protected handleError(message: string, error: unknown): never {
    console.error("WebFirebaseService Error:", message, error);
    if (error instanceof Error && 'code' in error) {
       throw error; 
    }    
    throw new Error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }
} 