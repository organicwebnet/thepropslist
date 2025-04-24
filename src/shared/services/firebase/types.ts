import { User } from 'firebase/auth';
import { QuerySnapshot, DocumentData } from 'firebase/firestore';

export class FirebaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'FirebaseError';
  }
}

export interface FirestoreDocument {
  id: string;
  data(): Promise<DocumentData | undefined>;
  exists(): boolean;
  get(): Promise<DocumentData | undefined>;
  set(data: any): Promise<void>;
  update(data: any): Promise<void>;
  delete(): Promise<void>;
}

export interface FirestoreCollection {
  doc(id: string): FirestoreDocument;
  add(data: any): Promise<FirestoreDocument>;
  get(): Promise<FirestoreDocument[]>;
  where(field: string, operator: string, value: any): FirestoreCollection;
  orderBy(field: string, direction?: 'asc' | 'desc'): FirestoreCollection;
  limit(limit: number): FirestoreCollection;
}

export interface FirebaseAuth {
  currentUser: User | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  createUser(email: string, password: string): Promise<void>;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}

export interface FirebaseFirestore {
  collection(path: string): FirestoreCollection;
  doc(path: string): FirestoreDocument;
}

export interface FirebaseStorage {
  upload(path: string, file: Blob | Uint8Array | ArrayBuffer): Promise<string>;
  getDownloadURL(path: string): Promise<string>;
  delete(path: string): Promise<void>;
}

export interface OfflineSync {
  enableSync(): Promise<void>;
  disableSync(): Promise<void>;
  getSyncStatus(): Promise<boolean>;
}

export interface FirebaseService {
  initialize(): Promise<void>;
  auth(): FirebaseAuth;
  firestore(): FirebaseFirestore;
  storage(): FirebaseStorage;
  offline(): OfflineSync;
} 