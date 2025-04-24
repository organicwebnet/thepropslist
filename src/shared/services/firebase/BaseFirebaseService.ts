import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseStorageTypes } from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import { FirebaseService, FirebaseDocument, OfflineSync } from './types';

export abstract class BaseFirebaseService implements FirebaseService {
  protected _firestore: FirebaseFirestoreTypes.Module;
  protected _auth: FirebaseAuthTypes.Module;
  protected _storage: FirebaseStorageTypes.Module;

  constructor() {
    this._firestore = firestore();
    this._auth = auth();
    this._storage = storage();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  firestore(): FirebaseFirestoreTypes.Module {
    return this._firestore;
  }

  auth(): FirebaseAuthTypes.Module {
    return this._auth;
  }

  storage(): FirebaseStorageTypes.Module {
    return this._storage;
  }

  abstract offline(): OfflineSync;

  abstract runTransaction<T>(
    updateFunction: (transaction: FirebaseFirestoreTypes.Transaction) => Promise<T>
  ): Promise<T>;

  abstract batch(): FirebaseFirestoreTypes.WriteBatch;

  abstract listenToDocument<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (doc: FirebaseDocument<T>) => void,
    onError?: (error: Error) => void
  ): () => void;

  abstract listenToCollection<T extends FirebaseFirestoreTypes.DocumentData>(
    path: string,
    onNext: (docs: FirebaseDocument<T>[]) => void,
    onError?: (error: Error) => void
  ): () => void;

  createDocumentWrapper<T extends FirebaseFirestoreTypes.DocumentData>(
    snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<T>
  ): FirebaseDocument<T> {
    return {
      id: snapshot.id,
      data: snapshot.data(),
      ref: snapshot.ref,
    };
  }

  getStorageRef(path: string): FirebaseStorageTypes.Reference {
    return storage().ref(path);
  }

  protected handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(error?.message || 'Unknown Firebase error');
  }
} 