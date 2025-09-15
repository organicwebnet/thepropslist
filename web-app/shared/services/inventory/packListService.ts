import { FirebaseService } from '../firebase/types.ts';
import { InventoryService } from './inventoryService.ts';
import { QRCodeService, QRCodeData } from '../qr/qrService.ts';
import { 
  DocumentData, 
  CollectionReference, 
  DocumentReference,
  QueryDocumentSnapshot,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  WhereFilterOp,
  getFirestore,
  Query,
  WithFieldValue,
  PartialWithFieldValue,
  FirestoreDataConverter,
  SetOptions
} from 'firebase/firestore';

export class FirebaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FirebaseError';
  }
}

export interface PackingContainer {
  id: string;
  type?: string;
  name: string;
  description?: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: 'cm' | 'in';
  };
  maxWeight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  currentWeight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  props: Array<{
    propId: string;
    quantity: number;
    notes?: string;
  }>;
  labels: string[];
  status: 'empty' | 'partial' | 'full' | 'sealed';
  location?: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  };
}

export interface PackList {
  id: string;
  name: string;
  description?: string;
  showId?: string;
  ownerId?: string;
  containers: PackingContainer[];
  status: 'draft' | 'in_progress' | 'completed';
  labels: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
  };
}

export interface PackListFilters {
  status?: PackList['status'][];
  showId?: string;
  labels?: string[];
  updatedAfter?: Date;
}

export interface PackingLabel {
  id: string;
  containerId: string;
  packListId: string;
  qrCode: string;
  containerName: string;
  containerStatus: PackingContainer['status'];
  propCount: number;
  labels: string[];
  url: string;
  generatedAt: Date;
}

export interface PackListService {
  createPackList(packList: Omit<PackList, 'id' | 'metadata'>): Promise<string>;
  updatePackList(id: string, updates: Partial<Omit<PackList, 'id' | 'metadata'>>): Promise<void>;
  getPackList(id: string): Promise<PackList>;
  listPackLists(filters?: PackListFilters): Promise<PackList[]>;
  deletePackList(id: string): Promise<void>;
  
  addContainer(packListId: string, container: Omit<PackingContainer, 'id' | 'metadata'>): Promise<string>;
  updateContainer(packListId: string, containerId: string, updates: Partial<Omit<PackingContainer, 'id' | 'metadata'>>): Promise<void>;
  removeContainer(packListId: string, containerId: string): Promise<void>;
  
  addPropToContainer(packListId: string, containerId: string, propId: string, quantity?: number): Promise<void>;
  removePropFromContainer(packListId: string, containerId: string, propId: string): Promise<void>;
  updatePropInContainer(packListId: string, containerId: string, propId: string, updates: { quantity?: number; notes?: string }): Promise<void>;
  
  calculateContainerWeight(containerId: string): Promise<number>;
  validateContainerCapacity(containerId: string, propId: string, quantity: number): Promise<boolean>;
  generatePackingLabels(packListId: string): Promise<PackingLabel[]>;
}

export type PackListDocument = Omit<PackList, 'id'>;

