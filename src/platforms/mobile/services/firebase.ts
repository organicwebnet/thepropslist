import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, User, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  DocumentData,
  query,
  where,
  WhereFilterOp,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy as firestoreOrderBy,
  OrderByDirection,
  limit as firestoreLimit,
  Query
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage as NativeFirebaseStorage,
  ref,
  StorageReference,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  FirebaseAuth,
  FirebaseFirestore,
  FirestoreCollection,
  FirestoreDocument,
  FirebaseService,
  FirebaseError,
  FirebaseStorage,
  OfflineSync
} from '../../../shared/services/firebase/types';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class MobileFirebaseService implements FirebaseService {
  private _app: FirebaseApp | null = null;
  private _auth: Auth | null = null;
  private _firestore: Firestore | null = null;
  private _storage: NativeFirebaseStorage | null = null;

  async initialize(): Promise<void> {
    try {
      const config: FirebaseOptions = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      };

      this._app = initializeApp(config);
      this._auth = getAuth(this._app);
      this._firestore = getFirestore(this._app);
      this._storage = getStorage(this._app);
    } catch (error) {
      throw new FirebaseError('initialization-failed', 'Failed to initialize Firebase');
    }
  }

  protected getStorageRef(path: string): StorageReference {
    if (!this._storage) {
      throw new FirebaseError('not-initialized', 'Firebase Storage is not initialized');
    }
    return ref(this._storage, path);
  }

  auth(): FirebaseAuth {
    if (!this._auth) {
      throw new FirebaseError('not-initialized', 'Firebase Auth is not initialized');
    }

    return {
      currentUser: this._auth.currentUser,
      signIn: async (email: string, password: string): Promise<void> => {
        await signInWithEmailAndPassword(this._auth!, email, password);
      },
      signOut: async (): Promise<void> => {
        await signOut(this._auth!);
      },
      createUser: async (email: string, password: string): Promise<void> => {
        await createUserWithEmailAndPassword(this._auth!, email, password);
      },
      onAuthStateChanged: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(this._auth!, callback);
      }
    };
  }

  firestore(): FirebaseFirestore {
    if (!this._firestore) {
      throw new FirebaseError('not-initialized', 'Firebase Firestore is not initialized');
    }

    return {
      collection: (path: string): FirestoreCollection => {
        const collectionRef = collection(this._firestore!, path);
        return this.createCollectionWrapper(collectionRef, path);
      },
      doc: (path: string): FirestoreDocument => {
        return this.createDocumentWrapper(doc(this._firestore!, path));
      }
    };
  }

  storage(): FirebaseStorage {
    if (!this._storage) {
      throw new FirebaseError('not-initialized', 'Firebase Storage is not initialized');
    }
    return {
      upload: async (path: string, file: Blob): Promise<string> => {
        const storageRef = ref(this._storage!, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      },
      delete: async (path: string): Promise<void> => {
        const storageRef = ref(this._storage!, path);
        await deleteObject(storageRef);
      },
      getDownloadURL: async (path: string): Promise<string> => {
        const storageRef = ref(this._storage!, path);
        return getDownloadURL(storageRef);
      }
    };
  }

  offline(): OfflineSync {
    return {
      enableSync: async (): Promise<void> => {
        // Implement offline sync enablement
      },
      disableSync: async (): Promise<void> => {
        // Implement offline sync disablement
      },
      getSyncStatus: async (): Promise<boolean> => {
        // Return current sync status
        return false;
      }
    };
  }

  private createCollectionWrapper(collectionRef: CollectionReference, path: string): FirestoreCollection {
    const self = this;
    return {
      doc: (id: string) => self.createDocumentWrapper(doc(collectionRef, id)),
      add: async (data: DocumentData) => {
        const docRef = doc(collectionRef);
        await setDoc(docRef, data);
        return self.createDocumentWrapper(docRef);
      },
      get: async () => {
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => self.createDocumentWrapper(doc.ref));
      },
      where: (field: string, operator: WhereFilterOp, value: any): FirestoreCollection => {
        const queryRef = query(collectionRef, where(field, operator, value));
        return this.createQueryWrapper(queryRef, path);
      },
      orderBy: (field: string, direction: OrderByDirection = 'asc'): FirestoreCollection => {
        const queryRef = query(collectionRef, firestoreOrderBy(field, direction));
        return this.createQueryWrapper(queryRef, path);
      },
      limit: (n: number): FirestoreCollection => {
        const queryRef = query(collectionRef, firestoreLimit(n));
        return this.createQueryWrapper(queryRef, path);
      }
    };
  }

  private createQueryWrapper(queryRef: Query, path: string): FirestoreCollection {
    return {
      doc: (id: string) => this.createDocumentWrapper(doc(queryRef.firestore, `${path}/${id}`)),
      add: async (data: DocumentData) => {
        const docRef = doc(queryRef.firestore, path);
        await setDoc(docRef, data);
        return this.createDocumentWrapper(docRef);
      },
      get: async () => {
        const snapshot = await getDocs(queryRef);
        return Promise.all(snapshot.docs.map(doc => this.createDocumentWrapper(doc.ref)));
      },
      where: (field: string, operator: WhereFilterOp, value: any): FirestoreCollection => {
        const newQueryRef = query(queryRef, where(field, operator, value));
        return this.createQueryWrapper(newQueryRef, path);
      },
      orderBy: (field: string, direction: OrderByDirection = 'asc'): FirestoreCollection => {
        const newQueryRef = query(queryRef, firestoreOrderBy(field, direction));
        return this.createQueryWrapper(newQueryRef, path);
      },
      limit: (n: number): FirestoreCollection => {
        const newQueryRef = query(queryRef, firestoreLimit(n));
        return this.createQueryWrapper(newQueryRef, path);
      }
    };
  }

  protected createDocumentWrapper(docRef: DocumentReference): FirestoreDocument {
    return {
      id: docRef.id,
      data: async () => {
        const snapshot = await getDoc(docRef);
        return snapshot.data();
      },
      exists: () => {
        // Since we can't synchronously check existence, default to true
        // The actual existence check will happen when data() is called
        return true;
      },
      get: async () => {
        const snapshot = await getDoc(docRef);
        return {
          id: snapshot.id,
          data: snapshot.data(),
          exists: snapshot.exists()
        };
      },
      set: async (data: DocumentData) => {
        await setDoc(docRef, data);
      },
      update: async (data: DocumentData) => {
        await updateDoc(docRef, data);
      },
      delete: async () => {
        await deleteDoc(docRef);
      }
    };
  }
} 