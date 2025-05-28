import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PackListManager } from '../PackListManager.tsx';
import { PackListService, PackList, PackingContainer } from '../../../shared/services/inventory/packListService.ts';
import { InventoryService } from '../../../shared/services/inventory/inventoryService.ts';
import { Show } from '../../../types/index.ts';
import { UserProfile } from '../../../shared/types/auth.ts';

// Mock services
const mockPackListService: jest.Mocked<PackListService> = {
  createPackList: jest.fn(),
  updatePackList: jest.fn(),
  getPackList: jest.fn(),
  listPackLists: jest.fn(),
  deletePackList: jest.fn(),
  addContainer: jest.fn(),
  updateContainer: jest.fn(),
  removeContainer: jest.fn(),
  addPropToContainer: jest.fn(),
  removePropFromContainer: jest.fn(),
  updatePropInContainer: jest.fn(),
  calculateContainerWeight: jest.fn(),
  validateContainerCapacity: jest.fn(),
  generatePackingLabels: jest.fn(),
};

const mockInventoryService: jest.Mocked<InventoryService> = {
  addProp: jest.fn(),
  updateProp: jest.fn(),
  getProp: jest.fn(),
  listProps: jest.fn(),
  deleteProp: jest.fn(),
  generateQRCode: jest.fn(),
  identifyProp: jest.fn(),
  updateLocation: jest.fn(),
  recordMaintenance: jest.fn(),
  searchProps: jest.fn(),
};

describe('PackListManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    const defaultPackList: PackList = {
      id: '1',
      name: 'Test Pack List',
      containers: [],
      status: 'draft',
      labels: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        updatedBy: 'test-user'
      }
    };

    mockPackListService.listPackLists.mockResolvedValue([defaultPackList]);

    mockInventoryService.listProps.mockResolvedValue([
      {
        id: '1',
        name: 'Test Prop',
        description: 'A test prop',
        category: 'Test',
        tags: [],
        images: [],
        status: 'available',
        condition: 'good',
        acquisitionDate: new Date(),
        location: {
          type: 'storage',
          name: 'Test Storage'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test-user',
          updatedBy: 'test-user'
        }
      }
    ]);
  });

  it('renders without crashing', async () => {
    render(
      <PackListManager
        packListService={mockPackListService}
        inventoryService={mockInventoryService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pack Lists')).toBeInTheDocument();
    });
  });

  it('loads pack lists and available props on mount', async () => {
    render(
      <PackListManager
        packListService={mockPackListService}
        inventoryService={mockInventoryService}
      />
    );

    await waitFor(() => {
      expect(mockPackListService.listPackLists).toHaveBeenCalled();
      expect(mockInventoryService.listProps).toHaveBeenCalled();
    });
  });

  it('creates a new pack list', async () => {
    mockPackListService.createPackList.mockResolvedValue('new-list-id');

    render(
      <PackListManager
        packListService={mockPackListService}
        inventoryService={mockInventoryService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create Pack List')).toBeInTheDocument();
    });

    fireEvent.press(screen.getByText('Create Pack List'));

    await waitFor(() => {
      expect(mockPackListService.createPackList).toHaveBeenCalled();
      expect(mockPackListService.listPackLists).toHaveBeenCalledTimes(2); // Initial + after creation
    });
  });

  it('adds a container to selected pack list', async () => {
    mockPackListService.listPackLists.mockResolvedValue([
      {
        id: '1',
        name: 'Test Pack List',
        containers: [],
        status: 'draft',
        labels: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test-user',
          updatedBy: 'test-user'
        }
      }
    ]);

    render(
      <PackListManager
        packListService={mockPackListService}
        inventoryService={mockInventoryService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Pack List')).toBeInTheDocument();
    });

    // Select the pack list
    fireEvent.press(screen.getByText('Test Pack List'));

    // Add container
    fireEvent.press(screen.getByText('Add Container'));

    await waitFor(() => {
      expect(mockPackListService.addContainer).toHaveBeenCalled();
      expect(mockPackListService.listPackLists).toHaveBeenCalledTimes(2); // Initial + after adding container
    });
  });

  it('displays error message when loading pack lists fails', async () => {
    mockPackListService.listPackLists.mockRejectedValue(new Error('Failed to load'));

    render(
      <PackListManager
        packListService={mockPackListService}
        inventoryService={mockInventoryService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load pack lists')).toBeInTheDocument();
    });
  });

  it('adds a prop to a container', async () => {
    const packList: PackList = {
      id: '1',
      name: 'Test Pack List',
      containers: [{
        id: 'container-1',
        name: 'Test Container',
        props: [],
        labels: [],
        status: 'empty' as const,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test-user',
          updatedBy: 'test-user'
        }
      }],
      status: 'draft',
      labels: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        updatedBy: 'test-user'
      }
    };

    mockPackListService.listPackLists.mockResolvedValue([packList]);

    render(
      <PackListManager
        packListService={mockPackListService}
        inventoryService={mockInventoryService}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Pack List')).toBeInTheDocument();
    });

    // Select the pack list
    fireEvent.press(screen.getByText('Test Pack List'));

    // Add prop to container
    const select = screen.getByRole('combobox');
    fireEvent.changeText(select, '1');

    await waitFor(() => {
      expect(mockPackListService.addPropToContainer).toHaveBeenCalledWith(
        '1',
        'container-1',
        '1',
        1
      );
    });
  });
}); 