import { FirebaseService, FirebaseError, FirebaseAuth, FirebaseFirestore, FirebaseStorage, OfflineSync, CustomTransaction, CustomWriteBatch, CustomDocumentData, FirebaseDocument, CustomDocumentReference, CustomStorageReference } from './types';

/**
 * Base Firebase service class that implements common functionality.
 * Platform-specific implementations should extend this class and implement
 * the abstract methods.
 */
export abstract class BaseFirebaseService implements FirebaseService {
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

  abstract auth(): FirebaseAuth;
  abstract firestore(): FirebaseFirestore;
  abstract storage(): FirebaseStorage;
  abstract offline(): OfflineSync;

  // Add placeholder implementation for deleteShow
  async deleteShow(showId: string): Promise<void> {
    // TODO: Implement actual delete logic for shows
    console.warn(`deleteShow(${showId}) is not implemented in BaseFirebaseService.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  // Add placeholder implementations for other missing FirebaseService methods
  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    console.warn(`deleteDocument(${collectionPath}, ${documentId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async getDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string): Promise<FirebaseDocument<T> | null> {
    console.warn(`getDocument(${collectionPath}, ${documentId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async updateDocument<T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    console.warn(`updateDocument(${collectionPath}, ${documentId}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async addDocument<T extends CustomDocumentData>(collectionPath: string, data: T): Promise<FirebaseDocument<T>> {
    console.warn(`addDocument(${collectionPath}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async uploadFile(path: string, file: File): Promise<string> {
    console.warn(`uploadFile(${path}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async deleteFile(path: string): Promise<void> {
    console.warn(`deleteFile(${path}) is not implemented.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  // --- Add Missing Auth Method Stubs ---
  async signInWithEmailAndPassword(email: string, password: string): Promise<any> { // Return type 'any' for stub
    console.warn(`signInWithEmailAndPassword(${email}) is not implemented in BaseFirebaseService.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<any> { // Return type 'any' for stub
    console.warn(`createUserWithEmailAndPassword(${email}) is not implemented in BaseFirebaseService.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    console.warn(`sendPasswordResetEmail(${email}) is not implemented in BaseFirebaseService.`);
    throw new FirebaseError('Method not implemented', 'unimplemented');
  }
  // --- End Missing Auth Method Stubs ---

  protected createError(error: unknown): FirebaseError {
    const err = error as { code?: string; message?: string };
    return new FirebaseError(
      err.message || 'An unknown Firebase error occurred',
      err.code || 'unknown',
      error
    );
  }
} 