import { getFirestore, FirebaseFirestoreTypes, query as fbQuery, where as fbWhere, orderBy as fbOrderBy, limit as fbLimit, collection as fbCollection, doc as fbDoc, serverTimestamp, deleteDoc as fbDelete, updateDoc as fbUpdate, setDoc as fbSet, addDoc as fbAdd, getDoc as fbGetDoc, Timestamp, onSnapshot } from '@react-native-firebase/firestore';
import { getStorage, FirebaseStorageTypes, ref as storageRef, getDownloadURL, TaskState } from '@react-native-firebase/storage';
import { getAuth, FirebaseAuthTypes, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as fbSignOut } from '@react-native-firebase/auth';
import firebase, { getApps, getApp, initializeApp as fbInitializeApp, ReactNativeFirebase } from '@react-native-firebase/app';
import { FirebaseError, FirebaseService, OfflineSync, FirebaseDocument, QueryOptions, CustomUserCredential, CustomDocumentData, CustomDocumentReference, CustomStorageReference, CustomTransaction, CustomWriteBatch } from '../../../shared/services/firebase/types';
import { v4 as uuidv4 } from 'uuid';
import type { Prop } from '../../../shared/types/props';
import type { BoardData, ListData, CardData, MemberData } from '../../../shared/types/taskManager';

// MobileOfflineSync remains largely the same but its constructor expects FirebaseFirestoreTypes.Module
class MobileOfflineSync implements OfflineSync {
  constructor(private firestoreInstance: FirebaseFirestoreTypes.Module) {}

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async getItem<T>(key: string): Promise<T | null> {
    console.warn('MobileOfflineSync getItem not implemented');
    return null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    console.warn('MobileOfflineSync setItem not implemented');
    return Promise.resolve();
  }

  async removeItem(key: string): Promise<void> {
    console.warn('MobileOfflineSync removeItem not implemented');
    return Promise.resolve();
  }

  async clear(): Promise<void> {
    console.warn('MobileOfflineSync clear not implemented');
    return Promise.resolve();
  }

  async enableSync(): Promise<void> {
    try {
      await this.firestoreInstance.enableNetwork();
    } catch (error) {
      console.error("Error enabling Firestore network:", error);
    }
  }

  async disableSync(): Promise<void> {
    try {
      await this.firestoreInstance.disableNetwork();
    } catch (error) {
      console.error("Error disabling Firestore network:", error);
    }
  }

  async getSyncStatus(): Promise<import('../../../shared/services/firebase/types.ts').SyncStatus> {
    console.warn('MobileOfflineSync getSyncStatus returning mock data');
    return {
      isEnabled: true,
      isOnline: true,
      pendingOperations: 0,
      lastSyncTimestamp: null,
    };
  }

  async queueOperation(): Promise<void> {
    console.warn('MobileOfflineSync queueOperation not implemented');
    return Promise.resolve();
  }

  async getQueueStatus(): Promise<import('../../../shared/services/firebase/types.ts').QueueStatus> {
    console.warn('MobileOfflineSync getQueueStatus returning mock data');
    return {
      pending: 0,
      processing: 0,
      lastProcessed: null
    };
  }
}

export class MobileFirebaseService implements FirebaseService {
  protected _firestore: FirebaseFirestoreTypes.Module | undefined;
  protected _auth: FirebaseAuthTypes.Module | undefined;
  protected _storage: FirebaseStorageTypes.Module | undefined;
  private _offlineSync: MobileOfflineSync | undefined;
  private _isInitialized = false;
  private _defaultApp: ReactNativeFirebase.FirebaseApp | undefined;

  constructor() {
    // console.log("[MobileFirebaseService] Constructor called.");
  }

