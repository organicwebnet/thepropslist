import { MobileFirebaseService } from '../platforms/mobile/services/MobileFirebaseService';
import { FirebaseError } from '../shared/services/firebase/types';

// Mock Firebase modules
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: jest.fn(),
    batch: jest.fn(),
    doc: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    currentUser: { uid: 'test-user-id' },
  }),
}));

describe('MobileFirebaseService - Show Deletion', () => {
  let service: MobileFirebaseService;
  let mockFirestore: any;
  let mockBatch: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock firestore instance
    mockFirestore = {
      collection: jest.fn(),
      batch: jest.fn(),
      doc: jest.fn(),
    };

    // Create mock batch
    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn(),
    };

    mockFirestore.batch.mockReturnValue(mockBatch);
    mockFirestore.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({ ref: 'show-ref' }),
    });

    // Create service instance
    service = new MobileFirebaseService();
    (service as any).firestore = mockFirestore;
  });

  describe('deleteShow', () => {
    const showId = 'test-show-id';

    it('should delete show and all related data successfully', async () => {
      // Mock getDocuments to return props and tasks
      const mockProps = [
        { ref: 'prop-ref-1' },
        { ref: 'prop-ref-2' },
      ];
      const mockTasks = [
        { ref: 'task-ref-1' },
        { ref: 'task-ref-2' },
      ];

      jest.spyOn(service, 'getDocuments')
        .mockResolvedValueOnce(mockProps) // First call for props
        .mockResolvedValueOnce(mockTasks); // Second call for tasks

      mockBatch.commit.mockResolvedValue(undefined);

      // Execute
      await service.deleteShow(showId);

      // Verify props deletion
      expect(service.getDocuments).toHaveBeenCalledWith(`shows/${showId}/props`);
      expect(mockBatch.delete).toHaveBeenCalledWith('prop-ref-1');
      expect(mockBatch.delete).toHaveBeenCalledWith('prop-ref-2');

      // Verify tasks deletion
      expect(service.getDocuments).toHaveBeenCalledWith('tasks', { 
        where: [['showId', '==', showId]] 
      });
      expect(mockBatch.delete).toHaveBeenCalledWith('task-ref-1');
      expect(mockBatch.delete).toHaveBeenCalledWith('task-ref-2');

      // Verify show deletion
      expect(mockFirestore.collection).toHaveBeenCalledWith('shows');
      expect(mockBatch.delete).toHaveBeenCalledWith('show-ref');

      // Verify batch commit
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle empty props and tasks gracefully', async () => {
      // Mock getDocuments to return empty arrays
      jest.spyOn(service, 'getDocuments')
        .mockResolvedValueOnce([]) // Empty props
        .mockResolvedValueOnce([]); // Empty tasks

      mockBatch.commit.mockResolvedValue(undefined);

      // Execute
      await service.deleteShow(showId);

      // Verify batch operations still occur
      expect(mockBatch.delete).toHaveBeenCalledWith('show-ref');
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should throw error when batch commit fails', async () => {
      // Mock getDocuments
      jest.spyOn(service, 'getDocuments')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Mock batch commit failure
      const commitError = new Error('Batch commit failed');
      mockBatch.commit.mockRejectedValue(commitError);

      // Execute and verify error
      await expect(service.deleteShow(showId)).rejects.toThrow('Batch commit failed');
    });

    it('should throw error when getDocuments fails', async () => {
      // Mock getDocuments failure
      const getDocumentsError = new Error('Failed to get documents');
      jest.spyOn(service, 'getDocuments').mockRejectedValue(getDocumentsError);

      // Execute and verify error
      await expect(service.deleteShow(showId)).rejects.toThrow('Failed to get documents');
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large datasets
      const largeProps = Array.from({ length: 100 }, (_, i) => ({ ref: `prop-ref-${i}` }));
      const largeTasks = Array.from({ length: 50 }, (_, i) => ({ ref: `task-ref-${i}` }));

      jest.spyOn(service, 'getDocuments')
        .mockResolvedValueOnce(largeProps)
        .mockResolvedValueOnce(largeTasks);

      mockBatch.commit.mockResolvedValue(undefined);

      // Execute
      await service.deleteShow(showId);

      // Verify all items are deleted
      expect(mockBatch.delete).toHaveBeenCalledTimes(151); // 100 props + 50 tasks + 1 show
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });
});
