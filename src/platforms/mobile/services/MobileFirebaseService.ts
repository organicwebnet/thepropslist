import firestore, { FirebaseFirestoreTypes, query as fbQuery, where as fbWhere, orderBy as fbOrderBy, limit as fbLimit, QueryConstraint, collection as fbCollection, doc as fbDoc, serverTimestamp, deleteDoc as fbDelete, updateDoc as fbUpdate, setDoc as fbSet, addDoc as fbAdd, getDoc as fbGetDoc } from '@react-native-firebase/firestore';
import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firebase, { getApps } from '@react-native-firebase/app';
import { FirebaseError, FirebaseService, OfflineSync, FirebaseDocument, QueryOptions } from '../../../shared/services/firebase/types';

import {
  CustomAuth,
  CustomFirestore,
  CustomStorage,
  CustomTransaction,
  CustomWriteBatch,
  CustomDocumentData,
  CustomDocumentReference,
  CustomStorageReference,
  SyncStatus,
  QueueStatus,
  CustomUserCredential
} from '../../../shared/services/firebase/types';

import { Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

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

  async getSyncStatus(): Promise<SyncStatus> {
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

  async getQueueStatus(): Promise<QueueStatus> {
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

  constructor() {
    console.log("[MobileFirebaseService] Constructor called.");
  }

  async initialize(): Promise<void> {
    console.log("[MobileFirebaseService] initialize() called.");
    if (this._isInitialized) {
        console.log("[MobileFirebaseService] Already initialized. Skipping.");
        return;
    }
    try {
        console.log("[MobileFirebaseService] Attempting @react-native-firebase initialization...");

        const apps = getApps(); 
        console.log(`[MobileFirebaseService] Checking apps.length: ${apps.length}`);
        if (apps.length === 0) { 
            console.error("[MobileFirebaseService] Error: No native Firebase app instance found! Check native setup (google-services.json) and ensure native modules are linked correctly.");
            throw new Error("No Firebase app instance found. Check native setup.");
        } else {
             console.log(`[MobileFirebaseService] Native Default app instance found: ${apps[0].name}. Proceeding to get service instances.`);
        }

        const defaultApp = firebase.app();

        console.log("[MobileFirebaseService] Getting Auth instance...");
        this._auth = auth(defaultApp);
        console.log("[MobileFirebaseService] Auth instance obtained:", this._auth ? 'Exists' : 'Failed');

        console.log("[MobileFirebaseService] Getting Firestore instance...");
        this._firestore = firestore(defaultApp);
        console.log("[MobileFirebaseService] Firestore instance obtained:", this._firestore ? 'Exists' : 'Failed');

        console.log("[MobileFirebaseService] Getting Storage instance...");
        this._storage = storage(defaultApp);
        console.log("[MobileFirebaseService] Storage instance obtained:", this._storage ? 'Exists' : 'Failed');

        console.log("[MobileFirebaseService] Initializing Offline Sync...");
        if (!this._firestore) throw new Error("Firestore must be initialized before Offline Sync");
        this._offlineSync = new MobileOfflineSync(this._firestore);
        console.log("[MobileFirebaseService] Offline Sync initialized.");

        if (!this._auth || !this._firestore || !this._storage || !this._offlineSync) {
           console.error("[MobileFirebaseService] One or more services failed to initialize.");
           throw new Error("Firebase service initialization failed internally.");
        }

        this._isInitialized = true;
        console.log("[MobileFirebaseService] Initialization flag set to true. Initialization successful.");
    } catch (error) {
        console.error("[MobileFirebaseService] Error during initialize():", error);
        this._isInitialized = false;
        if (error instanceof Error) {
             throw new FirebaseError(error.message, 'initialization-failed');
        } else {
             throw new FirebaseError('An unknown error occurred during Firebase initialization.', 'unknown');
        }
    }
  }

  auth(): CustomAuth {
    if (!this._isInitialized || !this._auth) {
        console.error('MobileFirebaseService not initialized or Auth module failed to initialize.');
        throw new FirebaseError('MobileFirebaseService not initialized or Auth module failed to initialize.', 'not-initialized');
    }
    return this._auth as CustomAuth;
  }

  firestore(): CustomFirestore {
    if (!this._isInitialized || !this._firestore) {
        console.error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
        throw new FirebaseError('MobileFirebaseService not initialized or Firestore module failed to initialize.', 'not-initialized');
    }
     return this._firestore as CustomFirestore;
  }

  getFirestoreJsInstance(): import('firebase/firestore').Firestore {
    throw new Error('getFirestoreJsInstance is not available in MobileFirebaseService');
  }

  getFirestoreReactNativeInstance(): FirebaseFirestoreTypes.Module {
    if (!this._isInitialized || !this._firestore) {
      throw new FirebaseError('MobileFirebaseService not initialized or Firestore module failed to initialize.', 'not-initialized');
    }
    return this._firestore;
  }

  storage(): CustomStorage {
    if (!this._isInitialized || !this._storage) {
        console.error('MobileFirebaseService not initialized or Storage module failed to initialize.');
        throw new FirebaseError('MobileFirebaseService not initialized or Storage module failed to initialize.', 'not-initialized');
    }
     return this._storage as CustomStorage;
  }

  offline(): OfflineSync {
     if (!this._isInitialized || !this._offlineSync) {
       console.error('MobileFirebaseService not initialized or OfflineSync module failed to initialize.');
       throw new FirebaseError('MobileFirebaseService not initialized or OfflineSync module failed to initialize.', 'not-initialized');
     }
     return this._offlineSync;
  }

  async runTransaction<T>(
    updateFunction: (transaction: CustomTransaction) => Promise<T>
  ): Promise<T> {
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
    return this._firestore.runTransaction(updateFunction as any);
  }

  batch(): CustomWriteBatch {
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
    return this._firestore.batch() as CustomWriteBatch;
  }

  private _snapshotToFirebaseDocument<T extends CustomDocumentData>(
    snapshot: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData> | FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
  ): FirebaseDocument<T> {
    const rnDocRef = snapshot.ref as FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>; 
    const data = snapshot.exists() ? snapshot.data() as T : undefined;

    return {
      id: snapshot.id,
      ref: rnDocRef as unknown as CustomDocumentReference<T>,
      data: data,
      get: async (): Promise<T | undefined> => {
        try {
          const docSnapshot = await rnDocRef.get(); 
          return docSnapshot.exists() ? docSnapshot.data() as T : undefined;
        } catch (error) {
          this.handleError(`Error getting document ${snapshot.id}`, error);
        }
      },
      set: async (newData: T): Promise<void> => {
        try {
          await rnDocRef.set(newData as any);
        } catch (error) {
          this.handleError(`Error setting document ${snapshot.id}`, error);
        }
      },
      update: async (updateData: Partial<T>): Promise<void> => {
        try {
          await rnDocRef.update(updateData as any);
        } catch (error) {
          this.handleError(`Error updating document ${snapshot.id}`, error);
        }
      },
      delete: async (): Promise<void> => {
        try {
          await rnDocRef.delete();
        } catch (error) {
          this.handleError(`Error deleting document ${snapshot.id}`, error);
        }
      },
    };
  }

  listenToDocument<T extends CustomDocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
    const docRef = fbDoc(this._firestore, path);
    const listener = docRef.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) => {
        if (snapshot.exists()) {
          const docData = this._snapshotToFirebaseDocument<T>(snapshot);
          onNext(docData);
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
    return listener; 
  }

  listenToCollection<T extends CustomDocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void,
    options?: QueryOptions
  ): () => void {
    if (!this._isInitialized || !this._firestore) {
      const err = new FirebaseError('MobileFirebaseService not initialized or Firestore module failed to initialize.', 'not-initialized');
      if (onError) onError(err);
      return () => {};
    }

    const collectionRef: FirebaseFirestoreTypes.CollectionReference<FirebaseFirestoreTypes.DocumentData> = fbCollection(this._firestore, path);
    let queryToListen: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = collectionRef;

    const queryConstraints: any[] = [];

    if (options) {
      if (options.where) {
        options.where.forEach(([field, op, value]) => {
          queryConstraints.push(fbWhere(field as string | FirebaseFirestoreTypes.FieldPath, op, value));
        });
      }
      if (options.orderBy) {
        options.orderBy.forEach(([field, direction]) => {
          queryConstraints.push(fbOrderBy(field as string | FirebaseFirestoreTypes.FieldPath, direction));
        });
      }
      if (options.limit) {
        queryConstraints.push(fbLimit(options.limit));
      }
    }

    if (queryConstraints.length > 0) {
        queryToListen = fbQuery(collectionRef, ...queryConstraints);
    }

    const unsubscribe = queryToListen.onSnapshot(
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        const docs = snapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc));
        onNext(docs);
      },
      (err: Error) => {
        console.error(`Error listening to collection ${path}:`, err);
        if (onError) {
          onError(this.handleError(`Error listening to collection ${path}`, err));
        }
      }
    );

    return unsubscribe;
  }

  createDocumentWrapper<T extends CustomDocumentData>(
    docRef: CustomDocumentReference<T>
  ): FirebaseDocument<T> {
    if (!this._isInitialized || !this._firestore) {
      throw this.handleError('MobileFirebaseService not initialized or Firestore module failed to initialize.', 'not-initialized');
    }
    const rnDocRef = docRef as FirebaseFirestoreTypes.DocumentReference<T>;

    return {
      id: rnDocRef.id,
      ref: rnDocRef as unknown as CustomDocumentReference<T>,
      data: undefined,
      get: async (): Promise<T | undefined> => {
        try {
          const docSnapshot = await rnDocRef.get();
          return docSnapshot.exists() ? docSnapshot.data() as T : undefined;
        } catch (error) {
          this.handleError(`Error getting document ${rnDocRef.id}`, error);
          return undefined;
        }
      },
      set: async (newData: T): Promise<void> => {
        try {
          await rnDocRef.set(newData as any);
        } catch (error) {
          this.handleError(`Error setting document ${rnDocRef.id}`, error);
        }
      },
      update: async (updateData: Partial<T>): Promise<void> => {
        try {
          await rnDocRef.update(updateData as any);
        } catch (error) {
          this.handleError(`Error updating document ${rnDocRef.id}`, error);
        }
      },
      delete: async (): Promise<void> => {
        try {
          await rnDocRef.delete();
        } catch (error) {
          this.handleError(`Error deleting document ${rnDocRef.id}`, error);
        }
      },
    };
  }

  getStorageRef(path: string): CustomStorageReference {
    if (!this._isInitialized || !this._storage) throw new Error('MobileFirebaseService not initialized or Storage module failed to initialize.');
    return this._storage.ref(path) as CustomStorageReference;
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    if (!this._isInitialized || !this._auth) throw this.handleError('Auth service not initialized', new Error('Auth service not initialized'));
    try {
      const userCredential = await this._auth.signInWithEmailAndPassword(email, password);
      return userCredential as CustomUserCredential;
    } catch (error) {
      throw this.handleError('Error signing in with email/password', error);
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    if (!this._isInitialized || !this._auth) throw this.handleError('Auth service not initialized', new Error('Auth service not initialized'));
    try {
      const userCredential = await this._auth.createUserWithEmailAndPassword(email, password);
      return userCredential as CustomUserCredential;
    } catch (error) {
      throw this.handleError('Error creating user with email/password', error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    if (!this._isInitialized || !this._auth) {
      throw this.handleError('MobileFirebaseService not initialized or Auth module failed to initialize.', new Error('Not initialized'));
    }
    try {
      await this._auth.sendPasswordResetEmail(email);
    } catch (error) {
      throw this.handleError('Error sending password reset email', error);
    }
  }

  async signOut(): Promise<void> {
    if (!this._isInitialized || !this._auth) {
      throw this.handleError('MobileFirebaseService not initialized or Auth module failed to initialize.', new Error('Not initialized'));
    }
    try {
      await this._auth.signOut();
    } catch (error) {
      throw this.handleError('Error signing out', error);
    }
  }

  async setDocument<T extends CustomDocumentData>(
    collectionPath: string,
    documentId: string,
    data: T,
    options?: { merge?: boolean }
  ): Promise<void> {
    if (!this._firestore) {
      throw this.handleError('MobileFirebaseService not initialized or Firestore module failed to initialize.', new Error('Not initialized'));
    }
    try {
      const docRef = fbDoc(this._firestore, collectionPath, documentId);
      await fbSet(docRef, data, options);
    } catch (error) {
      throw this.handleError(`Error setting document ${collectionPath}/${documentId}`, error);
    }
  }

  protected handleError(message: string, error: unknown): FirebaseError {
    console.error("MobileFirebaseService Error:", message, error);
    let code = 'unknown';
    let errorMessage = message;
    if (error instanceof Error) {
        errorMessage = error.message;
        if ('code' in error && typeof (error as any).code === 'string') {
            code = (error as any).code;
        } 
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return new FirebaseError(errorMessage, code, error);
  }

  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    if (!this._isInitialized || !this._firestore) throw this.handleError('Firestore not initialized', new Error('Firestore not initialized'));
    try {
      const docRef = fbDoc(this._firestore, collectionPath, documentId);
      await fbDelete(docRef);
    } catch (error) {
      throw this.handleError(`Error deleting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    if (!this._isInitialized || !this._firestore) throw new Error('MobileFirebaseService not initialized or Firestore module failed to initialize.');
    try {
      const docRef = fbDoc(this.getFirestoreReactNativeInstance(), collectionPath, documentId);
      const docSnapshot = await fbGetDoc(docRef);
      if (docSnapshot.exists()) {
        return this._snapshotToFirebaseDocument<T>(docSnapshot as FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) as FirebaseDocument<T>;
      }
      return null;
    } catch (error) {
      throw this.handleError(`Error getting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocuments<T extends CustomDocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]> {
    if (!this._isInitialized || !this._firestore) {
      throw new FirebaseError('MobileFirebaseService not initialized or Firestore module failed to initialize.', 'not-initialized');
    }
    try {
      const collectionRef: FirebaseFirestoreTypes.CollectionReference = this._firestore.collection(collectionPath);
      let finalQuery: FirebaseFirestoreTypes.Query = collectionRef;

      const queryConstraints: any[] = [];

      if (options) {
        if (options.where) {
          options.where.forEach(([field, op, value]) => {
            queryConstraints.push(fbWhere(field as string | FirebaseFirestoreTypes.FieldPath, op, value));
          });
        }
        if (options.orderBy) {
          options.orderBy.forEach(([field, direction]) => {
            queryConstraints.push(fbOrderBy(field as string | FirebaseFirestoreTypes.FieldPath, direction));
          });
        }
        if (options.limit) {
          queryConstraints.push(fbLimit(options.limit));
        }
      }

      if (queryConstraints.length > 0) {
        finalQuery = fbQuery(collectionRef, ...queryConstraints);
      }

      const snapshot = await finalQuery.get();
      return snapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc));
    } catch (error) {
      this.handleError(`Error getting documents from ${collectionPath}`, error);
      return []; 
    }
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    if (!this._isInitialized || !this._firestore) throw this.handleError('Firestore not initialized', new Error('Firestore not initialized'));
    try {
      const dataWithTimestamp = { 
        ...data, 
        updatedAt: serverTimestamp()
      };
      const docRef = fbDoc(this._firestore, collectionPath, documentId);
      await fbUpdate(docRef, dataWithTimestamp);
    } catch (error) {
      throw this.handleError(`Error updating document ${collectionPath}/${documentId}`, error);
    }
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    if (!this._isInitialized || !this._firestore) throw this.handleError('Firestore not initialized', new Error('Firestore not initialized'));
    try {
      const dataWithTimestamps = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await fbAdd(fbCollection(this._firestore, collectionPath), dataWithTimestamps as any);
      const docSnapshot = await fbGetDoc(docRef);
      return this._snapshotToFirebaseDocument(docSnapshot as FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) as FirebaseDocument<T>;

    } catch (error) {
      throw this.handleError(`Error adding document to ${collectionPath}`, error);
    }
  }

  async uploadFile(filePath: string, fileUriOrBlob: string | File): Promise<string> {
    if (!this._isInitialized || !this._storage) {
      console.error('[MobileFirebaseService] Storage module not initialized.');
      throw new FirebaseError('MobileFirebaseService not initialized or Storage module failed to initialize.', 'not-initialized');
    }
    
    if (typeof fileUriOrBlob !== 'string') {
      console.error('[MobileFirebaseService] uploadFile: expects a file URI string.', { received: typeof fileUriOrBlob });
      throw new FirebaseError('Invalid file type for mobile upload. Expected a file URI string.', 'invalid-argument');
    }
    const fileUri = fileUriOrBlob;

    const uriParts = fileUri.split('/');
    const originalFileName = uriParts.pop() || `unknown-file-${Date.now()}`;
    const uniqueFileName = `${uuidv4()}-${originalFileName}`;
    const fullStoragePath = `${filePath}/${uniqueFileName}`;

    console.log(`[MobileFirebaseService] Attempting to upload ${fileUri} to ${fullStoragePath}`);

    try {
      const storageRef = this._storage.ref(fullStoragePath);
      
      const uploadTask = await storageRef.putFile(fileUri);

      if (uploadTask.state !== 'success') {
        console.error('[MobileFirebaseService] File upload was not successful.', { state: uploadTask.state, metadata: uploadTask.metadata });
        throw new FirebaseError('File upload failed, state was not "success".', 'upload-failed');
      }
      
      const downloadURL = await storageRef.getDownloadURL();
      console.log(`[MobileFirebaseService] File uploaded successfully. Download URL: ${downloadURL}`);
      return downloadURL;
    } catch (error: any) {
      console.error(`[MobileFirebaseService] Error uploading file ${fileUri} to ${fullStoragePath}:`, error);
      if (error instanceof FirebaseError) throw error;
      throw new FirebaseError(error.message || 'An unknown error occurred during file upload.', error.code || 'upload-failed');
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!this._isInitialized || !this._storage) {
      throw new FirebaseError('MobileFirebaseService not initialized or Storage module failed to initialize.', 'not-initialized');
    }
    const storageRef = this._storage.ref(path);
    await storageRef.delete();
  }

  async deleteShow(showId: string): Promise<void> {
    // TODO: Implement show deletion logic for mobile
    // This might involve deleting the show document and all related sub-collections
    // (props, characters, scenes, etc.) and any associated files in storage.
    console.warn(`[MobileFirebaseService] deleteShow for ${showId} is not fully implemented. Placeholder.`);
    // Example: Delete the show document
    // await this.deleteDocument('shows', showId); 
    // Need to handle related data deletion, which can be complex.
    throw new FirebaseError('deleteShow is not yet implemented for mobile with full data cleanup', 'unimplemented');
  }
}