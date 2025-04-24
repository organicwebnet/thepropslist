import { FirebaseService, FirebaseError } from '../firebase/types';
import { InventoryProp } from './inventoryService';
import { QRCodeService } from '../qr/qrService';

export interface PackingContainer {
  id: string;
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
  updatePackList(id: string, updates: Partial<PackList>): Promise<void>;
  getPackList(id: string): Promise<PackList>;
  listPackLists(filters?: PackListFilters): Promise<PackList[]>;
  deletePackList(id: string): Promise<void>;
  
  addContainer(packListId: string, container: Omit<PackingContainer, 'id' | 'metadata'>): Promise<string>;
  updateContainer(packListId: string, containerId: string, updates: Partial<PackingContainer>): Promise<void>;
  removeContainer(packListId: string, containerId: string): Promise<void>;
  
  addPropToContainer(packListId: string, containerId: string, propId: string, quantity?: number): Promise<void>;
  removePropFromContainer(packListId: string, containerId: string, propId: string): Promise<void>;
  updatePropInContainer(packListId: string, containerId: string, propId: string, updates: { quantity?: number; notes?: string }): Promise<void>;
  
  calculateContainerWeight(containerId: string): Promise<number>;
  validateContainerCapacity(containerId: string, propId: string, quantity: number): Promise<boolean>;
  generatePackingLabels(packListId: string): Promise<PackingLabel[]>;
}

export class DigitalPackListService implements PackListService {
  private firebase: FirebaseService;
  private qrService: QRCodeService;
  private collection = 'packLists';
  private baseUrl: string;

  constructor(
    firebase: FirebaseService,
    qrService: QRCodeService,
    baseUrl: string
  ) {
    this.firebase = firebase;
    this.qrService = qrService;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  async createPackList(packList: Omit<PackList, 'id' | 'metadata'>): Promise<string> {
    try {
      const metadata = {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: this.firebase.auth().currentUser?.uid || 'system',
        updatedBy: this.firebase.auth().currentUser?.uid || 'system'
      };

      const doc = await this.firebase.firestore()
        .collection(this.collection)
        .add({ ...packList, metadata });

      return doc.id;
    } catch (error) {
      throw new FirebaseError(
        'pack-list/create-failed',
        'Failed to create pack list',
        error
      );
    }
  }

  async updatePackList(id: string, updates: Partial<PackList>): Promise<void> {
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
        'pack-list/update-failed',
        'Failed to update pack list',
        error
      );
    }
  }

  async getPackList(id: string): Promise<PackList> {
    try {
      const doc = await this.firebase.firestore()
        .collection(this.collection)
        .doc(id)
        .get();

      const data = await doc.data();
      
      if (!data) {
        throw new FirebaseError(
          'pack-list/not-found',
          `Pack list with ID ${id} not found`
        );
      }

      return {
        id,
        ...data as Omit<PackList, 'id'>
      };
    } catch (error) {
      throw new FirebaseError(
        'pack-list/get-failed',
        'Failed to get pack list',
        error
      );
    }
  }

  async listPackLists(filters?: PackListFilters): Promise<PackList[]> {
    try {
      let query = this.firebase.firestore().collection(this.collection);

      if (filters) {
        if (filters.status?.length) {
          query = query.where('status', 'in', filters.status);
        }
        if (filters.showId) {
          query = query.where('showId', '==', filters.showId);
        }
        if (filters.updatedAfter) {
          query = query.where('metadata.updatedAt', '>=', filters.updatedAfter);
        }
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<PackList, 'id'>
      }));
    } catch (error) {
      throw new FirebaseError(
        'pack-list/list-failed',
        'Failed to list pack lists',
        error
      );
    }
  }

  async deletePackList(id: string): Promise<void> {
    try {
      await this.firebase.firestore()
        .collection(this.collection)
        .doc(id)
        .delete();
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
      const containerId = this.firebase.firestore().collection('temp').doc().id;

      const newContainer: PackingContainer = {
        ...container,
        id: containerId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: this.firebase.auth().currentUser?.uid || 'system',
          updatedBy: this.firebase.auth().currentUser?.uid || 'system'
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
    updates: Partial<PackingContainer>
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

      const updatedContainer = {
        ...packList.containers[containerIndex],
        ...updates,
        metadata: {
          ...packList.containers[containerIndex].metadata,
          updatedAt: new Date(),
          updatedBy: this.firebase.auth().currentUser?.uid || 'system'
        }
      };

      const updatedContainers = [...packList.containers];
      updatedContainers[containerIndex] = updatedContainer;

      await this.updatePackList(packListId, { containers: updatedContainers });
    } catch (error) {
      throw new FirebaseError(
        'pack-list/update-container-failed',
        'Failed to update container',
        error
      );
    }
  }

  async removeContainer(packListId: string, containerId: string): Promise<void> {
    try {
      const packList = await this.getPackList(packListId);
      const updatedContainers = packList.containers.filter(c => c.id !== containerId);

      await this.updatePackList(packListId, { containers: updatedContainers });
    } catch (error) {
      throw new FirebaseError(
        'pack-list/remove-container-failed',
        'Failed to remove container',
        error
      );
    }
  }

  async addPropToContainer(
    packListId: string,
    containerId: string,
    propId: string,
    quantity: number = 1
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
      const existingPropIndex = container.props.findIndex(p => p.propId === propId);

      if (existingPropIndex !== -1) {
        container.props[existingPropIndex].quantity += quantity;
      } else {
        container.props.push({ propId, quantity });
      }

      await this.updateContainer(packListId, containerId, { props: container.props });
    } catch (error) {
      throw new FirebaseError(
        'pack-list/add-prop-failed',
        'Failed to add prop to container',
        error
      );
    }
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
      throw new FirebaseError(
        'pack-list/update-prop-failed',
        'Failed to update prop in container',
        error
      );
    }
  }

  async calculateContainerWeight(containerId: string): Promise<number> {
    // This is a placeholder implementation
    // You would need to fetch prop weights from the inventory service
    // and calculate the total weight
    return 0;
  }

  async validateContainerCapacity(
    containerId: string,
    propId: string,
    quantity: number
  ): Promise<boolean> {
    // This is a placeholder implementation
    // You would need to check the container's capacity against
    // the total weight of existing props plus the new prop
    return true;
  }

  async generatePackingLabels(packListId: string): Promise<PackingLabel[]> {
    try {
      const packList = await this.getPackList(packListId);
      const labels: PackingLabel[] = [];

      for (const container of packList.containers) {
        const url = `${this.baseUrl}/pack-lists/${packListId}/containers/${container.id}`;
        
        const qrData = {
          propId: container.id,
          name: container.name,
          packListId: packList.id,
          url
        };

        const qrCode = await this.qrService.generateQRCode(qrData);

        labels.push({
          id: `${packListId}-${container.id}`,
          containerId: container.id,
          packListId,
          qrCode,
          containerName: container.name,
          containerStatus: container.status,
          propCount: container.props.length,
          labels: container.labels,
          url,
          generatedAt: new Date()
        });
      }

      return labels;
    } catch (error) {
      throw new FirebaseError(
        'pack-list/label-generation-failed',
        'Failed to generate packing labels',
        error
      );
    }
  }
} 