import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  Auth,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
  WhereFilterOp
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL as getStorageDownloadURL,
  deleteObject,
  StorageReference
} from 'firebase/storage';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { BaseFirebaseService } from '../../../shared/services/firebase/base';
import type {
  FirebaseService,
  FirebaseAuth,
  FirebaseFirestore,
  FirebaseStorage,
  OfflineSync,
  FirestoreCollection,
  FirestoreDocument
} from '../../../shared/services/firebase/types';

export class WebFirebaseService extends BaseFirebaseService {
  private storageInstance: ReturnType<typeof getStorage>;

  constructor() {
    super();
    this.storageInstance = null as any;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    try {
      this.app = initializeApp(firebaseConfig);
      this.authInstance = getAuth(this.app);
      this.dbInstance = getFirestore(this.app);
      this.storageInstance = getStorage(this.app);
      
      // Enable offline persistence
      await enableIndexedDbPersistence(this.dbInstance);
      
      this.isInitialized = true;
      console.log('Firebase Web initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  auth(): FirebaseAuth {
    if (!this.isInitialized) throw new Error('Firebase not initialized');
    
    const auth = this.authInstance;
    return {
      currentUser: auth.currentUser,
      async signIn(email: string, password: string) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signOut() {
        await signOut(auth);
      },
      async createUser(email: string, password: string) {
        await createUserWithEmailAndPassword(auth, email, password);
      },
      onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
      }
    };
  }

  firestore(): FirebaseFirestore {
    if (!this.isInitialized) throw new Error('Firebase not initialized');

    return {
      collection: (path: string): FirestoreCollection => {
        const collectionRef = collection(this.dbInstance, path);
        const self = this;
        
        return {
          doc: (id: string) => {
            const docRef = doc(collectionRef, id);
            return self.createDocumentWrapper(docRef);
          },
          async add(data: any) {
            const docRef = doc(collectionRef);
            await setDoc(docRef, data);
            return self.createDocumentWrapper(docRef);
          },
          async get() {
            const snapshot = await getDocs(collectionRef);
            return snapshot.docs.map(doc => ({
              id: doc.id,
              data: () => doc.data(),
              exists: () => doc.exists(),
              get: async () => doc.data(),
              set: async (data: any) => setDoc(doc.ref, data),
              update: async (data: any) => updateDoc(doc.ref, data),
              delete: async () => deleteDoc(doc.ref)
            }));
          },
          where: (field: string, operator: WhereFilterOp, value: any) => {
            const queryRef = query(collectionRef, where(field, operator, value));
            return this.createQueryWrapper(queryRef);
          },
          orderBy: (field: string, direction?: 'asc' | 'desc') => {
            const queryRef = query(collectionRef, orderBy(field, direction));
            return this.createQueryWrapper(queryRef);
          },
          limit: (limitCount: number) => {
            const queryRef = query(collectionRef, limit(limitCount));
            return this.createQueryWrapper(queryRef);
          }
        };
      },
      doc: (path: string) => this.createDocumentWrapper(doc(this.dbInstance, path))
    };
  }

  storage(): FirebaseStorage {
    if (!this.isInitialized) throw new Error('Firebase not initialized');
    const storage = this.storageInstance;

    return {
      async upload(path: string, file: File): Promise<string> {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getStorageDownloadURL(storageRef);
      },
      async getDownloadURL(path: string): Promise<string> {
        const storageRef = ref(storage, path);
        return await getStorageDownloadURL(storageRef);
      },
      async delete(path: string): Promise<void> {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
      }
    };
  }

  protected getStorageRef(path: string): StorageReference {
    if (!this.isInitialized || !this.storageInstance) {
      throw new Error('Firebase not initialized');
    }
    return ref(this.storageInstance, path);
  }

  offline(): OfflineSync {
    if (!this.isInitialized) throw new Error('Firebase not initialized');
    const db = this.dbInstance;

    return {
      async enableSync() {
        await enableIndexedDbPersistence(db);
      },
      async disableSync() {
        // Web version doesn't support disabling sync once enabled
        console.warn('Disabling offline sync is not supported in web version');
      },
      async getSyncStatus() {
        return true; // Web version always has sync enabled when initialized
      }
    };
  }

  private createDocumentWrapper(docRef: DocumentReference): FirestoreDocument {
    return {
      id: docRef.id,
      async data() {
        const snapshot = await getDoc(docRef);
        return snapshot.data();
      },
      exists() {
        return docRef.id !== '';
      },
      async get() {
        const snapshot = await getDoc(docRef);
        return snapshot.data();
      },
      async set(data: any) {
        await setDoc(docRef, data);
      },
      async update(data: any) {
        await updateDoc(docRef, data);
      },
      async delete() {
        await deleteDoc(docRef);
      }
    };
  }

  private createQueryWrapper(queryRef: Query): FirestoreCollection {
    const self = this;
    return {
      doc: (id: string) => {
        const docRef = doc(this.dbInstance, id);
        return self.createDocumentWrapper(docRef);
      },
      async add(data: any) {
        if (queryRef instanceof CollectionReference) {
          const docRef = doc(queryRef);
          await setDoc(docRef, data);
          return self.createDocumentWrapper(docRef);
        }
        throw new Error('Cannot add document to a filtered query');
      },
      async get() {
        const snapshot = await getDocs(queryRef);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          data: () => doc.data(),
          exists: () => doc.exists(),
          get: async () => doc.data(),
          set: async (data: any) => setDoc(doc.ref, data),
          update: async (data: any) => updateDoc(doc.ref, data),
          delete: async () => deleteDoc(doc.ref)
        }));
      },
      where: (field: string, operator: WhereFilterOp, value: any) => {
        return this.createQueryWrapper(query(queryRef, where(field, operator, value)));
      },
      orderBy: (field: string, direction?: 'asc' | 'desc') => {
        return this.createQueryWrapper(query(queryRef, orderBy(field, direction)));
      },
      limit: (limitCount: number) => {
        return this.createQueryWrapper(query(queryRef, limit(limitCount)));
      }
    };
  }
} 