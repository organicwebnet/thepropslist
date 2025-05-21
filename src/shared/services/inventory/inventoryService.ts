import { FirebaseService, FirebaseError, FirebaseDocument, FirebaseCollection } from '../firebase/types';
import { VisionAPIService } from '../ai/vision';
import { QRCodeService, QRCodeData } from '../qr/qrService';
import { 
  Firestore as WebFirestore,
  collection as webCollection,
  doc as webDoc,
  addDoc as webAddDoc,
  updateDoc as webUpdateDoc,
  getDoc as webGetDoc,
  deleteDoc as webDeleteDoc,
  query as webQuery,
  where as webWhere,
  getDocs as webGetDocs,
  orderBy as webOrderBy,
  limit as webLimit
} from 'firebase/firestore';

export interface PropLocation {
  type: 'storage' | 'show' | 'maintenance' | 'transit';
  name: string;
  details?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropMaintenance {
  type: 'repair' | 'cleaning' | 'inspection';
  date: Date;
  notes: string;
  cost?: number;
  technician?: string;
}

export interface InventoryProp {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  images: string[];
  qrCode?: string;
  location: PropLocation;
  status: 'available' | 'in-use' | 'maintenance' | 'retired';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  acquisitionDate: Date;
  lastMaintenance?: PropMaintenance;
  maintenanceSchedule?: {
    frequency: number; // days
    lastCheck: Date;
    nextCheck: Date;
  };
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: 'cm' | 'in';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  value?: {
    amount: number;
    currency: string;
  };
  notes?: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  };
}

export interface InventoryService {
  addProp(prop: Omit<InventoryProp, 'id' | 'metadata'>): Promise<string>;
  updateProp(id: string, updates: Partial<InventoryProp>): Promise<void>;
  getProp(id: string): Promise<InventoryProp>;
  listProps(filters?: PropFilters): Promise<InventoryProp[]>;
  deleteProp(id: string): Promise<void>;
  generateQRCode(propId: string): Promise<string>;
  identifyProp(imageData: Blob): Promise<Partial<InventoryProp>>;
  updateLocation(propId: string, location: PropLocation): Promise<void>;
  recordMaintenance(propId: string, maintenance: PropMaintenance): Promise<void>;
  searchProps(query: string): Promise<InventoryProp[]>;
}

export interface PropFilters {
  categories?: string[];
  status?: InventoryProp['status'][];
  location?: {
    type?: PropLocation['type'];
    name?: string;
  };
  condition?: InventoryProp['condition'][];
  tags?: string[];
  updatedAfter?: Date;
  maintainenceNeeded?: boolean;
}

export class DigitalInventoryService implements InventoryService {
  private firebase: FirebaseService;
  private vision: VisionAPIService;
  private qrCode: QRCodeService;
  private collection = 'props';

  constructor(
    firebase: FirebaseService,
    vision: VisionAPIService,
    qrCode: QRCodeService
  ) {
    this.firebase = firebase;
    this.vision = vision;
    this.qrCode = qrCode;
  }

  async addProp(prop: Omit<InventoryProp, 'id' | 'metadata'>): Promise<string> {
    try {
      const metadata = {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.firebase.auth().currentUser?.uid || 'system',
        updatedBy: this.firebase.auth().currentUser?.uid || 'system'
      };
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      const collRef = webCollection(firestoreInstance, this.collection);
      const docRef = await webAddDoc(collRef, { ...prop, metadata });

      // Generate and store QR code
      const qrCode = await this.generateQRCode(docRef.id);
      await this.updateProp(docRef.id, { qrCode });

      return docRef.id;
    } catch (error) {
      throw new FirebaseError(
        'inventory/add-failed',
        'Failed to add prop to inventory',
        error
      );
    }
  }

  async updateProp(id: string, updates: Partial<InventoryProp>): Promise<void> {
    try {
      const metadata = {
        updatedAt: new Date(),
        updatedBy: this.firebase.auth().currentUser?.uid || 'system'
      };
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      const docRef = webDoc(firestoreInstance, this.collection, id);
      await webUpdateDoc(docRef, {
          ...updates,
          'metadata.updatedAt': metadata.updatedAt,
          'metadata.updatedBy': metadata.updatedBy
        });
    } catch (error) {
      throw new FirebaseError(
        'inventory/update-failed',
        'Failed to update prop',
        error
      );
    }
  }

  async getProp(id: string): Promise<InventoryProp> {
    try {
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      const docRef = webDoc(firestoreInstance, this.collection, id);
      const docSnap = await webGetDoc(docRef);

      if (!docSnap.exists()) {
        throw new FirebaseError(
          'inventory/not-found',
          `Prop with ID ${id} not found`
        );
      }

      const data = docSnap.data();

      return {
        id: docSnap.id,
        ...data as Omit<InventoryProp, 'id'>
      };
    } catch (error) {
      throw new FirebaseError(
        'inventory/get-failed',
        'Failed to get prop',
        error
      );
    }
  }