  async initialize(): Promise<void> {
    // console.log("[MobileFirebaseService] initialize() called.");
    if (this._isInitialized) {
      // console.log("[MobileFirebaseService] Already initialized. Skipping.");
      return;
    }
    try {
      // console.log("[MobileFirebaseService] Attempting @react-native-firebase initialization...");

      const apps = getApps();
      if (apps.length === 0) {
        // console.warn("[MobileFirebaseService] No pre-initialized Firebase app. Attempting to initialize default app.");
        const firebaseConfig: ReactNativeFirebase.FirebaseAppOptions = {
          appId: "MOCK_APP_ID", // Required by FirebaseAppOptions
          projectId: "MOCK_PROJECT_ID", // Required by FirebaseAppOptions
          // apiKey, databaseURL, etc., can be added if necessary, but keeping it minimal for default app init
        };
        this._defaultApp = await fbInitializeApp(firebaseConfig);
        if (!this._defaultApp) {
            this._defaultApp = getApp();
        }
      } else {
        this._defaultApp = getApp();
      }
      
      if (!this._defaultApp) {
        console.error("[MobileFirebaseService] CRITICAL: Default Firebase app could not be obtained. Firebase services will not work.");
        throw new Error("Failed to obtain default Firebase app.");
      }
      // console.log(`[MobileFirebaseService] Using Firebase app: ${this._defaultApp.name}`);

      this._auth = getAuth(this._defaultApp);
      this._firestore = getFirestore(this._defaultApp);
      this._storage = getStorage(this._defaultApp);
      
      // console.log("[MobileFirebaseService] Auth instance obtained:", this._auth ? 'Exists' : 'Failed');
      // console.log("[MobileFirebaseService] Firestore instance obtained:", this._firestore ? 'Exists' : 'Failed');
      // console.log("[MobileFirebaseService] Storage instance obtained:", this._storage ? 'Exists' : 'Failed');

      if (!this._firestore) throw new Error("Firestore must be initialized before Offline Sync");
      this._offlineSync = new MobileOfflineSync(this._firestore);
      // console.log("[MobileFirebaseService] Offline Sync initialized.");

      this._isInitialized = true;
      // console.log("[MobileFirebaseService] Initialization successful.");
    } catch (error) {
      console.error("[MobileFirebaseService] Error during initialize():", error);
      this._isInitialized = false;
      throw this.handleError('Firebase initialization failed', error);
    }
  }

  private getApp(): ReactNativeFirebase.FirebaseApp {
    if (!this._defaultApp) {
        throw new FirebaseError('Firebase app not initialized. Call initialize() first.', 'not-initialized');
    }
    return this._defaultApp;
  }

  auth(): FirebaseAuthTypes.Module {
    if (!this._isInitialized || !this._auth) throw new FirebaseError('Auth module not initialized.', 'not-initialized');
    return this._auth;
  }

  firestore(): FirebaseFirestoreTypes.Module {
    if (!this._isInitialized || !this._firestore) throw new FirebaseError('Firestore module not initialized.', 'not-initialized');
    return this._firestore;
  }
  
  getFirestoreJsInstance(): any { // Placeholder for Web Firestore type
    throw new Error('getFirestoreJsInstance is not applicable for MobileFirebaseService');
  }

  getFirestoreReactNativeInstance(): FirebaseFirestoreTypes.Module {
     return this.firestore();
  }

  storage(): FirebaseStorageTypes.Module {
    if (!this._isInitialized || !this._storage) throw new FirebaseError('Storage module not initialized.', 'not-initialized');
    return this._storage;
  }

  offline(): OfflineSync {
    if (!this._isInitialized || !this._offlineSync) throw new FirebaseError('OfflineSync module not initialized.', 'not-initialized');
    return this._offlineSync;
  }
  
  async runTransaction<T>(
    updateFunction: (transaction: CustomTransaction) => Promise<T>
  ): Promise<T> {
    const firestoreInstance = this.firestore();
    // RN Firebase runTransaction is directly on the firestore instance
    return firestoreInstance.runTransaction(updateFunction as any); // Cast needed due to CustomTransaction
  }

  batch(): CustomWriteBatch {
    const firestoreInstance = this.firestore();
    // RN Firebase batch is directly on the firestore instance
    return firestoreInstance.batch() as CustomWriteBatch; // Cast needed due to CustomWriteBatch
  }

  createBatch(): CustomWriteBatch {
    const firestoreInstance = this.firestore();
    return firestoreInstance.batch() as CustomWriteBatch;
  }