// Create a proper Firestore converter
const createFirestoreConverter = <T>(): FirestoreDataConverter<T> => ({
  toFirestore: (
    modelObject: WithFieldValue<T> | PartialWithFieldValue<T>,
    options?: SetOptions
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

// Helper to create typed collection references
const getTypedCollection = <T>(
  db: Firestore,
  path: string
): CollectionReference<T> => {
  return collection(db, path).withConverter(createFirestoreConverter<T>());
};

export class DigitalPackListService implements PackListService {
  private readonly firebase: FirebaseService;
  private readonly qrService: QRCodeService;
  private readonly inventoryService: InventoryService;
  private readonly collectionName = 'packLists';
  private readonly baseUrl: string;
  private readonly packListsCollection: CollectionReference<PackListDocument>;

  constructor(
    firebase: FirebaseService,
    qrService: QRCodeService,
    inventoryService: InventoryService,
    baseUrl: string
  ) {
    this.firebase = firebase;
    this.qrService = qrService;
    this.inventoryService = inventoryService;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.packListsCollection = getTypedCollection<PackListDocument>(this.firebase.getFirestoreJsInstance(), this.collectionName);
  }

  private getCollection(): CollectionReference<PackListDocument> {
    return this.packListsCollection;
  }

  async createPackList(data: PackListDocument): Promise<string> {
    try {
      const docRef = await addDoc(this.getCollection(), {
        ...data,
        metadata: {
          ...data.metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      return docRef.id;
    } catch (error) {
      console.error('Firestore error:', error);
      throw new FirebaseError(
        'pack-list/create-failed',
        'Failed to create pack list: ' + (error && (error as any).message ? (error as any).message : JSON.stringify(error)),
        error
      );
    }
  }

  async getPackList(id: string): Promise<PackList> {
    const docRef = doc(this.getCollection(), id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Pack list with id ${id} not found`);
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id
    };
  }

  async listPackLists(filters?: PackListFilters): Promise<PackList[]> {
    if (!filters?.showId) {
      throw new Error('showId filter is required to list pack lists');
    }
    try {
      let q: Query<PackListDocument> = this.getCollection();
      const conditions = [];

      if (filters) {
        if (filters.status?.length) {
          conditions.push(where('status', 'in' as WhereFilterOp, filters.status));
        }
        if (filters.showId) {
          conditions.push(where('showId', '==' as WhereFilterOp, filters.showId));
        }
        if (filters.labels?.length) {
          conditions.push(where('labels', 'array-contains-any' as WhereFilterOp, filters.labels));
        }
        if (filters.updatedAfter) {
          conditions.push(where('metadata.updatedAt', '>=' as WhereFilterOp, filters.updatedAfter));
        }

        if (conditions.length > 0) {
          q = query(q, ...conditions);
        }
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      throw new FirebaseError(
        'pack-list/list-failed',
        'Failed to list pack lists',
        error
      );
    }
  }

  async updatePackList(id: string, data: Partial<Omit<PackList, 'id'>>): Promise<void> {
    try {
      const docRef = doc(this.getCollection(), id);
      await updateDoc(docRef, {
        ...data,
        'metadata.updatedAt': new Date()
      });
    } catch (error) {
      throw new FirebaseError(
        'pack-list/update-failed',
        'Failed to update pack list',
        error
      );
    }
  }

  async deletePackList(id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollection(), id);
      await deleteDoc(docRef);
    } catch (error) {
      throw new FirebaseError(
        'pack-list/delete-failed',
        'Failed to delete pack list',
        error
      );
    }
  }

  async addContainer(
    packListId: string,
    container: Omit<PackingContainer, 'id' | 'metadata'>
  ): Promise<string> {
    try {
      const packList = await this.getPackList(packListId);
      if (!packList) {
        throw new Error(`Pack list with id ${packListId} not found`);
      }

      const tempRef = doc(collection(this.firebase.getFirestoreJsInstance(), 'temp'));
      const containerId = tempRef.id;

      const newContainer: PackingContainer = {
        ...container,
        id: containerId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          updatedBy: 'system'
        }
      };

      await this.updatePackList(packListId, {
        containers: [...packList.containers, newContainer]
      });

      return containerId;
    } catch (error) {
      throw new FirebaseError(
        'pack-list/add-container-failed',
        'Failed to add container to pack list',
        error
      );
    }
  }

  async updateContainer(
    packListId: string,
    containerId: string,
    updates: Partial<Omit<PackingContainer, 'id' | 'metadata'>>
  ): Promise<void> {
    const packList = await this.getPackList(packListId);
    const containerIndex = packList.containers.findIndex(c => c.id === containerId);

    if (containerIndex === -1) {
      throw new Error(`Container with ID ${containerId} not found in pack list ${packListId}`);
    }

    const updatedContainer = {
      ...packList.containers[containerIndex],
      ...updates,
      metadata: {
        ...packList.containers[containerIndex].metadata,
        updatedAt: new Date(),
        updatedBy: 'system'
      }
    };

    const updatedContainers = [...packList.containers];
    updatedContainers[containerIndex] = updatedContainer;

    await this.updatePackList(packListId, { containers: updatedContainers });
  }

  async removeContainer(packListId: string, containerId: string): Promise<void> {
    const packList = await this.getPackList(packListId);
    const updatedContainers = packList.containers.filter(c => c.id !== containerId);
    await this.updatePackList(packListId, { containers: updatedContainers });
  }

  async addPropToContainer(
    packListId: string,
    containerId: string,
    propId: string,
    quantity = 1
  ): Promise<void> {
    const packList = await this.getPackList(packListId);
    const containerIndex = packList.containers.findIndex(c => c.id === containerId);

    if (containerIndex === -1) {
      throw new Error(`Container with ID ${containerId} not found in pack list ${packListId}`);
    }

    const container = packList.containers[containerIndex];
    const existingPropIndex = container.props.findIndex(p => p.propId === propId);

    if (existingPropIndex !== -1) {
      container.props[existingPropIndex].quantity += quantity;
    } else {
      container.props.push({ propId, quantity });
    }

    await this.updateContainer(packListId, containerId, { props: container.props });
  }

  async removePropFromContainer(
    packListId: string,
    containerId: string,
    propId: string
  ): Promise<void> {
    try {
      const packList = await this.getPackList(packListId);
      const containerIndex = packList.containers.findIndex(c => c.id === containerId);

      if (containerIndex === -1) {
        throw new FirebaseError(
          'pack-list/container-not-found',
          `Container with ID ${containerId} not found in pack list ${packListId}`
        );
      }

      const container = packList.containers[containerIndex];
      const updatedProps = container.props.filter(p => p.propId !== propId);

      await this.updateContainer(packListId, containerId, { props: updatedProps });
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw error;
      }
      throw new FirebaseError(
        'pack-list/remove-prop-failed',
        'Failed to remove prop from container',
        error
      );
    }
  }

  async updatePropInContainer(
    packListId: string,
    containerId: string,
    propId: string,
    updates: { quantity?: number; notes?: string }
  ): Promise<void> {
    try {
      const packList = await this.getPackList(packListId);
      const containerIndex = packList.containers.findIndex(c => c.id === containerId);

      if (containerIndex === -1) {
        throw new FirebaseError(
          'pack-list/container-not-found',
          `Container with ID ${containerId} not found in pack list ${packListId}`
        );
      }

      const container = packList.containers[containerIndex];
      const propIndex = container.props.findIndex(p => p.propId === propId);

      if (propIndex === -1) {
        throw new FirebaseError(
          'pack-list/prop-not-found',
          `Prop with ID ${propId} not found in container ${containerId}`
        );
      }

      const updatedProp = {
        ...container.props[propIndex],
        ...updates
      };

      const updatedProps = [...container.props];
      updatedProps[propIndex] = updatedProp;

      await this.updateContainer(packListId, containerId, { props: updatedProps });
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw error;
      }
      throw new FirebaseError(
        'pack-list/update-prop-failed',
        'Failed to update prop in container',
        error
      );
    }
  }

  async calculateContainerWeight(containerId: string): Promise<number> {
    try {
      const props = await this.inventoryService.listProps();
      const container = await this.getContainerById(containerId);
      
      let totalWeight = 0;
      for (const prop of container.props) {
        const propData = props.find(p => p.id === prop.propId);
        if (propData?.weight?.value) {
          totalWeight += propData.weight.value * (prop.quantity || 0);
        }
      }
      
      return totalWeight;
    } catch (error) {
      throw new FirebaseError(
        'pack-list/weight-calculation-failed',
        'Failed to calculate container weight',
        error
      );
    }
  }

  async validateContainerCapacity(
    containerId: string,
    propId: string,
    quantity: number
  ): Promise<boolean> {
    try {
      const container = await this.getContainerById(containerId);
      const prop = await this.inventoryService.getProp(propId);
      
      if (!container.maxWeight?.value || !prop.weight?.value) {
        return true;
      }
      
      const currentWeight = await this.calculateContainerWeight(containerId);
      const additionalWeight = prop.weight.value * quantity;
      
      return currentWeight + additionalWeight <= container.maxWeight.value;
    } catch (error) {
      throw new FirebaseError(
        'pack-list/capacity-validation-failed',
        'Failed to validate container capacity',
        error
      );
    }
  }

  async generatePackingLabels(packListId: string): Promise<PackingLabel[]> {
    const packList = await this.getPackList(packListId);
    if (!packList) {
      throw new Error(`Pack list with id ${packListId} not found`);
    }

    const labels: PackingLabel[] = [];
    for (const container of packList.containers) {
      const publicOrigin = this.baseUrl.includes('app.') ? this.baseUrl.replace('app.', '') : this.baseUrl;
      const containerUrl = `${publicOrigin}/c/${container.id}`;
      const qrCode = await this.qrService.generateQRCode({
        type: 'container',
        id: container.id,
        packListId: packList.id,
        url: containerUrl,
        name: container.name
      });

      labels.push({
        id: `${container.id}-${Date.now()}`,
        containerId: container.id,
        packListId: packList.id,
        qrCode,
        containerName: container.name,
        containerStatus: container.status,
        propCount: container.props.reduce((sum, prop) => sum + prop.quantity, 0),
        labels: container.labels || [],
        url: containerUrl,
        generatedAt: new Date()
      });
    }

    return labels;
  }

  private async getContainerById(containerId: string): Promise<PackingContainer> {
    const allPackLists = await this.listPackLists();
    for (const packList of allPackLists) {
      const container = packList.containers.find(c => c.id === containerId);
      if (container) {
        return container;
      }
    }
    throw new FirebaseError(
      'pack-list/container-not-found',
      `Container with ID ${containerId} not found`
    );
  }
} 
