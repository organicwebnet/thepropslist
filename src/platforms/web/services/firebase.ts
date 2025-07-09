import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  UserCredential,
  getAuth,
  signInWithEmailAndPassword as webSignIn,
  signOut as webSignOut,
  createUserWithEmailAndPassword as webCreateUser,
  sendPasswordResetEmail as webSendPasswordReset,
  onAuthStateChanged
} from 'firebase/auth';
import {
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
  QueryDocumentSnapshot,
  type DocumentData as WebDocumentData,
  Timestamp as WebTimestamp,
  Transaction as WebTransaction,
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
  limit
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

  constructor(app: FirebaseApp, auth: Auth, firestore: Firestore) {
    super();
    this.app = app;
    this.auth = auth;
    this.firestore = firestore;
    this.storage = getStorage(this.app);
  }

  async initialize(): Promise<void> {
    try {
        await enableIndexedDbPersistence(this.firestore);
        // Firestore persistence enabled
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            // Firestore Persistence failed precondition. Multiple tabs open?
        } else if (err.code === 'unimplemented') {
            // Firestore Persistence is not available in this browser environment
        }
    }
    // Firebase Web initialized successfully
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
    return querySnapshot.docs.map((docSnap: QueryDocumentSnapshot<T>) => this._createDocumentWrapper(docSnap));
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
      (docSnap: DocumentSnapshot<T>) => {
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
      (querySnapshot: QuerySnapshot<T>) => {
        const docs = querySnapshot.docs.map(docSnap => this._createDocumentWrapper(docSnap));
        onNext(docs);
      },
      onError
    );
  }

  // --- Transaction and Batch ---
  async runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T> {
    return webRunTransaction(this.firestore, (transaction: WebTransaction) => updateFunction(transaction as CustomTransaction));
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
      // For web, if `file` is a string, assume it's a base64 string or a URL
      // For simplicity, we'll assume it's a base64 string for now. Adjust if needed.
      const base64String = file.split(',')[1]; // Get base64 part
      const bytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
      await uploadBytes(storageRef, bytes, metadata);
    } else {
      // If `file` is a File object (from input[type="file"]), upload directly
      await uploadBytes(storageRef, file, metadata);
    }
    return getStorageDownloadURL(storageRef);
  }

  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(this.storage as any, path);
    await deleteObject(storageRef);
  }

  offline(): OfflineSync {
    throw new Error('Offline synchronization is not implemented for web.');
  }

  // --- App-specific methods (Not implemented in WebFirebaseService for now) ---
  // These methods are typically specific to the mobile platform or require different web implementations
  async updateCard(boardId: string, listId: string, cardId: string, updates: Partial<any>): Promise<void> { throw new Error('Not implemented'); }
  async deleteCard(boardId: string, listId: string, cardId: string): Promise<void> { throw new Error('Not implemented'); }
  async reorderCardsInList(boardId: string, listId: string, orderedCards: any[]): Promise<void> { throw new Error('Not implemented'); }
  async getBoardMembers(boardId: string): Promise<any[]> { return []; }
  async addBoardMember(boardId: string, userId: string, role: string): Promise<void> { throw new Error('Not implemented'); }
  async removeBoardMember(boardId: string, userId: string): Promise<void> { throw new Error('Not implemented'); }
  async addList(boardId: string, listData: Omit<ListData, 'id'>): Promise<ListData> {
    // Add a new list to the board's lists subcollection
    const collRef = collection(this.firestore, `boards/${boardId}/lists`);
    const docRef = await addDoc(collRef, {
      ...listData,
      createdAt: new Date(),
    });
    return { ...listData, id: docRef.id };
  }
  async addCard(boardId: string, listId: string, cardData: any): Promise<any> { return Promise.resolve({} as any); }
  async moveCardToList(boardId: string, fromListId: string, toListId: string, cardId: string): Promise<void> { throw new Error('Not implemented'); }
  async reorderLists(boardId: string, orderedLists: ListData[]): Promise<void> { throw new Error('Not implemented'); }

  getCollection<T extends DocumentData>(collectionName: string): any {
    throw new Error("Method not implemented.");
  }
  deleteShow(showId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