  getListDocRef(boardId: string, listId: string): CustomDocumentReference {
    return this.firestore().collection('todo_boards').doc(boardId).collection('lists').doc(listId) as CustomDocumentReference;
  }

  getCardDocRef(boardId: string, listId: string, cardId: string): CustomDocumentReference {
    return this.firestore().collection('todo_boards').doc(boardId).collection('lists').doc(listId).collection('cards').doc(cardId) as CustomDocumentReference;
  }

  private _snapshotToFirebaseDocument<T extends CustomDocumentData>(
    snapshot: FirebaseFirestoreTypes.DocumentSnapshot<T> | FirebaseFirestoreTypes.QueryDocumentSnapshot<T>
  ): FirebaseDocument<T> {
    const typedDocRef = snapshot.ref; // Now correctly FirebaseFirestoreTypes.DocumentReference<T>
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const data = snapshot.exists ? snapshot.data() : undefined;

    return {
      id: snapshot.id,
      ref: typedDocRef as CustomDocumentReference<T>, // This cast is fine as typedDocRef is DocumentReference<T>
      data: data,
      get: async (): Promise<T | undefined> => (await typedDocRef.get()).data(),
      set: (newData: T): Promise<void> => typedDocRef.set(newData as any), // Keep as any for SetValue<T> issues for now
      update: (updateData: Partial<T>): Promise<void> => typedDocRef.update(updateData as any), // Keep as any for SetValue<T> issues for now
      delete: (): Promise<void> => typedDocRef.delete(),
    };
  }
  
