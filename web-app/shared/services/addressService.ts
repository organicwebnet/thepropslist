import { FirebaseService } from './firebase/types.ts';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Firestore,
  CollectionReference,
  Query,
  WithFieldValue,
  PartialWithFieldValue,
  FirestoreDataConverter,
  SetOptions,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

export interface Address {
  id: string;
  showId?: string;
  name?: string; // label for selection: e.g. Warehouse, Theatre, Rehearsal
  company?: string;
  recipient?: string;
  contactName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  // Supported types. Legacy values ('warehouse','courier','other') remain for backward compatibility.
  type?: 'theatre' | 'rehearsal' | 'workshop' | 'maker' | 'supplier' | 'storage' | 'warehouse' | 'courier' | 'other';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  };
}

export type AddressDocument = Omit<Address, 'id'>;

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

export class AddressService {
  private readonly firebase: FirebaseService;
  private readonly addresses: CollectionReference<AddressDocument>;
  private readonly collectionName = 'addresses';

  constructor(firebase: FirebaseService) {
    this.firebase = firebase;
    this.addresses = getTypedCollection<AddressDocument>(this.firebase.getFirestoreJsInstance(), this.collectionName);
  }

  async listAddresses(params?: { showId?: string }): Promise<Address[]> {
    let q: Query<AddressDocument> = this.addresses;
    if (params?.showId) {
      q = query(this.addresses, where('showId', '==', params.showId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }

  async getAddress(id: string): Promise<Address | null> {
    const ref = doc(this.addresses, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...(data as any) };
  }

  async createAddress(data: Omit<Address, 'id' | 'metadata'> & { metadata?: Partial<Address['metadata']> }): Promise<string> {
    const now = new Date();
    const payload: AddressDocument = {
      ...data,
      metadata: {
        createdAt: data.metadata?.createdAt ?? now,
        updatedAt: data.metadata?.updatedAt ?? now,
        createdBy: data.metadata?.createdBy ?? 'system',
        updatedBy: data.metadata?.updatedBy ?? 'system',
      },
    } as AddressDocument;
    const ref = await addDoc(this.addresses, payload);
    return ref.id;
  }

  async updateAddress(id: string, updates: Partial<Omit<Address, 'id'>>): Promise<void> {
    const ref = doc(this.addresses, id);
    await updateDoc(ref, {
      ...updates,
      'metadata.updatedAt': new Date(),
    } as any);
  }

  async deleteAddress(id: string): Promise<void> {
    const ref = doc(this.addresses, id);
    await deleteDoc(ref);
  }
}

export function formatAddressLines(a?: Partial<Address> | null): string {
  if (!a) return '';
  const lines: string[] = [];
  if (a.company) lines.push(String(a.company));
  if (a.recipient) lines.push(String(a.recipient));
  const streetParts = [a.line1, a.line2].filter(Boolean).join('\n');
  if (streetParts) lines.push(streetParts);
  const cityLine = [a.city, a.region].filter(Boolean).join(', ');
  const codeCountry = [a.postcode, a.country].filter(Boolean).join(', ');
  const last = [cityLine, codeCountry].filter(Boolean).join('\n');
  if (last) lines.push(last);
  return lines.join('\n');
}