  async listProps(filters?: PropFilters): Promise<InventoryProp[]> {
    try {
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      let q = webQuery(webCollection(firestoreInstance, this.collection));

      if (filters) {
        if (filters.categories?.length) {
          q = webQuery(q, webWhere('category', 'in', filters.categories));
        }
        if (filters.status?.length) {
          q = webQuery(q, webWhere('status', 'in', filters.status));
        }
        if (filters.condition?.length) {
          q = webQuery(q, webWhere('condition', 'in', filters.condition));
        }
        if (filters.location?.type) {
          q = webQuery(q, webWhere('location.type', '==', filters.location.type));
        }
        if (filters.location?.name) {
          q = webQuery(q, webWhere('location.name', '==', filters.location.name));
        }
        if (filters.updatedAfter) {
          q = webQuery(q, webWhere('metadata.updatedAt', '>=', filters.updatedAfter));
        }
        if (filters.maintainenceNeeded) {
          q = webQuery(q, webWhere('maintenanceSchedule.nextCheck', '<=', new Date()));
        }
      }

      const querySnapshot = await webGetDocs(q);
      const props: InventoryProp[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        props.push({
          id: docSnap.id,
          ...data as Omit<InventoryProp, 'id'>
        });
      });

      return props;
    } catch (error) {
      throw new FirebaseError(
        'inventory/list-failed',
        'Failed to list props',
        error
      );
    }
  }

  async deleteProp(id: string): Promise<void> {
    try {
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      const docRef = webDoc(firestoreInstance, this.collection, id);
      await webDeleteDoc(docRef);
    } catch (error) {
      throw new FirebaseError(
        'inventory/delete-failed',
        'Failed to delete prop',
        error
      );
    }
  }

  async generateQRCode(propId: string): Promise<string> {
    try {
      const prop = await this.getProp(propId);
      const qrData: QRCodeData = {
        id: propId,
        type: 'prop',
        name: prop.name,
        category: prop.category,
        location: prop.location.name,
        url: `/props/${propId}`
      };

      return this.qrCode.generateQRCode(qrData);
    } catch (error) {
      throw new FirebaseError(
        'inventory/qr-generation-failed',
        'Failed to generate QR code for prop',
        error
      );
    }
  }

  async identifyProp(imageData: Blob): Promise<Partial<InventoryProp>> {
    try {
      const visionResult = await this.vision.identifyProp(imageData);
      
      return {
        name: visionResult.labels[0] || 'Unidentified Prop',
        description: visionResult.description,
        category: visionResult.categories[0] || 'Uncategorized',
        tags: visionResult.labels
      };
    } catch (error) {
      throw new FirebaseError(
        'inventory/identification-failed',
        'Failed to identify prop from image',
        error
      );
    }
  }

  async updateLocation(propId: string, location: PropLocation): Promise<void> {
    try {
      await this.updateProp(propId, { location });
    } catch (error) {
      throw new FirebaseError(
        'inventory/update-location-failed',
        'Failed to update prop location',
        error
      );
    }
  }

  async recordMaintenance(propId: string, maintenance: PropMaintenance): Promise<void> {
    try {
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      const docRef = webDoc(firestoreInstance, this.collection, propId);
      await webUpdateDoc(docRef, {
          lastMaintenance: maintenance,
          'metadata.updatedAt': new Date(),
          'metadata.updatedBy': this.firebase.auth().currentUser?.uid || 'system',
        });
    } catch (error) {
      throw new FirebaseError(
        'inventory/record-maintenance-failed',
        'Failed to record prop maintenance',
        error
      );
    }
  }

  async searchProps(query: string): Promise<InventoryProp[]> {
    try {
      const firestoreInstance = this.firebase.firestore() as WebFirestore;
      const propsColl = webCollection(firestoreInstance, this.collection);

      const nameQuery = webQuery(propsColl,
        webWhere('name', '>=', query),
        webWhere('name', '<=', query + '\uf8ff')
      );
      
      const tagQuery = webQuery(propsColl, 
        webWhere('tags', 'array-contains', query)
      );

      const [nameSnapshot, tagSnapshot] = await Promise.all([
        webGetDocs(nameQuery),
        webGetDocs(tagQuery),
      ]);

      const propsMap = new Map<string, InventoryProp>();

      nameSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        propsMap.set(docSnap.id, { id: docSnap.id, ...data as Omit<InventoryProp, 'id'> });
      });

      tagSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!propsMap.has(docSnap.id)) {
          propsMap.set(docSnap.id, { id: docSnap.id, ...data as Omit<InventoryProp, 'id'> });
        }
      });

      return Array.from(propsMap.values());
    } catch (error) {
      throw new FirebaseError(
        'inventory/search-failed',
        'Failed to search props',
        error
      );
    }
  }
} 