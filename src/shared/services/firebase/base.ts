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

  protected createError(error: unknown): FirebaseError {
    const err = error as { code?: string; message?: string };
    return new FirebaseError(
      err.message || 'An unknown Firebase error occurred',
      err.code || 'unknown',
      error
    );
  }
} 