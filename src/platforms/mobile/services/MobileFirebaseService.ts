import { getFirestore, FirebaseFirestoreTypes, query as fbQuery, where as fbWhere, orderBy as fbOrderBy, limit as fbLimit, collection as fbCollection, doc as fbDoc, serverTimestamp, deleteDoc as fbDelete, updateDoc as fbUpdate, setDoc as fbSet, addDoc as fbAdd, getDoc as fbGetDoc, Timestamp } from '@react-native-firebase/firestore';
import { getStorage, FirebaseStorageTypes, ref as storageRef, getDownloadURL, TaskState } from '@react-native-firebase/storage';
import { getAuth, FirebaseAuthTypes, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as fbSignOut } from '@react-native-firebase/auth';
import firebase, { getApps, getApp, initializeApp as fbInitializeApp, ReactNativeFirebase } from '@react-native-firebase/app';
import { FirebaseError, FirebaseService, OfflineSync, FirebaseDocument, QueryOptions, CustomUserCredential, CustomDocumentData, CustomDocumentReference, CustomStorageReference, CustomTransaction, CustomWriteBatch } from '../../../shared/services/firebase/types.ts';
import { v4 as uuidv4 } from 'uuid';

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
      if (apps.length === 0) {
        console.warn("[MobileFirebaseService] No pre-initialized Firebase app. Attempting to initialize default app.");
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
      console.log(`[MobileFirebaseService] Using Firebase app: ${this._defaultApp.name}`);

      this._auth = getAuth(this._defaultApp);
      this._firestore = getFirestore(this._defaultApp);
      this._storage = getStorage(this._defaultApp);
      
      console.log("[MobileFirebaseService] Auth instance obtained:", this._auth ? 'Exists' : 'Failed');
      console.log("[MobileFirebaseService] Firestore instance obtained:", this._firestore ? 'Exists' : 'Failed');
      console.log("[MobileFirebaseService] Storage instance obtained:", this._storage ? 'Exists' : 'Failed');

      if (!this._firestore) throw new Error("Firestore must be initialized before Offline Sync");
      this._offlineSync = new MobileOfflineSync(this._firestore);
      console.log("[MobileFirebaseService] Offline Sync initialized.");

      this._isInitialized = true;
      console.log("[MobileFirebaseService] Initialization successful.");
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

  private _snapshotToFirebaseDocument<T extends CustomDocumentData>(
    snapshot: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData> | FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
  ): FirebaseDocument<T> {
    const rnDocRef = snapshot.ref;
    const data = snapshot.exists() ? snapshot.data() as T : undefined;

    return {
      id: snapshot.id,
      ref: rnDocRef as unknown as CustomDocumentReference<T>,
      data: data,
      get: async (): Promise<T | undefined> => (await rnDocRef.get()).data() as T | undefined,
      set: (newData: T): Promise<void> => rnDocRef.set(newData as any),
      update: (updateData: Partial<T>): Promise<void> => rnDocRef.update(updateData as any),
      delete: (): Promise<void> => rnDocRef.delete(),
    };
  }
  
  listenToDocument<T extends CustomDocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void {
    const firestoreInstance = this.firestore();
    const documentRef = fbDoc(firestoreInstance, path);
    return documentRef.onSnapshot(
      (snapshot) => {
        if (snapshot.exists()) { // Check if exists() is a function
          onNext(this._snapshotToFirebaseDocument<T>(snapshot as FirebaseFirestoreTypes.QueryDocumentSnapshot));
        } else {
           console.log(`Document at path ${path} does not exist or snapshot.exists is not a function.`);
           // Optionally call onError if this is considered an error state
           // if(onError) onError(new Error(`Document at path ${path} does not exist.`));
        }
      },
      (err: Error) => {
        if (onError) onError(this.handleError(`Error listening to document ${path}`, err));
      }
    );
  }

  listenToCollection<T extends CustomDocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void,
    options?: QueryOptions
  ): () => void {
    const firestoreInstance = this.firestore();
    let queryRef: FirebaseFirestoreTypes.Query = fbCollection(firestoreInstance, path);

    if (options) {
      if (options.where) {
        options.where.forEach(([field, op, value]) => {
          queryRef = queryRef.where(field as string | FirebaseFirestoreTypes.FieldPath, op, value);
        });
      }
      if (options.orderBy) {
        options.orderBy.forEach(([field, direction]) => {
          queryRef = queryRef.orderBy(field as string | FirebaseFirestoreTypes.FieldPath, direction);
        });
      }
      if (options.limit) {
        queryRef = queryRef.limit(options.limit);
      }
    }
    
    return queryRef.onSnapshot(
      (snapshot) => {
        const docs = snapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc as FirebaseFirestoreTypes.QueryDocumentSnapshot));
        onNext(docs);
      },
      (err: Error) => {
        if (onError) onError(this.handleError(`Error listening to collection ${path}`, err));
      }
    );
  }

  createDocumentWrapper<T extends CustomDocumentData>(
    docRefInput: CustomDocumentReference<T>
  ): FirebaseDocument<T> {
    // Assuming docRefInput is already a FirebaseFirestoreTypes.DocumentReference from our system
    const docRef = docRefInput as FirebaseFirestoreTypes.DocumentReference<T>;
    return {
      id: docRef.id,
      ref: docRef as unknown as CustomDocumentReference<T>,
      data: undefined, // Data is fetched on demand or via listener
      get: async (): Promise<T | undefined> => (await docRef.get()).data() as T | undefined,
      set: (newData: T): Promise<void> => docRef.set(newData as any),
      update: (updateData: Partial<T>): Promise<void> => docRef.update(updateData as any),
      delete: (): Promise<void> => docRef.delete(),
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
      throw this.handleError('Error signing in', error);
    }
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential> {
    const authInstance = this.auth();
    try {
      return await createUserWithEmailAndPassword(authInstance, email, password) as CustomUserCredential;
    } catch (error) {
      throw this.handleError('Error creating user', error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const authInstance = this.auth();
    try {
      await sendPasswordResetEmail(authInstance, email);
    } catch (error) {
      throw this.handleError('Error sending password reset email', error);
    }
  }

  async signOut(): Promise<void> {
    const authInstance = this.auth();
    try {
      await fbSignOut(authInstance);
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
    const firestoreInstance = this.firestore();
    try {
      await fbSet(fbDoc(firestoreInstance, collectionPath, documentId), data, options);
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
    return new FirebaseError(errorMessage, code, error instanceof Error ? error : undefined);
  }

  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    const firestoreInstance = this.firestore();
    try {
      await fbDelete(fbDoc(firestoreInstance, collectionPath, documentId));
    } catch (error) {
      throw this.handleError(`Error deleting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    const firestoreInstance = this.firestore();
    try {
      const docSnapshot = await fbGetDoc(fbDoc(firestoreInstance, collectionPath, documentId));
      if (docSnapshot.exists()) { // Check if exists() is a function
        return this._snapshotToFirebaseDocument<T>(docSnapshot as FirebaseFirestoreTypes.QueryDocumentSnapshot);
      }
      return null;
    } catch (error) {
      throw this.handleError(`Error getting document ${collectionPath}/${documentId}`, error);
    }
  }

  async getDocuments<T extends CustomDocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]> {
    const firestoreInstance = this.firestore();
    try {
      let q: FirebaseFirestoreTypes.Query = fbCollection(firestoreInstance, collectionPath);
      if (options?.where) {
        options.where.forEach(([field, op, value]) => {
          q = q.where(field as string | FirebaseFirestoreTypes.FieldPath, op, value);
        });
      }
      if (options?.orderBy) {
        options.orderBy.forEach(([field, direction]) => {
          q = q.orderBy(field as string | FirebaseFirestoreTypes.FieldPath, direction);
        });
      }
      if (options?.limit) {
        q = q.limit(options.limit);
      }
      const snapshot = await q.get();
      return snapshot.docs.map(doc => this._snapshotToFirebaseDocument<T>(doc as FirebaseFirestoreTypes.QueryDocumentSnapshot));
    } catch (error) {
      throw this.handleError(`Error getting documents from ${collectionPath}`, error);
    }
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    const firestoreInstance = this.firestore();
    try {
      const dataWithTimestamp = { ...data, updatedAt: serverTimestamp() as any }; // serverTimestamp for RN
      await fbUpdate(fbDoc(firestoreInstance, collectionPath, documentId), dataWithTimestamp);
    } catch (error) {
      throw this.handleError(`Error updating document ${collectionPath}/${documentId}`, error);
    }
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    const firestoreInstance = this.firestore();
    try {
      const dataWithTimestamps = {
        ...data,
        createdAt: serverTimestamp() as any, // serverTimestamp for RN
        updatedAt: serverTimestamp() as any,
      };
      const docRef = await fbAdd(fbCollection(firestoreInstance, collectionPath), dataWithTimestamps);
      const docSnapshot = await fbGetDoc(docRef);
      return this._snapshotToFirebaseDocument<T>(docSnapshot as FirebaseFirestoreTypes.QueryDocumentSnapshot);
    } catch (error) {
      throw this.handleError(`Error adding document to ${collectionPath}`, error);
    }
  }

  async uploadFile(storagePath: string, fileUriOrBlob: string | File): Promise<string> {
    if (typeof fileUriOrBlob !== 'string') {
      throw new FirebaseError('Mobile uploadFile expects a file URI string.', 'invalid-argument');
    }
    const fileUri = fileUriOrBlob;
    const storageInstance = this.storage();
    const uniqueFileName = `${uuidv4()}-${fileUri.split('/').pop()}`;
    const fileRef = storageRef(storageInstance, `${storagePath}/${uniqueFileName}`);
    
    try {
      const uploadTaskSnapshot = await fileRef.putFile(fileUri);
      if (uploadTaskSnapshot.state !== TaskState.SUCCESS) {
           throw new Error('Upload was not successful: ' + uploadTaskSnapshot.state);
      }
      const downloadURL = await fileRef.getDownloadURL();
      return downloadURL;
    } catch (error) {
      throw this.handleError(`Error uploading file ${fileUri}`, error);
    }
  }

  async deleteFile(path: string): Promise<void> {
    const storageInstance = this.storage();
    const fileRef = storageRef(storageInstance, path);
    try {
      await fileRef.delete();
    } catch (error) {
      throw this.handleError(`Error deleting file ${path}`, error);
    }
  }
  
  async deleteShow(showId: string): Promise<void> {
    console.warn(`[MobileFirebaseService] deleteShow for ${showId} is not fully implemented.`);
    throw new FirebaseError('deleteShow is not yet implemented for mobile with full data cleanup', 'unimplemented');
  }
}