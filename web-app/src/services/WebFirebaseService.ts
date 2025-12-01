import type {
  FirebaseService,
  OfflineSync,
  FirebaseDocument,
} from '../../shared/services/firebase/types';
import type { ListData } from '../../shared/types/taskManager';
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
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

// Minimal stub for base class
class BaseFirebaseService {}

export class WebFirebaseService extends BaseFirebaseService implements FirebaseService {
  private app: FirebaseApp;
  public auth: Auth;
  public firestore: Firestore;
  public storage: any;

  constructor(app: FirebaseApp, auth: Auth, firestore: Firestore) {
    super();
    this.app = app;
    this.auth = auth;
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

  async sendPasswordResetEmail(email: string): Promise<void> {
      return webSendPasswordReset(this.auth, email);
  }

  // Direct auth methods required by shared FirebaseService interface
  async signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    return webSignIn(this.auth, email, password);
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    return webCreateUser(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    return webSignOut(this.auth);
  }


  // --- Firestore Document/Collection ---
  private _createDocumentWrapper<T extends DocumentData>(docSnapshot: DocumentSnapshot<T>): FirebaseDocument<T> {
    return {
      id: docSnapshot.id,
      data: docSnapshot.data() as T,
      exists: docSnapshot.exists(),
      ref: docSnapshot.ref as WebDocumentReference<T>,
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

  async getDocuments<T extends DocumentData>(collectionPath: string, options?: { where?: [string, any, any][]; orderBy?: [string, 'asc' | 'desc'][]; limit?: number }): Promise<FirebaseDocument<T>[]> {
    let q: WebQuery<T> = collection(this.firestore, collectionPath) as WebQuery<T>;

    if (options?.where) {
      options.where.forEach(([field, op, value]: [string, any, any]) => {
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

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap: QueryDocumentSnapshot<T>) => this._createDocumentWrapper(docSnap));
  }

  async addDocument<T extends DocumentData>(collectionPath: string, data: Omit<T, 'id'>): Promise<FirebaseDocument<T>> {
    const collRef = collection(this.firestore, collectionPath) as WebCollectionReference<T>;
    const docRef = await addDoc(collRef, data);
    return {
      id: docRef.id,
      data: data as T,
      exists: true,
      ref: docRef as WebDocumentReference<T>,
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
      getQueueStatus: async () => ({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        failed: 0
      }),
      retryFailedOperations: async () => { /* noop */ },
      clearQueue: async () => { /* noop */ }
    };
  }

  async addList(boardId: string, listData: Omit<ListData, 'id'>): Promise<ListData> {
    const collRef = collection(this.firestore, `boards/${boardId}/lists`);
    const docRef = await addDoc(collRef, {
      ...listData,
      boardId,
      createdAt: new Date(),
    });
    return { id: docRef.id, name: listData.name, order: listData.order, boardId };
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

  async uploadFile(path: string, file: string | File, metadata?: any): Promise<string> {
    try {
      // Handle both File objects and file URIs (strings)
      let fileToUpload: File;
      
      if (typeof file === 'string') {
        // For string URIs, we need to fetch the file first
        // This is typically used in mobile environments
        throw new Error('File URI upload not supported in WebFirebaseService. Use File object instead.');
      } else {
        fileToUpload = file;
      }

      // Basic file validation - allow images and videos
      const isImage = fileToUpload.type.startsWith('image/');
      const isVideo = fileToUpload.type.startsWith('video/');
      if (!isImage && !isVideo) {
        throw new Error('Invalid file type. Only images and videos are allowed.');
      }

      // File size validation (5MB for images, 50MB for videos)
      const maxFileSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
      if (fileToUpload.size > maxFileSize) {
        throw new Error(`File exceeds maximum size of ${isImage ? '5MB' : '50MB'}.`);
      }

      // Create storage reference
      const storageRef = ref(this.storage, path);

      // Prepare upload metadata
      const uploadMetadata = {
        contentType: fileToUpload.type,
        customMetadata: {
          'uploaded-by': 'props-bible-web-app',
          'original-name': fileToUpload.name,
          ...metadata?.customMetadata
        },
        ...metadata
      };

      // Upload the file
      const snapshot = await uploadBytes(storageRef, fileToUpload, uploadMetadata);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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