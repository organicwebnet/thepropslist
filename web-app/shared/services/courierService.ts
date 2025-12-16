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
  orderBy,
  Firestore,
  CollectionReference,
  WithFieldValue,
  PartialWithFieldValue,
  FirestoreDataConverter,
  SetOptions,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

export interface Courier {
  id: string;
  name: string;
  isTheaterSpecialist?: boolean; // Flag for specialist theater couriers
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  notes?: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  };
}

export type CourierDocument = Omit<Courier, 'id'>;

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

// Predefined list of common couriers
const DEFAULT_COURIERS: Array<Omit<Courier, 'id' | 'metadata'>> = [
  // Mainstream couriers
  { name: 'DHL', isTheaterSpecialist: false },
  { name: 'FedEx', isTheaterSpecialist: false },
  { name: 'UPS', isTheaterSpecialist: false },
  { name: 'Royal Mail', isTheaterSpecialist: false },
  { name: 'Parcelforce', isTheaterSpecialist: false },
  { name: 'DPD', isTheaterSpecialist: false },
  { name: 'Hermes', isTheaterSpecialist: false },
  { name: 'Evri', isTheaterSpecialist: false },
  { name: 'Yodel', isTheaterSpecialist: false },
  { name: 'Amazon Logistics', isTheaterSpecialist: false },
  { name: 'TNT', isTheaterSpecialist: false },
  { name: 'DX', isTheaterSpecialist: false },
  { name: 'CitySprint', isTheaterSpecialist: false },
  { name: 'Parcel2Go', isTheaterSpecialist: false },
  { name: 'Interparcel', isTheaterSpecialist: false },
  { name: 'CollectPlus', isTheaterSpecialist: false },
  { name: 'InPost', isTheaterSpecialist: false },
  { name: 'APC Overnight', isTheaterSpecialist: false },
  { name: 'UK Mail', isTheaterSpecialist: false },
  { name: 'Arrow XL', isTheaterSpecialist: false },
  // Theater specialist couriers
  { name: 'Theater Express', isTheaterSpecialist: true },
  { name: 'Stage Freight', isTheaterSpecialist: true },
  { name: 'Props Express', isTheaterSpecialist: true },
  { name: 'Theater Logistics', isTheaterSpecialist: true },
  { name: 'Stage Transport', isTheaterSpecialist: true },
  { name: 'Theater Courier Services', isTheaterSpecialist: true },
  { name: 'Production Transport', isTheaterSpecialist: true },
  { name: 'Stage & Screen Logistics', isTheaterSpecialist: true },
];

export class CourierService {
  private readonly firebase: FirebaseService;
  private readonly couriers: CollectionReference<CourierDocument>;
  private readonly collectionName = 'couriers';

  constructor(firebase: FirebaseService) {
    this.firebase = firebase;
    this.couriers = getTypedCollection<CourierDocument>(this.firebase.getFirestoreJsInstance(), this.collectionName);
  }

  async listCouriers(): Promise<Courier[]> {
    const q = query(this.couriers, orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }

  async getCourier(id: string): Promise<Courier | null> {
    const ref = doc(this.couriers, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...(data as any) };
  }

  async createCourier(data: Omit<Courier, 'id' | 'metadata'> & { metadata?: Partial<Courier['metadata']> }): Promise<string> {
    const now = new Date();
    const payload: CourierDocument = {
      ...data,
      metadata: {
        createdAt: data.metadata?.createdAt ?? now,
        updatedAt: data.metadata?.updatedAt ?? now,
        createdBy: data.metadata?.createdBy ?? 'system',
        updatedBy: data.metadata?.updatedBy ?? 'system',
      },
    } as CourierDocument;
    const ref = await addDoc(this.couriers, payload);
    return ref.id;
  }

  async updateCourier(id: string, updates: Partial<Omit<Courier, 'id'>>): Promise<void> {
    const ref = doc(this.couriers, id);
    await updateDoc(ref, {
      ...updates,
      'metadata.updatedAt': new Date(),
    } as any);
  }

  async deleteCourier(id: string): Promise<void> {
    const ref = doc(this.couriers, id);
    await deleteDoc(ref);
  }

  /**
   * Seeds the database with default couriers if they don't already exist.
   * This ensures common couriers are available in the dropdown.
   */
  async seedDefaultCouriers(userId?: string): Promise<number> {
    const existingCouriers = await this.listCouriers();
    const existingNames = new Set(existingCouriers.map(c => c.name.toLowerCase()));
    
    let createdCount = 0;
    const now = new Date();
    const createdBy = userId || 'system';

    for (const courierData of DEFAULT_COURIERS) {
      // Skip if courier already exists (case-insensitive)
      if (existingNames.has(courierData.name.toLowerCase())) {
        continue;
      }

      try {
        const payload: CourierDocument = {
          ...courierData,
          metadata: {
            createdAt: now,
            updatedAt: now,
            createdBy,
            updatedBy: createdBy,
          },
        } as CourierDocument;
        
        await addDoc(this.couriers, payload);
        createdCount++;
      } catch (err) {
        console.error(`Failed to seed courier ${courierData.name}:`, err);
        // Continue with other couriers even if one fails
      }
    }

    return createdCount;
  }
}

