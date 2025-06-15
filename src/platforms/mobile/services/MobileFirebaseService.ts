import { getFirestore, FirebaseFirestoreTypes, query as fbQuery, where as fbWhere, orderBy as fbOrderBy, limit as fbLimit, collection as fbCollection, doc as fbDoc, serverTimestamp, deleteDoc as fbDelete, updateDoc as fbUpdate, setDoc as fbSet, addDoc as fbAdd, getDoc as fbGetDoc, Timestamp, onSnapshot, getDocs as fbGetDocs, runTransaction as rnRunTransaction, writeBatch as rnWriteBatch, QueryConstraint } from '@react-native-firebase/firestore';
import { getStorage, FirebaseStorageTypes, ref as storageRef, getDownloadURL, TaskState } from '@react-native-firebase/storage';
import { getAuth, FirebaseAuthTypes, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as fbSignOut } from '@react-native-firebase/auth';
import firebase, { getApps, getApp, initializeApp as fbInitializeApp, ReactNativeFirebase } from '@react-native-firebase/app';
import { FirebaseError, FirebaseService, OfflineSync, FirebaseDocument, QueryOptions, CustomUserCredential, CustomDocumentReference, CustomTransaction, CustomWriteBatch, SyncStatus, QueueStatus, WhereClause } from '../../../shared/services/firebase/types';
import { v4 as uuidv4 } from 'uuid';
import type { Prop } from '../../../shared/types/props';
import type { BoardData, ListData, CardData, MemberData } from '../../../shared/types/taskManager';
import { BaseFirebaseService } from '../../../shared/services/firebase/base';
import type { DocumentData } from '../../../shared/services/firebase/types';
import { MobileOfflineSync } from './MobileOfflineSync';

function createFirebaseDocument<T extends DocumentData>(docSnap: FirebaseFirestoreTypes.DocumentSnapshot): FirebaseDocument<T> {
  return {
    id: docSnap.id,
    exists: docSnap.exists,
    ref: docSnap.ref,
    data: docSnap.data() as T,
  } as unknown as FirebaseDocument<T>;
}

export class MobileFirebaseService extends BaseFirebaseService implements FirebaseService {
  auth: FirebaseAuthTypes.Module;
  firestore: FirebaseFirestoreTypes.Module;
  storage: FirebaseStorageTypes.Module;
  private _offlineSync: MobileOfflineSync;
  private _isInitialized = false;
  private _defaultApp: ReactNativeFirebase.FirebaseApp | undefined;

  constructor() {
    super();
    // Ensure default app is initialized
    if (firebase.apps.length === 0) {
      // Pass required options for initializeApp (dummy object for test/mocks)
      firebase.initializeApp({ projectId: 'dummy', appId: 'dummy', apiKey: 'dummy' } as any);
    }
    this.auth = getAuth();
    this.firestore = getFirestore();
    this.storage = getStorage();
    this._offlineSync = new MobileOfflineSync(this.firestore);
    this.firestore.settings({ persistence: true });
    console.log('Mobile Firebase initialized with persistence.');
  }

  async initialize(): Promise<void> {
    console.log('Mobile Firebase initialized.');
  }

  private getApp(): ReactNativeFirebase.FirebaseApp {
    if (!this._defaultApp) {
        throw new FirebaseError('Firebase app not initialized. Call initialize() first.', 'not-initialized');
    }
    return this._defaultApp;
  }

  getFirestoreJsInstance(): never {
    throw new Error('getFirestoreJsInstance is not available in MobileFirebaseService');
  }

  getFirestoreReactNativeInstance(): FirebaseFirestoreTypes.Module {
     return this.firestore;
  }

  offline(): OfflineSync {
    if (!this._isInitialized || !this._offlineSync) throw new FirebaseError('OfflineSync module not initialized.', 'not-initialized');
    return this._offlineSync;
  }
  
  async runTransaction<T>(
    updateFunction: (transaction: CustomTransaction) => Promise<T>
  ): Promise<T> {
    return rnRunTransaction(this.firestore, (transaction: FirebaseFirestoreTypes.Transaction) => updateFunction(transaction as CustomTransaction));
  }

