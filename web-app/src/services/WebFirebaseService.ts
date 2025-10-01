import type {
  FirebaseService,
  OfflineService as OfflineSync,
  FirebaseDocument,
} from '../types/firebase';
import type { ListData } from '../types/taskManager';
import type { 
  MemberData, 
  CustomTransaction, 
  CustomWriteBatch, 
  WhereClause 
} from '../../shared/services/firebase/types';

import { FirebaseApp } from 'firebase/app';
import {
  Auth,
  UserCredential,
  signInWithEmailAndPassword as webSignIn,
  signOut as webSignOut,
  createUserWithEmailAndPassword as webCreateUser,
  sendPasswordResetEmail as webSendPasswordReset
} from 'firebase/auth';
import {
  Firestore,
  CollectionReference as WebCollectionReference,
  DocumentReference as WebDocumentReference,
  Query as WebQuery,
  onSnapshot,
  DocumentSnapshot,
  QueryDocumentSnapshot,
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
  DocumentData
} from 'firebase/firestore';
import {
  getStorage
} from 'firebase/storage';

// Minimal stub for base class
class BaseFirebaseService {}

export class WebFirebaseService extends BaseFirebaseService implements FirebaseService {
  private app: FirebaseApp;
  private _auth: Auth;
  public firestore: Firestore;
  public storage: any;

  constructor(app: FirebaseApp, auth: Auth, firestore: Firestore) {
    super();
    this.app = app;
    this._auth = auth;
    this.firestore = firestore;
    this.storage = getStorage(this.app);
  }

  async initialize(): Promise<void> {
    // Note: Firestore cache is now configured at initialization time
    // The new FirestoreSettings.cache approach is handled in the firebase.ts configuration
    // No additional initialization needed here for caching
  }

  getFirestoreJsInstance(): Firestore {
    return this.firestore;
  }

  getFirestoreReactNativeInstance(): never {
    throw new Error('getFirestoreReactNativeInstance is not available in WebFirebaseService');
  }

  // --- Auth ---
  auth = {
    signInWithEmailAndPassword: (email: string, password: string) => webSignIn(this._auth, email, password),
    signOut: () => webSignOut(this._auth),
    createUserWithEmailAndPassword: (email: string, password: string) => webCreateUser(this._auth, email, password),
  };

  async sendPasswordResetEmail(email: string): Promise<void> {
      return webSendPasswordReset(this._auth, email);
  }

