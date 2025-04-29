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
  CustomUserCredential,
  SyncStatus,
  // FirebaseError // Keep as type import initially if only used for type annotations
} from '../../../shared/services/firebase/types';
// Import FirebaseError as a value if needed for instantiation
import { FirebaseError } from '../../../shared/services/firebase/types';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle';
import type { Show } from '@/types';

// Add QueryOptions type
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
    onError?: (error: Error) => void,
    options?: QueryOptions // Accept options object
  ): () => void {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');

    // Start with base collection reference
    let q: Query<T> = collection(this.dbInstance, path) as CollectionReference<T>;

    // Apply query constraints if provided
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

    // Listen to the potentially modified query (q)
    const unsubscribe = onSnapshot(q,
      (querySnapshot: QuerySnapshot) => {
        const documents = querySnapshot.docs.map(snapshotDoc => {
          // Get the reference
          const docRef = snapshotDoc.ref as DocumentReference<T>;
          // Create the wrapper
          const wrappedDoc = this.createDocumentWrapper(docRef as CustomDocumentReference<T>);
          // Assign the data from the snapshot to the wrapper's data property
          wrappedDoc.data = snapshotDoc.data() as T;
          return wrappedDoc;
        });
        onNext(documents as FirebaseDocument<T>[]); // Pass the array of wrappers
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
      const docRef = doc(this.dbInstance, collectionPath, documentId) as DocumentReference<T>;
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // Use the existing wrapper creator
        const wrappedDoc = this.createDocumentWrapper(docRef as CustomDocumentReference<T>);
        // Manually add the data to the wrapper as getDoc doesn't populate it automatically
        wrappedDoc.data = docSnap.data() as T; 
        return wrappedDoc as FirebaseDocument<T>;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document ${collectionPath}/${documentId}:`, error);
      throw this.createError(error); // Use existing error handler if available
    }
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const collRef = collection(this.dbInstance, collectionPath) as CollectionReference<T>;
      // Add createdAt/updatedAt timestamps if they aren't part of the data/backend rules
      const dataWithTimestamps = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collRef, dataWithTimestamps as any); // Use any for potential timestamp mismatch temporarily
      return this.createDocumentWrapper(docRef as CustomDocumentReference<T>) as FirebaseDocument<T>;
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw this.createError(error);
    }
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    if (!this.isInitialized || !this.dbInstance) throw new Error('Firebase not initialized');
    try {
      const docRef = doc(this.dbInstance, collectionPath, documentId) as DocumentReference<T>;
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
      const docRef = doc(this.dbInstance, collectionPath, documentId);
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
} 