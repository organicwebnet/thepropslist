import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword as webSignIn,
  signOut as webSignOut,
  createUserWithEmailAndPassword as webCreateUser,
  sendPasswordResetEmail as webSendPasswordReset,
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
  Query as WebQuery,
  WhereFilterOp,
  enableIndexedDbPersistence,
  runTransaction as webRunTransaction,
  writeBatch as webWriteBatch,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  type DocumentData as WebDocumentData,
  Timestamp as WebTimestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL as getStorageDownloadURL,
  deleteObject,
  StorageReference as WebStorageReference,
  FirebaseStorage as WebFirebaseStorage,
} from 'firebase/storage';

import { BaseFirebaseService } from '../../../shared/services/firebase/base';
import type {
  FirebaseService,
  OfflineSync,
  FirebaseDocument,
  CustomAuth,
  CustomFirestore,
  CustomStorage,
  CustomTransaction,
  CustomWriteBatch,
  DocumentData,
  CustomDocumentReference,
  CustomUserCredential,
  SyncStatus,
  QueryOptions,
  QueueStatus,
} from '../../../shared/services/firebase/types.ts';
import { FirebaseError } from '../../../shared/services/firebase/types.ts';
import type { ListData } from '../../../shared/types/taskManager';

export class WebFirebaseService extends BaseFirebaseService implements FirebaseService {
  private app: FirebaseApp;
  public auth: Auth;
  public firestore: Firestore;
  public storage: CustomStorage;

