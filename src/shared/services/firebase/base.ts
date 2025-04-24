import { FirebaseApp } from 'firebase/app';
import {
  Auth,
  User,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import {
  Firestore,
  DocumentReference,
  Query,
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
  WhereFilterOp
} from 'firebase/firestore';
import {
  StorageReference,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  FirebaseService,
  FirebaseAuth,
  FirebaseFirestore,
  FirebaseStorage,
  OfflineSync,
  FirestoreCollection,
  FirestoreDocument
} from './types';

/**
 * Base Firebase service class that implements common functionality.
 * Platform-specific implementations should extend this class and implement
 * the abstract methods.
 */
export abstract class BaseFirebaseService implements FirebaseService {
  protected app!: FirebaseApp;
  protected authInstance!: Auth;
  protected dbInstance!: Firestore;
  protected isInitialized = false;

  abstract initialize(): Promise<void>;
  protected abstract getStorageRef(path: string): StorageReference;

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

    return {
      async upload(path: string, file: File): Promise<string> {
        const storageRef = this.getStorageRef(path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      },
      async getDownloadURL(path: string): Promise<string> {
        const storageRef = this.getStorageRef(path);
        return await getDownloadURL(storageRef);
      },
      async delete(path: string): Promise<void> {
        const storageRef = this.getStorageRef(path);
        await deleteObject(storageRef);
      }
    };
  }

  abstract offline(): OfflineSync;

  protected createDocumentWrapper(docRef: DocumentReference): FirestoreDocument {
    return {
      id: docRef.id,
      async data() {
        const snapshot = await getDoc(docRef);
        return snapshot.data();
      },
      exists() {
        return true; // Will be updated when document is fetched
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

  protected createQueryWrapper(queryRef: Query): FirestoreCollection {
    return {
      doc: (id: string) => {
        throw new Error('Cannot get document from query result');
      },
      async add(data: any) {
        throw new Error('Cannot add document to query result');
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
        const newQueryRef = query(queryRef, where(field, operator, value));
        return this.createQueryWrapper(newQueryRef);
      },
      orderBy: (field: string, direction?: 'asc' | 'desc') => {
        const newQueryRef = query(queryRef, orderBy(field, direction));
        return this.createQueryWrapper(newQueryRef);
      },
      limit: (limitCount: number) => {
        const newQueryRef = query(queryRef, limit(limitCount));
        return this.createQueryWrapper(newQueryRef);
      }
    };
  }
} 