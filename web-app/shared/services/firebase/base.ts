import type { 
    FirebaseService, 
    CustomAuth, 
    CustomFirestore, 
    CustomStorage, 
    OfflineSync, 
    CustomTransaction, 
    CustomWriteBatch, 
    DocumentData, 
    FirebaseDocument, 
    CustomDocumentReference, 
    QueryOptions,
    CustomUserCredential
} from './types.ts';
import { FirebaseError } from './types.ts';

// Corrected paths for application-specific types using tsconfig aliases if you have them
// Example: import type { Prop } from '@/shared/types/props';

/**
 * An abstract base class for Firebase services.
 * It enforces the FirebaseService interface and requires platform-specific
 * classes to implement all abstract methods.
 */
export abstract class BaseFirebaseService implements FirebaseService {
  // These properties will be initialized by the concrete implementations
  abstract auth: CustomAuth;
  abstract firestore: CustomFirestore;
  abstract storage: CustomStorage;

  // --- Abstract Methods (to be implemented by platform-specific classes) ---

  // Core
  abstract initialize(): Promise<void>;
  
  // Firestore Document/Collection
  abstract getDocument<T extends DocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null>;
  abstract getCollection<T extends DocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]>;
  abstract getDocuments<T extends DocumentData>(collectionPath: string, options?: QueryOptions): Promise<FirebaseDocument<T>[]>;
  abstract addDocument<T extends DocumentData>(collectionPath: string, data: Omit<T, 'id'>): Promise<FirebaseDocument<T>>;
  abstract setDocument<T extends DocumentData>(collectionPath: string, documentId: string, data: T, options?: { merge?: boolean }): Promise<void>;
  abstract updateDocument<T extends DocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void>;
  abstract deleteDocument(collectionPath: string, documentId: string): Promise<void>;
  
  // Firestore Listeners
  abstract listenToDocument<T extends DocumentData>(path: string, onNext: (doc: FirebaseDocument<T>) => void, onError?: (error: Error) => void): () => void;
  abstract listenToCollection<T extends DocumentData>(path: string, onNext: (docs: FirebaseDocument<T>[]) => void, onError?: (error: Error) => void, options?: QueryOptions): () => void;

  // Transaction and Batch
  abstract runTransaction<T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T>;
  abstract batch(): CustomWriteBatch;

  // Auth
  abstract signInWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
  abstract createUserWithEmailAndPassword(email: string, password: string): Promise<CustomUserCredential>;
  abstract sendPasswordResetEmail(email: string): Promise<void>;
  abstract signOut(): Promise<void>;

  // Storage
  abstract uploadFile(path: string, file: string | File, metadata?: any): Promise<string>;
  abstract deleteFile(path: string): Promise<void>;
  abstract getStorageRef(path: string): any;

  // Helpers
  abstract getFirestoreJsInstance(): import('firebase/firestore').Firestore;
  abstract getFirestoreReactNativeInstance(): import('@react-native-firebase/firestore').FirebaseFirestoreTypes.Module;

  // Offline Sync
  abstract offline(): OfflineSync;

  // App-specific methods
  // TODO: These should likely be moved to their own dedicated services (e.g., ShowService)
  // For now, we make them abstract to satisfy the interface.
  public async deleteShow(showId: string): Promise<void> {
    // Deleting show and related data
    // 1. Delete all props in the show
    const props = await this.getDocuments(`shows/${showId}/props`);
    const batch = this.batch();
    props.forEach(prop => {
        batch.delete(prop.ref as any);
    });
    // 2. Delete all tasks related to the show (if tasks are not a subcollection)
    const tasks = await this.getDocuments('tasks', { where: [['showId', '==', showId]] });
    tasks.forEach(task => {
        batch.delete(task.ref as any);
    });
    // 3. Delete the show document itself
    const showRef = (this.firestore as any).collection('shows').doc(showId);
    batch.delete(showRef);
    await batch.commit();
    // Successfully deleted show and all related data
  }

  // Stubs to satisfy FirebaseService interface
  async updateCard(boardId: string, listId: string, cardId: string, updates: Partial<any>): Promise<void> { throw new Error('Not implemented'); }
  async deleteCard(boardId: string, listId: string, cardId: string): Promise<void> { throw new Error('Not implemented'); }
  async reorderCardsInList(boardId: string, listId: string, orderedCards: any[]): Promise<void> { throw new Error('Not implemented'); }
  async getBoardMembers(boardId: string): Promise<any[]> { return []; }
  async addBoardMember(boardId: string, userId: string, role: string): Promise<void> { throw new Error('Not implemented'); }
  async removeBoardMember(boardId: string, userId: string): Promise<void> { throw new Error('Not implemented'); }
  async addList(boardId: string, listData: any): Promise<any> { return Promise.resolve({} as any); }
  async addCard(boardId: string, listId: string, cardData: any): Promise<any> { return Promise.resolve({} as any); }
  async moveCardToList(boardId: string, cardId: string, fromListId: string, toListId: string, newOrder: number): Promise<void> { throw new Error('Not implemented'); }
  async reorderLists(boardId: string, orderedLists: any[]): Promise<void> { return Promise.resolve(); }

  // --- Error Handling ---
  protected handleError(message: string, error: unknown): FirebaseError {
    // Basic implementation, can be enhanced in specific services
    console.error(`[FirebaseService Error] ${message}`, error);
    if (error instanceof FirebaseError) {
      return error;
    }
    // Attempt to get a code from the error object
    const code = (error as any)?.code || 'unknown';
    return new FirebaseError(message, code);
  }
}