  batch(): CustomWriteBatch {
    return rnWriteBatch(this.firestore);
  }

  createBatch(): CustomWriteBatch {
    const firestoreInstance = this.firestore;
    return firestoreInstance.batch() as CustomWriteBatch;
  }

  getListDocRef(boardId: string, listId: string): CustomDocumentReference {
    return this.firestore.collection('todo_boards').doc(boardId).collection('lists').doc(listId) as CustomDocumentReference;
  }

  getCardDocRef(boardId: string, listId: string, cardId: string): CustomDocumentReference {
    return this.firestore.collection('todo_boards').doc(boardId).collection('lists').doc(listId).collection('cards').doc(cardId) as CustomDocumentReference;
  }

  listenToDocument<T extends DocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    const firestoreInstance = this.firestore;
    const documentRef = fbDoc(firestoreInstance, path) as FirebaseFirestoreTypes.DocumentReference<T>;
    const unsubscribe = onSnapshot(
      documentRef,
      (snapshot: FirebaseFirestoreTypes.DocumentSnapshot<T>) => {
        onNext(this.createFirebaseDocument<T>(snapshot));
      },
      (err: Error) => {
        if (onError) onError(this.handleError(`Error listening to document ${path}`, err));
      }
    );
    return unsubscribe;
  }

  private createFirebaseDocument<T extends DocumentData>(docSnap: FirebaseFirestoreTypes.DocumentSnapshot): FirebaseDocument<T> {
    return createFirebaseDocument<T>(docSnap);
  }

  listenToCollection<T extends DocumentData>(
    collectionPath: string,
    onNext: (data: FirebaseDocument<T>[]) => void,
    onError: (error: Error) => void,
    options?: {
      where?: WhereClause[];
      orderBy?: [string, 'asc' | 'desc'][];
    }
  ): () => void {
    const queryConstraints: QueryConstraint[] = [];
    if (options?.where) {
      options.where.forEach(([field, op, value]) => {
        queryConstraints.push(fbWhere(field as string, op, value) as any);
      });
    }
    if (options?.orderBy) {
      options.orderBy.forEach(([field, direction]) => {
        queryConstraints.push(fbOrderBy(field, direction) as any);
      });
    }
    
    const collectionRef = fbCollection(this.firestore, collectionPath);
    const q = fbQuery(collectionRef, ...queryConstraints);

    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => this.createFirebaseDocument<T>(doc as FirebaseFirestoreTypes.DocumentSnapshot<DocumentData>));
        onNext(data);
      },
      (error) => { onError(error); }
    );
    return unsubscribe;
  }
  
  createDocumentWrapper<T extends DocumentData>(
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
        data: undefined as any,
        get: async (): Promise<T | undefined> => (await rnDocRef.get()).data(),
        set: (newData: T): Promise<void> => rnDocRef.set(newData as any), // Keep as any
        update: (updateData: Partial<T>): Promise<void> => rnDocRef.update(updateData as any), // Keep as any
        delete: (): Promise<void> => rnDocRef.delete(),
    } as any;
  }

  getStorageRef(path: string): CustomDocumentReference {
    const storageInstance = this.storage;
    return storageRef(storageInstance, path) as any;
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    try {
        return await signInWithEmailAndPassword(this.auth, email, password) as CustomUserCredential;
    } catch (error) {
        throw this.handleError('Sign in failed', error);
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    try {
        return await createUserWithEmailAndPassword(this.auth, email, password) as CustomUserCredential;
    } catch (error) {
        throw this.handleError('User creation failed', error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
        throw this.handleError('Password reset failed', error);
    }
  }

  async signOut(): Promise<void> {
    try {
        await fbSignOut(this.auth);
    } catch (error) {
        throw this.handleError('Sign out failed', error);
    }
  }
  
  async addDocument<T extends DocumentData>(collectionPath: string, data: Omit<T, 'id'>): Promise<FirebaseDocument<T>> {
    const collRef = fbCollection(this.firestore, collectionPath);
    const docRef = await fbAdd(collRef, data);
    const typedDocRef = docRef as FirebaseFirestoreTypes.DocumentReference<T>;
    const newDocSnapshot = await fbGetDoc(typedDocRef);
    return this.createFirebaseDocument<T>(newDocSnapshot);
  }

  async setDocument<T extends DocumentData>(collectionPath: string, docId: string, data: T, options?: { merge?: boolean }): Promise<void> {
    const docRef = fbDoc(this.firestore, collectionPath, docId);
    await fbSet(docRef, data, options);
  }

  async updateDocument<T extends DocumentData>(collectionPath: string, docId: string, data: Partial<T>): Promise<void> {
    const docRef = fbDoc(this.firestore, collectionPath, docId);
    await fbUpdate(docRef, data);
  }

  async deleteDocument(collectionPath: string, docId: string): Promise<void> {
    const firestoreInstance = this.firestore;
    // No T involved here directly unless we type the ref, but it's just for deletion.
    const docRef = fbDoc(firestoreInstance, collectionPath, docId);
    try {
      await fbDelete(docRef);
    } catch (error) {
      throw this.handleError(`Error deleting document ${collectionPath}/${docId}`, error);
    }
  }

  async getDocument<T extends DocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    const docRef = fbDoc(this.firestore, collectionPath, documentId);
    const docSnapshot = await fbGetDoc(docRef);
    if (!docSnapshot.exists()) return null;
    return this.createFirebaseDocument<T>(docSnapshot as FirebaseFirestoreTypes.DocumentSnapshot<T>);
  }

  async getDocuments<T extends DocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]> {
    const collectionRef = fbCollection(this.firestore, collectionPath);
    const queryConstraints: QueryConstraint[] = [];

    if (options) {
        if (options.where) {
            for (const [field, op, value] of options.where) {
                queryConstraints.push(fbWhere(field as string | FirebaseFirestoreTypes.FieldPath, op, value) as any);
            }
        }
        if (options.orderBy) {
            for (const [field, direction] of options.orderBy) {
                const dir: 'asc' | 'desc' = direction === 'desc' ? 'desc' : 'asc';
                queryConstraints.push(fbOrderBy(field as string | FirebaseFirestoreTypes.FieldPath, dir) as any);
            }
        }
        if (options.limit) {
            queryConstraints.push(fbLimit(options.limit) as any);
        }
    }
    
    const q = fbQuery(collectionRef, ...queryConstraints);
    const querySnapshot = await fbGetDocs(q);
    return querySnapshot.docs.map(doc => this.createFirebaseDocument<T>(doc as FirebaseFirestoreTypes.DocumentSnapshot<DocumentData>));
  }

  async uploadFile(storagePath: string, fileUriOrBlob: string | File): Promise<string> {
    if (typeof fileUriOrBlob !== 'string') {
        throw new FirebaseError("MobileFirebaseService uploadFile expects a file URI (string).", "invalid-argument");
    }
    const storageInstance = this.storage;
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
    const storageInstance = this.storage;
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
    const membersCollectionRef = fbCollection(this.firestore, 'todo_boards', boardId, 'members');
    const membersSnapshot = await fbGetDocs(membersCollectionRef);
    if (membersSnapshot.empty) return [];
    return membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberData));
  }

  async addList(boardId: string, listData: Omit<ListData, 'id'>): Promise<ListData> {
    const collectionRef = fbCollection(this.firestore, `todo_boards/${boardId}/lists`);
    const docRef = await fbAdd(collectionRef, {
      ...listData,
      createdAt: serverTimestamp(),
    });
    return { ...listData, id: docRef.id };
  }

  async addCard(boardId: string, listId: string, cardData: Omit<CardData, 'id' | 'boardId' | 'listId'>): Promise<CardData> {
    const collectionRef = fbCollection(this.firestore, `todo_boards/${boardId}/lists/${listId}/cards`);
    const docRef = await fbAdd(collectionRef, {
      ...cardData,
      boardId,
      listId,
      createdAt: serverTimestamp(),
    });
    return { ...cardData, id: docRef.id, boardId, listId };
  }

  async updateCard(boardId: string, listId: string, cardId: string, updates: Partial<CardData>): Promise<void> {
    const docRef = fbDoc(this.firestore, `todo_boards/${boardId}/lists/${listId}/cards`, cardId);
    await fbUpdate(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteCard(boardId: string, listId: string, cardId: string): Promise<void> {
    const cardRef = fbDoc(this.firestore, 'todo_boards', boardId, 'lists', listId, 'cards', cardId);
    await fbDelete(cardRef);
  }

  async reorderLists(boardId: string, orderedLists: ListData[]): Promise<void> {
    const batch = rnWriteBatch(this.firestore);
    orderedLists.forEach((list, index) => {
      const listRef = fbDoc(this.firestore, 'todo_boards', boardId, 'lists', list.id);
      batch.update(listRef, { order: index });
    });
    await batch.commit();
  }

  async reorderCardsInList(boardId: string, listId: string, orderedCards: CardData[]): Promise<void> {
    const batch = rnWriteBatch(this.firestore);
    orderedCards.forEach((card, index) => {
      const cardRef = fbDoc(this.firestore, `todo_boards/${boardId}/lists/${listId}/cards/${card.id}`);
      batch.update(cardRef, { order: index });
    });
    console.log('[reorderCardsInList] Committing batch for boardId:', boardId, 'listId:', listId, 'cardIds:', orderedCards.map(c => c.id));
    try {
      await batch.commit();
      console.log('[reorderCardsInList] Batch commit successful');
    } catch (err) {
      console.error('[reorderCardsInList] Batch commit failed:', err);
      throw err;
    }
  }

  async moveCardToList(boardId: string, cardId: string, fromListId: string, toListId: string, newOrder: number): Promise<void> {
    const fromRef = fbDoc(this.firestore, `todo_boards/${boardId}/lists/${fromListId}/cards`, cardId);
    const toRef = fbDoc(this.firestore, `todo_boards/${boardId}/lists/${toListId}/cards`, cardId);

    console.log('[moveCardToList] Moving card', cardId, 'from', fromListId, 'to', toListId, 'with newOrder', newOrder);

    try {
      await rnRunTransaction(this.firestore, async transaction => {
        const cardDoc = await transaction.get(fromRef);
        if (!cardDoc.exists) {
          throw new FirebaseError(`Card with id ${cardId} does not exist in list ${fromListId}.`, "not-found");
        }
        const cardData = cardDoc.data();
        transaction.set(toRef, { ...cardData, listId: toListId, order: newOrder });
        transaction.delete(fromRef);
      });
      console.log('[moveCardToList] Move successful');
    } catch (err) {
      console.error('[moveCardToList] Move failed:', err);
      throw err;
    }
  }

  async getCollection<T extends DocumentData>(
    collectionName: string,
    options?: {
      where?: WhereClause[];
      orderBy?: [string, 'asc' | 'desc'][];
      limit?: number;
    }
  ): Promise<FirebaseDocument<T>[]> {
    const collectionRef = fbCollection(this.firestore, collectionName);
    const queryConstraints: QueryConstraint[] = [];
    if (options?.where) {
      options.where.forEach(([field, op, value]) => {
        queryConstraints.push(fbWhere(field as string, op, value) as any);
      });
    }
    if (options?.orderBy) {
      options.orderBy.forEach(([field, direction]) => {
        queryConstraints.push(fbOrderBy(field, direction) as any);
      });
    }
    if (options?.limit) {
      queryConstraints.push(fbLimit(options.limit) as any);
    }
    const q = fbQuery(collectionRef, ...queryConstraints);
    const snapshot = await fbGetDocs(q);
    return snapshot.docs.map(doc => this.createFirebaseDocument<T>(doc as FirebaseFirestoreTypes.DocumentSnapshot<T>));
  }
}