  listenToDocument<T extends CustomDocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    const firestoreInstance = this.firestore();
    const documentRef = fbDoc(firestoreInstance, path) as FirebaseFirestoreTypes.DocumentReference<T>; // Assert type T
    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot: FirebaseFirestoreTypes.DocumentSnapshot<T>) => {
        onNext(this._snapshotToFirebaseDocument<T>(snapshot));
      },
      (err: Error) => {
        if (onError) onError(this.handleError(`Error listening to document ${path}`, err));
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
    const firestoreInstance = this.firestore();
    const collectionRef = fbCollection(firestoreInstance, path) as FirebaseFirestoreTypes.CollectionReference<T>; // Assert type T
    const queryConstraints:any[] = [];

    if (options) {
      if (options.where) {
        for (const [field, op, value] of options.where) {
          queryConstraints.push(fbWhere(field as string | FirebaseFirestoreTypes.FieldPath, op, value));
        }
      }
      if (options.orderBy) {
        for (const [field, direction] of options.orderBy) {
          queryConstraints.push(fbOrderBy(field as string | FirebaseFirestoreTypes.FieldPath, direction));
        }
      }
      if (options.limit) {
        queryConstraints.push(fbLimit(options.limit));
      }
    }

    const finalQuery = queryConstraints.length > 0 ? fbQuery(collectionRef, ...queryConstraints) : collectionRef;

    const unsubscribe = onSnapshot(
      finalQuery as FirebaseFirestoreTypes.Query<T>,
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot<T>) => {
        const docs = snapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc));
        onNext(docs);
      },
      (err: Error) => {
        if (onError) onError(this.handleError(`Error listening to collection ${path}`, err));
      }
    );
    return unsubscribe;
  }
  
  createDocumentWrapper<T extends CustomDocumentData>(
    docRefInput: CustomDocumentReference<T>
  ): FirebaseDocument<T> {
    const rnDocRef = docRefInput as FirebaseFirestoreTypes.DocumentReference<T>; // Assert T here
    
    if (typeof rnDocRef.onSnapshot !== 'function' || typeof rnDocRef.get !== 'function') {
        console.error("docRefInput is not a valid RN Firestore DocumentReference", docRefInput);
        throw new FirebaseError('Invalid document reference type provided to createDocumentWrapper for Mobile.', 'invalid-argument');
    }

    return {
        id: rnDocRef.id,
        ref: rnDocRef as CustomDocumentReference<T>,
        data: undefined, 
        get: async (): Promise<T | undefined> => (await rnDocRef.get()).data(),
        set: (newData: T): Promise<void> => rnDocRef.set(newData as any), // Keep as any
        update: (updateData: Partial<T>): Promise<void> => rnDocRef.update(updateData as any), // Keep as any
        delete: (): Promise<void> => rnDocRef.delete(),
    };
  }

  getStorageRef(path: string): CustomStorageReference {
    const storageInstance = this.storage();
    return storageRef(storageInstance, path) as CustomStorageReference;
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    const authInstance = this.auth();
    try {
        return await signInWithEmailAndPassword(authInstance, email, password) as CustomUserCredential;
    } catch (error) {
        throw this.handleError('Sign in failed', error);
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    const authInstance = this.auth();
    try {
        return await createUserWithEmailAndPassword(authInstance, email, password) as CustomUserCredential;
    } catch (error) {
        throw this.handleError('User creation failed', error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const authInstance = this.auth();
    try {
        await sendPasswordResetEmail(authInstance, email);
    } catch (error) {
        throw this.handleError('Password reset failed', error);
    }
  }

  async signOut(): Promise<void> {
    const authInstance = this.auth();
    try {
        await fbSignOut(authInstance);
    } catch (error) {
        throw this.handleError('Sign out failed', error);
    }
  }
  
  async setDocument<T extends CustomDocumentData>(
    collectionPath: string,
    documentId: string,
    data: T,
    options?: { merge?: boolean }
  ): Promise<void> {
    const firestoreInstance = this.firestore();
    const docRef = fbDoc(firestoreInstance, collectionPath, documentId) as FirebaseFirestoreTypes.DocumentReference<T>; // Assert T
    try {
      await fbSet(docRef, data as any, options); // data as any for SetValue
    } catch (error) {
      throw this.handleError(`Error setting document ${collectionPath}/${documentId}`, error);
    }
  }

  protected handleError(message: string, error: unknown): FirebaseError {
    if (error instanceof FirebaseError) {
      return error;
    }
    // Check if error is a Firebase native error (has a 'code' property)
    if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string') {
      const fbNativeError = error as { code: string; message: string };
      console.error(`[MobileFirebaseService] Native Firebase Error: ${fbNativeError.code} - ${fbNativeError.message}`, error);
      return new FirebaseError(fbNativeError.message, fbNativeError.code, error);
    } 
    // General error
    console.error(`[MobileFirebaseService] General Error: ${message}`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new FirebaseError(`${message}: ${errorMessage}`, 'unknown', error);
  }

  // Placeholder implementations for existing methods from Base (if any were concrete and need overriding)
  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    const firestoreInstance = this.firestore();
    // No T involved here directly unless we type the ref, but it's just for deletion.
    const docRef = fbDoc(firestoreInstance, collectionPath, documentId);
    try {
      await fbDelete(docRef);
    } catch (error) {
      throw this.handleError(`Error deleting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    const firestoreInstance = this.firestore();
    const docRef = fbDoc(firestoreInstance, collectionPath, documentId) as FirebaseFirestoreTypes.DocumentReference<T>; // Assert type T
    try {
      const docSnapshot = await fbGetDoc(docRef); // docSnapshot is DocumentSnapshot<T>
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (docSnapshot.exists) { // Use .exists which is a boolean property in RN
        return this._snapshotToFirebaseDocument<T>(docSnapshot);
      }
      return null;
    } catch (error) {
      throw this.handleError(`Error getting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocuments<T extends CustomDocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]> {
    const firestoreInstance = this.firestore();
    const collectionRef = fbCollection(firestoreInstance, collectionPath) as FirebaseFirestoreTypes.CollectionReference<T>; // Assert T
    const queryConstraints: any[] = [];

    if (options) {
        if (options.where) {
            for (const [field, op, value] of options.where) {
                queryConstraints.push(fbWhere(field as string | FirebaseFirestoreTypes.FieldPath, op, value));
            }
        }
        if (options.orderBy) {
            for (const [field, direction] of options.orderBy) {
                queryConstraints.push(fbOrderBy(field as string | FirebaseFirestoreTypes.FieldPath, direction));
            }
        }
        if (options.limit) {
            queryConstraints.push(fbLimit(options.limit));
        }
    }
    
    const finalQuery = queryConstraints.length > 0 ? fbQuery(collectionRef, ...queryConstraints) : collectionRef;

    try {
        const querySnapshot = await (finalQuery as FirebaseFirestoreTypes.Query<T>).get(); // finalQuery is Query<T>
        return querySnapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc)); // doc is QueryDocumentSnapshot<T>
    } catch (error) {
        throw this.handleError(`Error getting documents from ${collectionPath}`, error);
    }
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    const firestoreInstance = this.firestore();
    const docRef = fbDoc(firestoreInstance, collectionPath, documentId) as FirebaseFirestoreTypes.DocumentReference<T>; // Assert T
    try {
      await fbUpdate(docRef, data as any); // data as any for SetValue
    } catch (error) {
      throw this.handleError(`Error updating document ${collectionPath}/${documentId}`, error);
    }
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    const firestoreInstance = this.firestore();
    const collectionRef = fbCollection(firestoreInstance, collectionPath) as FirebaseFirestoreTypes.CollectionReference<T>; // Assert T
    try {
      // console.log(`[MobileFirebaseService] addDocument: Adding doc to ${collectionPath} with data:`, JSON.stringify(data, null, 2));
      const docRef = await fbAdd<T>(collectionRef, data as any); // data as any for SetValue, fbAdd should be generic
      const newDocSnapshot = await docRef.get(); // newDocSnapshot is DocumentSnapshot<T>
      // console.log(`[MobileFirebaseService] addDocument: Successfully added doc with ID: ${docRef.id}`);
      return this._snapshotToFirebaseDocument<T>(newDocSnapshot);
    } catch (error) {
      // console.error(`[MobileFirebaseService] addDocument: FAILED to add doc to ${collectionPath}`, error);
      throw this.handleError(`Error adding document to ${collectionPath}`, error);
    }
  }

  async uploadFile(storagePath: string, fileUriOrBlob: string | File): Promise<string> {
    if (typeof fileUriOrBlob !== 'string') {
        throw new FirebaseError("MobileFirebaseService uploadFile expects a file URI (string).", "invalid-argument");
    }
    const storageInstance = this.storage();
    const fileRef = storageRef(storageInstance, storagePath);
    try {
        // For mobile, fileUriOrBlob should be a local file URI
        const uploadTask = fileRef.putFile(fileUriOrBlob);
        const snapshot = await uploadTask; // Wait for upload to complete and get snapshot
        if (snapshot.state === TaskState.SUCCESS) { // Check state on snapshot
            return getDownloadURL(fileRef);
        }
        throw new FirebaseError('File upload did not complete successfully.', 'upload-failed');
    } catch (error) {
        throw this.handleError(`Error uploading file to ${storagePath}`, error);
    }
  }

  async deleteFile(path: string): Promise<void> {
    const storageInstance = this.storage();
    const fileRef = storageRef(storageInstance, path);
    try {
      await fileRef.delete();
    } catch (error) {
      throw this.handleError(`Error deleting file at ${path}`, error);
    }
  }
  
  async deleteShow(showId: string): Promise<void> {
    // This is a placeholder and should be implemented based on your Firestore structure for shows
    console.warn(`deleteShow(${showId}) not fully implemented in MobileFirebaseService.`);
    // Example: await this.deleteDocument('shows', showId);
    throw new FirebaseError('deleteShow method not implemented', 'unimplemented');
  }

  async getPropsByShowId(showId: string): Promise<FirebaseDocument<Prop>[]> {
    console.warn(`getPropsByShowId(${showId}) not implemented in MobileFirebaseService.`);
    // Example: return this.getDocuments<Prop>(`shows/${showId}/props`);
    throw new FirebaseError('getPropsByShowId method not implemented', 'unimplemented');
  }

  // --- TaskManager Specific Methods ---
  async getBoard(boardId: string): Promise<BoardData | null> {
    // console.log(`[MobileFirebaseService] getBoard: fetching from path: todo_boards/${boardId}`);
    const doc = await this.getDocument<BoardData>('todo_boards', boardId);
    if (!doc) {
      // console.log(`[MobileFirebaseService] getBoard: No document found for ID ${boardId}`);
      return null;
    }
    // console.log(`[MobileFirebaseService] getBoard: Found document, data:`, doc.data);
    return doc.data ?? null;
  }

  async getListsForBoard(boardId: string): Promise<ListData[]> {
    const docs = await this.getDocuments<ListData>(`todo_boards/${boardId}/lists`, { orderBy: [['order', 'asc']] });
    return docs.map(doc => {
      const data = doc.data;
      if (!data) {
        // This case should ideally not happen if data is well-maintained,
        // but as a fallback, we create a default structure.
        return { id: doc.id, name: "Unnamed List", order: 0, boardId: boardId };
      }
      return { ...data, id: doc.id };
    });
  }

  async getCardsForList(boardId: string, listId: string): Promise<CardData[]> {
    const docs = await this.getDocuments<CardData>(`todo_boards/${boardId}/lists/${listId}/cards`, { orderBy: [['order', 'asc']] });
    return docs.map(doc => {
      const data = doc.data;
      if (!data) {
        return { id: doc.id, title: "Unnamed Card", order: 0, listId: listId, boardId: boardId };
      }
      return { ...data, id: doc.id };
    });
  }

  async getBoardMembers(boardId: string): Promise<MemberData[]> {
    // This method is likely incorrect based on the data model.
    // For now, returning an empty array to satisfy the interface.
    // A more complex implementation would be needed to gather all members from all cards.
    console.warn(`getBoardMembers for board ${boardId} is returning an empty array. The data model suggests members are on cards, not boards.`);
    return [];
  }

  async addList(boardId: string, listData: Omit<ListData, 'id' | 'boardId'>): Promise<ListData> {
    const dataWithId = { ...listData, boardId, id: 'temp' } as ListData;
    const doc = await this.addDocument(`todo_boards/${boardId}/lists`, dataWithId);
    const data = doc.data;
    if (!data) throw new FirebaseError('Failed to create list, no data returned.', 'internal-error');
    return { ...data, id: doc.id };
  }

  async addCard(boardId: string, listId: string, cardData: Omit<CardData, 'id' | 'boardId' | 'listId'>): Promise<CardData> {
    const dataWithId = { ...cardData, boardId, listId, id: 'temp', title: cardData.title || "New Card" } as CardData;
    const doc = await this.addDocument(`todo_boards/${boardId}/lists/${listId}/cards`, dataWithId);
    const data = doc.data;
    if (!data) throw new FirebaseError('Failed to create card, no data returned.', 'internal-error');
    return { ...data, id: doc.id };
  }

  async updateCard(boardId: string, listId: string, cardId: string, updates: Partial<CardData>): Promise<void> {
    await this.updateDocument(`todo_boards/${boardId}/lists/${listId}/cards`, cardId, updates);
  }

  async deleteCard(boardId: string, listId: string, cardId: string): Promise<void> {
    await this.deleteDocument(`todo_boards/${boardId}/lists/${listId}/cards`, cardId);
  }

  async moveCardToList(boardId: string, cardId: string, originalListId: string, targetListId: string, newOrder: number): Promise<void> {
    const cardDoc = await this.getDocument<CardData>(`todo_boards/${boardId}/lists/${originalListId}/cards`, cardId);
    const cardData = cardDoc?.data;
    if (!cardData) {
      throw new FirebaseError('Card not found', 'not-found');
    }
    const movedCardData: CardData = { ...cardData, listId: targetListId, order: newOrder };

    const batch = this.batch();
    const oldCardRef = this.firestore().collection('todo_boards').doc(boardId).collection('lists').doc(originalListId).collection('cards').doc(cardId);
    const newCardRef = this.firestore().collection('todo_boards').doc(boardId).collection('lists').doc(targetListId).collection('cards').doc(cardId);

    batch.delete(oldCardRef);
    batch.set(newCardRef, movedCardData);

    await batch.commit();
  }

  async reorderCardsInList(boardId: string, listId: string, orderedCards: CardData[]): Promise<void> {
    console.warn(`MobileFirebaseService.reorderCardsInList(${boardId}, ${listId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }
}