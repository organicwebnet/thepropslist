import { DigitalInventoryService, InventoryProp, PropLocation } from '../inventoryService.ts';
import { FirebaseService, CustomFirestore } from '../../firebase/types.ts';
import { VisionAPIService } from '../../ai/vision.ts';
import { QRCodeService } from '../../qr/qrService.ts';

jest.mock('../../firebase/types.ts');
jest.mock('../../ai/vision.ts');
jest.mock('../../qr/qrService.ts');

describe('DigitalInventoryService', () => {
  let service: DigitalInventoryService;
  let mockFirebaseService: jest.Mocked<FirebaseService>;
  let mockVisionService: jest.Mocked<VisionAPIService>;
  let mockQRService: jest.Mocked<QRCodeService>;

  const mockLocation: PropLocation = {
    type: 'storage',
    name: 'Main Storage',
    details: 'Shelf A1'
  };

  const mockProp: InventoryProp = {
    id: 'test-prop-1',
    name: 'Test Prop',
    description: 'A test prop',
    category: 'Test Category',
    tags: ['test', 'prop'],
    images: ['test-image-1.jpg'],
    location: mockLocation,
    status: 'available',
    condition: 'good',
    acquisitionDate: new Date(),
    qrCode: 'test-qr-code',
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      updatedBy: 'test-user'
    }
  };

  beforeEach(() => {
    const mockAuth = {
      currentUser: { uid: 'test-user' }
    };

    const mockDocRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockProp
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined)
    };

    const mockCollectionRef = {
      add: jest.fn().mockResolvedValue({ id: 'test-prop-1' }),
      doc: jest.fn().mockReturnValue(mockDocRef)
    };

    const _mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollectionRef)
    };

    mockFirebaseService = {
      auth: jest.fn().mockReturnValue(mockAuth),
      firestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          add: jest.fn().mockResolvedValue({ id: 'test-id', data: () => mockProp }),
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: () => true, data: () => mockProp }),
            update: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined)
          }),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue([{ id: 'test-id', data: () => mockProp }])
        })
      } as unknown as CustomFirestore),
      offline: jest.fn().mockReturnValue({
        queueOperation: jest.fn().mockResolvedValue(undefined),
        getSyncStatus: jest.fn().mockResolvedValue(true)
      })
    } as any;

    mockVisionService = {
      identifyProp: jest.fn().mockResolvedValue({
        labels: ['Test Prop'],
        description: 'A test prop',
        categories: ['Test Category'],
        confidence: 0.95
      })
    } as any;

    mockQRService = {
      generateQRCode: jest.fn().mockResolvedValue('test-qr-code')
    } as any;

    service = new DigitalInventoryService(
      mockFirebaseService,
      mockVisionService,
      mockQRService
    );
  });

  describe('addProp', () => {
    it('should add a new prop with QR code', async () => {
      const propData = {
        name: 'Test Prop',
        description: 'A test prop',
        category: 'Test Category',
        tags: ['test'],
        images: [],
        location: mockLocation,
        status: 'available' as const,
        condition: 'good' as const,
        acquisitionDate: new Date()
      };

      const result = await service.addProp(propData);
      
      expect((mockFirebaseService.firestore as any).collection).toHaveBeenCalledWith('props');
      expect(mockQRService.generateQRCode).toHaveBeenCalledWith('test-prop-1');
      expect(result).toBe('test-prop-1');
    });

    it('should handle errors during prop creation', async () => {
      const error = new Error('Creation failed');
      (mockFirebaseService.firestore as any).collection().add.mockRejectedValueOnce(error);
      
      await expect(service.addProp({
        name: 'Test Prop',
        description: 'A test prop',
        category: 'Test Category',
        tags: [],
        images: [],
        location: mockLocation,
        status: 'available',
        condition: 'good',
        acquisitionDate: new Date()
      })).rejects.toThrow('Failed to add prop to inventory');
    });
  });

  describe('updateProp', () => {
    it('should update an existing prop', async () => {
      const updateData = {
        name: 'Updated Prop',
        description: 'Updated description'
      };

      await service.updateProp('test-prop-1', updateData);
      
      expect((mockFirebaseService.firestore as any).collection().doc().update)
        .toHaveBeenCalledWith(expect.objectContaining(updateData));
    });
  });

  describe('getProp', () => {
    it('should retrieve a prop by ID', async () => {
      const result = await service.getProp('test-prop-1');
      
      expect((mockFirebaseService.firestore as any).collection().doc().get)
        .toHaveBeenCalled();
      expect(result).toEqual(mockProp);
    });

    it('should throw error if prop not found', async () => {
      (mockFirebaseService.firestore as any).collection().doc().get
        .mockResolvedValueOnce({
          exists: false,
          data: () => null
        });

      await expect(service.getProp('non-existent'))
        .rejects.toThrow('Prop with ID non-existent not found');
    });
  });

  describe('identifyProp', () => {
    it('should identify prop from image', async () => {
      const imageBlob = new Blob(['test'], { type: 'image/jpeg' });
      const result = await service.identifyProp(imageBlob);
      
      expect(mockVisionService.identifyProp).toHaveBeenCalledWith(imageBlob);
      expect(result).toEqual({
        name: 'Test Prop',
        category: 'Test Category'
      });
    });
  });
}); 
