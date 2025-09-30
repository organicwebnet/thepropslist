import { ArchiveService } from '../services/ArchiveService';
import { FirebaseService } from '../types/firebase';

// Mock Firebase service
const mockFirebaseService: jest.Mocked<FirebaseService> = {
  addDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getDocuments: jest.fn(),
  updateDocument: jest.fn(),
  getDocument: jest.fn(),
  listenToCollection: jest.fn(),
  listenToDocument: jest.fn(),
  batch: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getStorageRef: jest.fn(),
  getFirestoreJsInstance: jest.fn(),
  getFirestoreReactNativeInstance: jest.fn(),
  offline: jest.fn(),
  deleteShow: jest.fn(),
  updateCard: jest.fn(),
  addCard: jest.fn(),
  deleteCard: jest.fn(),
  reorderListsInBoard: jest.fn(),
  reorderCardsInList: jest.fn(),
  deleteList: jest.fn(),
  addList: jest.fn(),
  updateList: jest.fn(),
} as any;

describe('ArchiveService - Show Deletion', () => {
  let archiveService: ArchiveService;

  beforeEach(() => {
    jest.clearAllMocks();
    archiveService = new ArchiveService(mockFirebaseService);
  });

  describe('permanentlyDeleteShow', () => {
    const showId = 'test-show-id';
    const userId = 'test-user-id';

    it('should delete show and all associated data successfully', async () => {
      // Mock associated data IDs
      const mockAssociatedDataIds = {
        props: [
          { collection: 'props', id: 'prop-1' },
          { collection: 'props', id: 'prop-2' },
        ],
        boards: [
          { collection: 'todo_boards', id: 'board-1' },
        ],
        packingLists: [
          { collection: 'packLists', id: 'pack-1' },
        ],
        collaborators: [],
        shoppingLists: [],
      };

      // Mock getAssociatedDataIds
      jest.spyOn(archiveService as any, 'getAssociatedDataIds')
        .mockResolvedValue(mockAssociatedDataIds);

      // Mock deleteAssociatedData
      jest.spyOn(archiveService as any, 'deleteAssociatedData')
        .mockResolvedValue(undefined);

      // Mock Firebase service methods
      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);
      mockFirebaseService.addDocument.mockResolvedValue('deletion-log-id');

      // Execute
      await archiveService.permanentlyDeleteShow(showId, userId);

      // Verify associated data deletion
      expect(archiveService['getAssociatedDataIds']).toHaveBeenCalledWith(showId);
      expect(archiveService['deleteAssociatedData']).toHaveBeenCalledWith(mockAssociatedDataIds);

      // Verify show deletion
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith('shows', showId);

      // Verify deletion logging
      expect(mockFirebaseService.addDocument).toHaveBeenCalledWith('deletion_logs', {
        showId,
        deletedBy: userId,
        deletedAt: expect.any(Date),
        associatedDataCount: 3, // 2 props + 1 board + 1 packing list
      });
    });

    it('should handle empty associated data gracefully', async () => {
      // Mock empty associated data
      const mockAssociatedDataIds = {
        props: [],
        boards: [],
        packingLists: [],
        collaborators: [],
        shoppingLists: [],
      };

      jest.spyOn(archiveService as any, 'getAssociatedDataIds')
        .mockResolvedValue(mockAssociatedDataIds);
      jest.spyOn(archiveService as any, 'deleteAssociatedData')
        .mockResolvedValue(undefined);

      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);
      mockFirebaseService.addDocument.mockResolvedValue('deletion-log-id');

      // Execute
      await archiveService.permanentlyDeleteShow(showId, userId);

      // Verify deletion logging with zero count
      expect(mockFirebaseService.addDocument).toHaveBeenCalledWith('deletion_logs', {
        showId,
        deletedBy: userId,
        deletedAt: expect.any(Date),
        associatedDataCount: 0,
      });
    });

    it('should throw error when show deletion fails', async () => {
      // Mock successful associated data operations
      jest.spyOn(archiveService as any, 'getAssociatedDataIds')
        .mockResolvedValue({ props: [], boards: [], packingLists: [], collaborators: [], shoppingLists: [] });
      jest.spyOn(archiveService as any, 'deleteAssociatedData')
        .mockResolvedValue(undefined);

      // Mock show deletion failure
      const deleteError = new Error('Failed to delete show');
      mockFirebaseService.deleteDocument.mockRejectedValue(deleteError);

      // Execute and verify error
      await expect(archiveService.permanentlyDeleteShow(showId, userId))
        .rejects.toThrow('Failed to delete show');
    });

    it('should throw error when associated data deletion fails', async () => {
      // Mock associated data deletion failure
      const associatedDataError = new Error('Failed to delete associated data');
      jest.spyOn(archiveService as any, 'getAssociatedDataIds')
        .mockResolvedValue({ props: [], boards: [], packingLists: [], collaborators: [], shoppingLists: [] });
      jest.spyOn(archiveService as any, 'deleteAssociatedData')
        .mockRejectedValue(associatedDataError);

      // Execute and verify error
      await expect(archiveService.permanentlyDeleteShow(showId, userId))
        .rejects.toThrow('Failed to delete associated data');
    });

    it('should handle deletion logging failure gracefully', async () => {
      // Mock successful deletion operations
      jest.spyOn(archiveService as any, 'getAssociatedDataIds')
        .mockResolvedValue({ props: [], boards: [], packingLists: [], collaborators: [], shoppingLists: [] });
      jest.spyOn(archiveService as any, 'deleteAssociatedData')
        .mockResolvedValue(undefined);

      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);
      
      // Mock logging failure
      const loggingError = new Error('Failed to log deletion');
      mockFirebaseService.addDocument.mockRejectedValue(loggingError);

      // Execute and verify error
      await expect(archiveService.permanentlyDeleteShow(showId, userId))
        .rejects.toThrow('Failed to log deletion');
    });
  });

  describe('deleteAssociatedData', () => {
    it('should delete all associated data items', async () => {
      const mockDataIds = {
        props: [
          { collection: 'props', id: 'prop-1' },
          { collection: 'props', id: 'prop-2' },
        ],
        boards: [
          { collection: 'todo_boards', id: 'board-1' },
        ],
        packingLists: [
          { collection: 'packLists', id: 'pack-1' },
        ],
        collaborators: [],
        shoppingLists: [],
      };

      mockFirebaseService.deleteDocument.mockResolvedValue(undefined);

      // Execute
      await (archiveService as any).deleteAssociatedData(mockDataIds);

      // Verify all items are deleted
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith('props', 'prop-1');
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith('props', 'prop-2');
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith('todo_boards', 'board-1');
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith('packLists', 'pack-1');
      expect(mockFirebaseService.deleteDocument).toHaveBeenCalledTimes(4);
    });

    it('should handle deletion failures for individual items', async () => {
      const mockDataIds = {
        props: [
          { collection: 'props', id: 'prop-1' },
          { collection: 'props', id: 'prop-2' },
        ],
        boards: [],
        packingLists: [],
        collaborators: [],
        shoppingLists: [],
      };

      // Mock first deletion success, second failure
      mockFirebaseService.deleteDocument
        .mockResolvedValueOnce(undefined) // prop-1 success
        .mockRejectedValueOnce(new Error('Failed to delete prop-2')); // prop-2 failure

      // Execute and verify error
      await expect((archiveService as any).deleteAssociatedData(mockDataIds))
        .rejects.toThrow('Failed to delete prop-2');
    });
  });
});