  constructor() {
    super();
    // Initialize properties in the constructor, but call initialize to set them up
    // This satisfies TypeScript's requirement for initializing abstract properties
    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) {
      throw new FirebaseError('Firebase configuration is missing. Ensure environment variables are set.', 'config-missing');
    }

    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  async initialize(): Promise<void> {
    try {
        await enableIndexedDbPersistence(this.firestore);
        console.log('[Firebase Init] Firestore persistence enabled.');
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn('[Firebase Init] Firestore Persistence failed precondition. Multiple tabs open?');
        } else if (err.code === 'unimplemented') {
            console.warn('[Firebase Init] Firestore Persistence is not available in this browser environment.');
        }
    }
    console.log('Firebase Web initialized successfully.');
  }

  getFirestoreJsInstance(): Firestore {
    return this.firestore;
  }

  getFirestoreReactNativeInstance(): never {
    throw new Error('getFirestoreReactNativeInstance is not available in WebFirebaseService');
  }

  // --- Auth ---
  async signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
      return webSignIn(this.auth, email, password);
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
      return webCreateUser(this.auth, email, password);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
      return webSendPasswordReset(this.auth, email);
  }

  async signOut(): Promise<void> {
      return webSignOut(this.auth);
  }
  
  // --- Firestore Document/Collection ---
  private _createDocumentWrapper<T extends DocumentData>(docSnapshot: DocumentSnapshot<T>): FirebaseDocument<T> {
    return {
      id: docSnapshot.id,
      exists: docSnapshot.exists(),
      data: docSnapshot.data() as T,
      ref: docSnapshot.ref as CustomDocumentReference<T>,
    };
  }

  async getDocument<T extends DocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    const docRef = doc(this.firestore, collectionPath, documentId) as WebDocumentReference<T>;
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return this._createDocumentWrapper(docSnap);
  }

  async getDocuments<T extends DocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]> {
    let q: WebQuery<T> = collection(this.firestore, collectionPath) as WebQuery<T>;

    if (options?.where) {
      options.where.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });
    }
    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy[0] as any, options.orderBy[1] as any));
    }
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => this._createDocumentWrapper(docSnap));
  }

  async addDocument<T extends DocumentData>(collectionPath: string, data: Omit<T, 'id'>): Promise<FirebaseDocument<T>> {
    const collRef = collection(this.firestore, collectionPath) as WebCollectionReference<Omit<T, 'id'>>;
    const docRef = await addDoc(collRef, data);
    const docSnap = await getDoc(docRef);
    return this._createDocumentWrapper(docSnap as DocumentSnapshot<T>);
  }

  async setDocument<T extends DocumentData>(collectionPath: string, documentId: string, data: T, options?: { merge?: boolean }): Promise<void> {
    const docRef = doc(this.firestore, collectionPath, documentId);
    await setDoc(docRef, data, { merge: options?.merge ?? false });
  }

  async updateDocument<T extends DocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    const docRef = doc(this.firestore, collectionPath, documentId);
    await updateDoc(docRef as any, data as any);
  }

  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    const docRef = doc(this.firestore, collectionPath, documentId);
    await deleteDoc(docRef);
  }

  // --- Firestore Listeners ---
  listenToDocument<T extends DocumentData>(path: string, onNext: (doc: FirebaseDocument<T>) => void, onError?: (error: Error) => void): () => void {
    const docRef = doc(this.firestore, path) as WebDocumentReference<T>;
    return onSnapshot(docRef, 
      (docSnap) => {
        onNext(this._createDocumentWrapper(docSnap));
      },
      onError
    );
  }

  listenToCollection<T extends DocumentData>(path: string, onNext: (docs: FirebaseDocument<T>[]) => void, onError?: (error: Error) => void, options?: QueryOptions): () => void {
    let q: WebQuery<T> = collection(this.firestore, path) as WebQuery<T>;

    if (options?.where) {
      options.where.forEach(([field, op, value]) => {
        q = query(q, where(field, op, value));
      });
    }
    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy[0] as any, options.orderBy[1] as any));
    }
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    return onSnapshot(q, 
      (querySnapshot) => {
        const docs = querySnapshot.docs.map(docSnap => this._createDocumentWrapper(docSnap));
        onNext(docs);
      },
      onError
    );
  }

  // --- Transaction and Batch ---
  async runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T> {
    return webRunTransaction(this.firestore, (transaction) => updateFunction(transaction as CustomTransaction));
  }

  batch(): CustomWriteBatch {
    return webWriteBatch(this.firestore) as CustomWriteBatch;
  }

  // --- Storage ---
  getStorageRef(path: string): any {
    return ref(this.storage as any, path);
  }

  async uploadFile(path: string, file: string | File, metadata?: any): Promise<string> {
    const storageRef = ref(this.storage as any, path);
    if (typeof file === 'string') {
        // This is a base64 string or data URL
        await uploadBytes(storageRef, new Blob([file]), metadata);
    } else {
        await uploadBytes(storageRef, file, metadata);
    }
    return getStorageDownloadURL(storageRef);
  }

  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(this.storage as any, path);
    await deleteObject(storageRef);
  }

  // --- Offline ---
  offline(): OfflineSync {
    return {
      enableSync: async () => {
        console.log('Web Firestore persistence is enabled by default during initialization.');
      },
      disableSync: async () => {
        console.warn('Disabling network is not supported in the web SDK.');
      },
      getSyncStatus: async (): Promise<SyncStatus> => ({
        lastSync: new Date(), // Placeholder
        isSyncing: navigator.onLine,
        pendingOperations: 0, // Not tracked in web sdk this way
      }),
      getQueueStatus: async (): Promise<QueueStatus> => ({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
      }),
      retryFailedOperations: async () => console.log('Not applicable for web'),
      clearQueue: async () => console.log('Not applicable for web'),
    };
  }

  // Stubs to satisfy FirebaseService interface
  async updateCard(boardId: string, listId: string, cardId: string, updates: Partial<any>): Promise<void> { throw new Error('Not implemented'); }
  async deleteCard(boardId: string, listId: string, cardId: string): Promise<void> { throw new Error('Not implemented'); }
  async reorderCardsInList(boardId: string, listId: string, orderedCards: any[]): Promise<void> { throw new Error('Not implemented'); }
  async getBoardMembers(boardId: string): Promise<any[]> { return []; }
  async addBoardMember(boardId: string, userId: string, role: string): Promise<void> { throw new Error('Not implemented'); }
  async removeBoardMember(boardId: string, userId: string): Promise<void> { throw new Error('Not implemented'); }
  async addList(boardId: string, listData: any): Promise<any> { return Promise.resolve({} as any); }
  async addCard(boardId: string, listId: string, cardData: any): Promise<any> { return Promise.resolve({} as any); }
  async moveCardToList(boardId: string, fromListId: string, toListId: string, cardId: string): Promise<void> { throw new Error('Not implemented'); }
  async reorderLists(boardId: string, orderedLists: ListData[]): Promise<void> {
    // TODO: Implement or mock for web
    return Promise.resolve();
  }
  getCollection<T>(collectionName: string): any {
    // TODO: Implement or mock for web
    return null;
  }
}