  // Direct auth methods required by src FirebaseService interface
  async signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    return webSignIn(this._auth, email, password);
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    return webCreateUser(this._auth, email, password);
  }

  async signOut(): Promise<void> {
    return webSignOut(this._auth);
  }

  // --- Firestore Document/Collection ---
  private _createDocumentWrapper<T extends DocumentData>(docSnapshot: DocumentSnapshot<T>): FirebaseDocument<T> {
    return {
      id: docSnapshot.id,
      data: docSnapshot.data() as T,
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

  async getDocuments<T extends DocumentData>(collectionPath: string, options?: { where?: [string, any, any][]; orderBy?: [string, 'asc' | 'desc']; limit?: number }): Promise<FirebaseDocument<T>[]> {
    let q: WebQuery<T> = collection(this.firestore, collectionPath) as WebQuery<T>;

    if (options?.where) {
      options.where.forEach(([field, op, value]: [string, any, any]) => {
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

  async addDocument<T extends DocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    const collRef = collection(this.firestore, collectionPath) as WebCollectionReference<T>;
    const docRef = await addDoc(collRef, data);
    return {
      id: docRef.id,
      data: data
    };
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

  listenToCollection<T extends DocumentData>(
    collectionName: string,
    callback: (documents: FirebaseDocument<T>[]) => void,
    onError: (error: Error) => void,
    options?: {
      where?: [string, string, any][];
      orderBy?: [string, 'asc' | 'desc'][];
      limit?: number;
      startAfter?: DocumentData;
    }
  ): () => void {
    let q: WebQuery<T> = collection(this.firestore, collectionName) as WebQuery<T>;

    if (options?.where) {
      options.where.forEach(([field, op, value]: [string, string, any]) => {
        q = query(q, where(field, op as any, value));
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
    if (options?.startAfter) {
      // Note: startAfter is not implemented here, but could be added with query(q, startAfter(...)) if needed
    }

    return onSnapshot(q, (querySnapshot) => {
      const docs = querySnapshot.docs.map((docSnap: QueryDocumentSnapshot<T>) => this._createDocumentWrapper(docSnap));
      callback(docs);
    }, onError);
  }

  // --- Offline ---
  offline(): OfflineSync {
    // Provide a stub implementation for now
    return {
      enableSync: async () => { /* noop */ },
      disableSync: async () => { /* noop */ },
      getSyncStatus: async () => ({
        lastSync: null,
        isSyncing: false,
        pendingOperations: 0
      }),
    };
  }

  async addList(boardId: string, listData: Omit<ListData, 'id'>): Promise<ListData> {
    const collRef = collection(this.firestore, `boards/${boardId}/lists`);
    const docRef = await addDoc(collRef, {
      ...listData,
      createdAt: new Date(),
    });
    return { id: docRef.id, title: listData.title, cardIds: listData.cardIds };
  }

  // Missing methods from shared interface
  async getBoardMembers(_boardId: string): Promise<MemberData[]> {
    // Stub implementation - would need to implement based on your data structure
    return [];
  }

  async runTransaction<T>(_updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T> {
    // Stub implementation - would need to implement using Firestore transactions
    throw new Error('runTransaction not implemented in WebFirebaseService');
  }

  batch(): CustomWriteBatch {
    // Stub implementation - would need to implement using Firestore batch
    throw new Error('batch not implemented in WebFirebaseService');
  }

  async uploadFile(_path: string, _file: string | File, _metadata?: any): Promise<string> {
    // Stub implementation - would need to implement using Firebase Storage
    throw new Error('uploadFile not implemented in WebFirebaseService');
  }

  async deleteFile(_path: string): Promise<void> {
    // Stub implementation - would need to implement using Firebase Storage
    throw new Error('deleteFile not implemented in WebFirebaseService');
  }

  async deleteShow(_showId: string): Promise<void> {
    // Stub implementation - would need to implement show deletion logic
    throw new Error('deleteShow not implemented in WebFirebaseService');
  }

  async updateCard(_boardId: string, _listId: string, _cardId: string, _updates: Partial<any>): Promise<void> {
    // Stub implementation - would need to implement card update logic
    throw new Error('updateCard not implemented in WebFirebaseService');
  }

  async deleteCard(_boardId: string, _listId: string, _cardId: string): Promise<void> {
    // Stub implementation - would need to implement card deletion logic
    throw new Error('deleteCard not implemented in WebFirebaseService');
  }

  async reorderCardsInList(_boardId: string, _listId: string, _orderedCards: any[]): Promise<void> {
    // Stub implementation - would need to implement card reordering logic
    throw new Error('reorderCardsInList not implemented in WebFirebaseService');
  }

  async reorderLists(_boardId: string, _orderedLists: ListData[]): Promise<void> {
    // Stub implementation - would need to implement list reordering logic
    throw new Error('reorderLists not implemented in WebFirebaseService');
  }

  async addCard(_boardId: string, _listId: string, _cardData: Omit<any, 'id' | 'boardId' | 'listId'>): Promise<any> {
    // Stub implementation - would need to implement card creation logic
    throw new Error('addCard not implemented in WebFirebaseService');
  }

  async moveCardToList(_boardId: string, _cardId: string, _originalListId: string, _targetListId: string, _newOrder: number): Promise<void> {
    // Stub implementation - would need to implement card moving logic
    throw new Error('moveCardToList not implemented in WebFirebaseService');
  }

  async getCollection<T extends DocumentData>(
    _collectionName: string,
    _options?: {
      where?: WhereClause[];
      orderBy?: [string, 'asc' | 'desc'][];
      limit?: number;
    }
  ): Promise<FirebaseDocument<T>[]> {
    // Stub implementation - would need to implement collection querying logic
    throw new Error('getCollection not implemented in WebFirebaseService');
  }
} 