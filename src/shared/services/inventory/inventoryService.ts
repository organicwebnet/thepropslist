import { FirebaseService, FirebaseError, FirestoreDocument, FirestoreCollection } from '../firebase/types';
import { VisionAPIService } from '../ai/vision';
import { QRCodeService, QRCodeData } from '../qr/qrService';

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

      const doc = await this.firebase.firestore()
        .collection(this.collection)
        .add({ ...prop, metadata });

      // Generate and store QR code
      const qrCode = await this.generateQRCode(doc.id);
      await this.updateProp(doc.id, { qrCode });

      return doc.id;
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

      await this.firebase.firestore()
        .collection(this.collection)
        .doc(id)
        .update({
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
      const docRef = this.firebase.firestore()
        .collection(this.collection)
        .doc(id);
      
      const docData = await docRef.get();

      if (!docData) {
        throw new FirebaseError(
          'inventory/not-found',
          `Prop with ID ${id} not found`
        );
      }

      const data = await docData.data();

      if (!data) {
        throw new FirebaseError(
          'inventory/not-found',
          `Prop with ID ${id} not found`
        );
      }

      return {
        id,
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
      let collection = this.firebase.firestore().collection(this.collection);

      if (filters) {
        if (filters.categories?.length) {
          collection = collection.where('category', 'in', filters.categories);
        }
        if (filters.status?.length) {
          collection = collection.where('status', 'in', filters.status);
        }
        if (filters.condition?.length) {
          collection = collection.where('condition', 'in', filters.condition);
        }
        if (filters.location?.type) {
          collection = collection.where('location.type', '==', filters.location.type);
        }
        if (filters.location?.name) {
          collection = collection.where('location.name', '==', filters.location.name);
        }
        if (filters.updatedAfter) {
          collection = collection.where('metadata.updatedAt', '>=', filters.updatedAfter);
        }
        if (filters.maintainenceNeeded) {
          collection = collection.where('maintenanceSchedule.nextCheck', '<=', new Date());
        }
      }

      const docs = await collection.get();
      const props: InventoryProp[] = [];

      for (const doc of docs) {
        const data = await doc.data();
        if (data) {
          props.push({
            id: doc.id,
            ...data as Omit<InventoryProp, 'id'>
          });
        }
      }

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
      await this.firebase.firestore()
        .collection(this.collection)
        .doc(id)
        .delete();
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
        propId,
        name: prop.name,
        category: prop.category,
        location: prop.location.name
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
    await this.updateProp(propId, { location });
  }

  async recordMaintenance(propId: string, maintenance: PropMaintenance): Promise<void> {
    const prop = await this.getProp(propId);
    const updates: Partial<InventoryProp> = {
      lastMaintenance: maintenance,
      status: 'available',
    };

    if (prop.maintenanceSchedule) {
      const nextCheck = new Date();
      nextCheck.setDate(nextCheck.getDate() + prop.maintenanceSchedule.frequency);
      updates.maintenanceSchedule = {
        ...prop.maintenanceSchedule,
        lastCheck: new Date(),
        nextCheck
      };
    }

    await this.updateProp(propId, updates);
  }

  async searchProps(query: string): Promise<InventoryProp[]> {
    try {
      // Note: This is a simple implementation. For production,
      // you might want to use a dedicated search service like Algolia
      const allProps = await this.listProps();
      const searchTerms = query.toLowerCase().split(' ');

      return allProps.filter(prop => {
        const searchableText = [
          prop.name,
          prop.description,
          prop.category,
          prop.subcategory,
          ...prop.tags,
          prop.notes
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    } catch (error) {
      throw new FirebaseError(
        'inventory/search-failed',
        'Failed to search props',
        error
      );
    }
  }
} 