import type { FirebaseService, FirebaseAuth, FirebaseFirestore, FirebaseStorage, OfflineSync, CustomTransaction, CustomWriteBatch, CustomDocumentData, FirebaseDocument, CustomDocumentReference, CustomStorageReference } from './types.ts';
import { FirebaseError } from './types.ts';

// Corrected paths for application-specific types using tsconfig aliases
import type { UserProfile } from '@/shared/types/auth.ts';
import type { Prop } from '@/shared/types/props.ts';
import type { Show, Act, Scene } from './types.ts';
import type { PackingBox, PackedProp } from '@/types/packing.ts';
import type { Location } from '@/types/locations.ts';
import type { MaintenanceRecord } from '@/types/lifecycle.ts';
import type { BoardData, ListData, CardData, MemberData } from '@/shared/types/taskManager.ts';

/**
 * Base Firebase service class that implements common functionality.
 * Platform-specific implementations should extend this class and implement
 * the abstract methods.
 */
export abstract class BaseFirebaseService implements FirebaseService {
  protected readonly appName: string;
  protected readonly firestoreInstance: FirebaseFirestore;
  protected readonly authInstance: FirebaseAuth;
  protected readonly storageInstance: FirebaseStorage;

  constructor(appName: string, firestore: FirebaseFirestore, auth: FirebaseAuth, storage: FirebaseStorage) {
    this.appName = appName;
    this.firestoreInstance = firestore;
    this.authInstance = auth;
    this.storageInstance = storage;
  }

  abstract initialize(): Promise<void>;
  abstract runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T>;
  abstract batch(): CustomWriteBatch;
  abstract listenToDocument<T extends CustomDocumentData>(
    path: string, 
    onNext: (doc: FirebaseDocument<T>) => void, 
    onError?: (error: Error) => void
  ): () => void;
  abstract listenToCollection<T extends CustomDocumentData>(
    path: string, 
    onNext: (docs: FirebaseDocument<T>[]) => void, 
    onError?: (error: Error) => void
  ): () => void;
  abstract createDocumentWrapper<T extends CustomDocumentData>(
    docRef: CustomDocumentReference<T>
  ): FirebaseDocument<T>;
  abstract getStorageRef(path: string): CustomStorageReference;

  // Add abstract getDocuments method
  abstract getDocuments<T extends CustomDocumentData>(collectionPath: string, options?: import('./types.ts').QueryOptions): Promise<FirebaseDocument<T>[]>;

  abstract auth(): FirebaseAuth;
  abstract firestore(): FirebaseFirestore;
  abstract getFirestoreJsInstance(): import('firebase/firestore').Firestore;
  abstract getFirestoreReactNativeInstance(): import('@react-native-firebase/firestore').FirebaseFirestoreTypes.Module;
  abstract storage(): FirebaseStorage;
  abstract offline(): OfflineSync;

  // Add placeholder implementation for deleteShow
  async deleteShow(showId: string): Promise<void> {
    // TODO: Implement actual delete logic for shows
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  // Add placeholder implementations for other missing FirebaseService methods
  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async uploadFile(path: string, file: string | File, metadata?: any): Promise<string> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async deleteFile(path: string): Promise<void> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  // --- Add Missing Auth Method Stubs ---
  async signInWithEmailAndPassword(email: string, password: string): Promise<any> { // Return type 'any' for stub
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<any> { // Return type 'any' for stub
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  // Added missing abstract methods
  abstract signOut(): Promise<void>;
  abstract setDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: T, options?: { merge?: boolean }): Promise<void>;
  abstract getPropsByShowId(showId: string): Promise<FirebaseDocument<Prop>[]>;

  // Abstract TaskManager methods
  abstract getBoard(boardId: string): Promise<BoardData | null>;
  abstract getListsForBoard(boardId: string): Promise<ListData[]>;
  abstract getCardsForList(boardId: string, listId: string): Promise<CardData[]>;
  abstract getBoardMembers(boardId: string): Promise<MemberData[]>;
  abstract addList(boardId: string, listData: Omit<ListData, 'id' | 'boardId'>): Promise<ListData>;
  abstract addCard(boardId: string, listId: string, cardData: Omit<CardData, 'id' | 'boardId' | 'listId'>): Promise<CardData>;
  abstract updateCard(boardId: string, listId: string, cardId: string, updates: Partial<CardData>): Promise<void>;
  abstract deleteCard(boardId: string, listId: string, cardId: string): Promise<void>;
  abstract moveCardToList(boardId: string, cardId: string, originalListId: string, targetListId: string, newOrder: number): Promise<void>;
  abstract reorderCardsInList(boardId: string, listId: string, orderedCards: CardData[]): Promise<void>;
}