import type { FirebaseService } from './firebase/types.ts';
import {
  collection,
  addDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  Firestore,
  CollectionReference,
  Query,
  FirestoreDataConverter,
  WithFieldValue,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  SetOptions,
  DocumentData,
} from 'firebase/firestore';
import type { AppNotification, AppNotificationDocument } from '../types/notification';

const createFirestoreConverter = <T>(): FirestoreDataConverter<T> => ({
  toFirestore: (
    modelObject: WithFieldValue<T> | PartialWithFieldValue<T>,
    _options?: SetOptions
  ): DocumentData => {
    if ((modelObject as any).id) {
      const { id, ...rest } = modelObject as any;
      return rest;
    }
    return modelObject as DocumentData;
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<DocumentData>
  ): T => {
    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
    } as T;
  }
});

const getTypedCollection = <T>(db: Firestore, path: string): CollectionReference<T> => {
  return collection(db, path).withConverter(createFirestoreConverter<T>());
};

export class NotificationService {
  private readonly firebase: FirebaseService;
  private readonly notifications: CollectionReference<AppNotificationDocument>;
  private readonly collectionName = 'notifications';

  constructor(firebase: FirebaseService) {
    this.firebase = firebase;
    this.notifications = getTypedCollection<AppNotificationDocument>(this.firebase.getFirestoreJsInstance(), this.collectionName);
  }

  async listForUser(userId: string, opts?: { onlyUnread?: boolean; max?: number }): Promise<AppNotification[]> {
    let q: Query<AppNotificationDocument> = this.notifications;
    q = query(q, where('userId', '==', userId), orderBy('createdAt', 'desc')) as any;
    if (opts?.onlyUnread) q = query(q, where('read', '==', false)) as any;
    if (opts?.max) q = query(q, limit(opts.max)) as any;
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }

  async markRead(id: string): Promise<void> {
    await updateDoc(doc(this.notifications, id), { read: true });
  }

  async create(n: Omit<AppNotification, 'id'>): Promise<string> {
    const payload: AppNotificationDocument = { ...n };
    const ref = await addDoc(this.notifications, payload);
    return ref.id;
  }
}


