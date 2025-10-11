import { HybridStorageService, hybridStorageService, StorageProvider } from '../hybridStorage';
import { uploadImages as firebaseUploadImages } from '../../shared/services/firebase/firebase';
import { googleDriveService } from '../googleDrive';

// Mock dependencies
jest.mock('../../shared/services/firebase/firebase', () => ({
  uploadImages: jest.fn(),
}));

jest.mock('../googleDrive', () => ({
  googleDriveService: {
    checkAccess: jest.fn(),
    getOrCreatePropsBibleFolder: jest.fn(),
    uploadFiles: jest.fn(),
    deleteFile: jest.fn(),
  },
}));

describe('HybridStorageService', () => {
  let service: HybridStorageService;
  const mockFiles = [
    new File(['small content'], 'small.txt', { type: 'text/plain' }),
    new File(['large content'.repeat(1000)], 'large.txt', { type: 'text/plain' }),
  ];

  beforeEach(() => {
    service = HybridStorageService.getInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = HybridStorageService.getInstance();
      const instance2 = HybridStorageService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = HybridStorageService.getInstance();
      expect(instance).toBe(hybridStorageService);
    });
  });

  describe('Firebase Storage Upload', () => {
    it('should upload files to Firebase successfully', async () => {
      const mockFirebaseResult = {
        successful: [
          {
            url: 'https://firebase.com/file1',
            filename: 'file1.txt',
            originalName: 'file1.txt',
            size: 100,
            type: 'text/plain',
          },
        ],
        failed: [],
      };

      (firebaseUploadImages as jest.Mock).mockResolvedValueOnce(mockFirebaseResult);

      const result = await service.uploadFiles(mockFiles, 'test-path', { provider: 'firebase' });

      expect(result.successful).toHaveLength(1);
      expect(result.successful[0].provider).toBe('firebase');
      expect(result.failed).toHaveLength(0);
      expect(firebaseUploadImages).toHaveBeenCalledWith(mockFiles, 'test-path');
    });

    it('should handle Firebase upload failures', async () => {
      const mockFirebaseResult = {
        successful: [],
        failed: [
          {
            file: 'file1.txt',
            error: 'Upload failed',
          },
        ],
      };

      (firebaseUploadImages as jest.Mock).mockResolvedValueOnce(mockFirebaseResult);

      const result = await service.uploadFiles(mockFiles, 'test-path', { provider: 'firebase' });

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].provider).toBe('firebase');
    });

    it('should handle Firebase service errors', async () => {
      (firebaseUploadImages as jest.Mock).mockRejectedValueOnce(new Error('Firebase error'));

      const result = await service.uploadFiles(mockFiles, 'test-path', { provider: 'firebase' });

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].error).toBe('Firebase error');
    });
  });

  describe('Google Drive Upload', () => {
    beforeEach(() => {
      (googleDriveService.checkAccess as jest.Mock).mockResolvedValue(true);
      (googleDriveService.getOrCreatePropsBibleFolder as jest.Mock).mockResolvedValue({
        id: 'folder-123',
        name: 'Props Bible Files',
      });
    });

    it('should upload files to Google Drive successfully', async () => {
      const mockDriveResult = {
        successful: [
          {
            id: 'file-123',
            name: 'file1.txt',
            mimeType: 'text/plain',
            size: '100',
            webViewLink: 'https://drive.google.com/file/123',
            thumbnailLink: 'https://drive.google.com/thumbnail/123',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          },
        ],
        failed: [],
      };

      (googleDriveService.uploadFiles as jest.Mock).mockResolvedValueOnce(mockDriveResult);

      const result = await service.uploadFiles(mockFiles, 'test-path', { provider: 'google-drive' });

      expect(result.successful).toHaveLength(1);
      expect(result.successful[0].provider).toBe('google-drive');
      expect(result.successful[0].googleDriveId).toBe('file-123');
      expect(result.failed).toHaveLength(0);
    });

    it('should use custom folder ID when provided', async () => {
      const mockDriveResult = { successful: [], failed: [] };
      (googleDriveService.uploadFiles as jest.Mock).mockResolvedValueOnce(mockDriveResult);

      await service.uploadFiles(mockFiles, 'test-path', {
        provider: 'google-drive',
        googleDriveFolderId: 'custom-folder-123',
      });

      expect(googleDriveService.uploadFiles).toHaveBeenCalledWith(mockFiles, 'custom-folder-123');
    });

    it('should create user folder when no folder ID provided', async () => {
      const mockDriveResult = { successful: [], failed: [] };
      (googleDriveService.uploadFiles as jest.Mock).mockResolvedValueOnce(mockDriveResult);

      await service.uploadFiles(mockFiles, 'test-path', { provider: 'google-drive' });

      expect(googleDriveService.getOrCreatePropsBibleFolder).toHaveBeenCalled();
      expect(googleDriveService.uploadFiles).toHaveBeenCalledWith(mockFiles, 'folder-123');
    });

    it('should throw error when Google Drive access is not available', async () => {
      (googleDriveService.checkAccess as jest.Mock).mockResolvedValue(false);

      await expect(
        service.uploadFiles(mockFiles, 'test-path', { provider: 'google-drive' })
      ).rejects.toThrow('Google Drive access not available');
    });

    it('should handle Google Drive upload failures', async () => {
      const mockDriveResult = {
        successful: [],
        failed: [
          {
            file: 'file1.txt',
            error: 'Drive upload failed',
          },
        ],
      };

      (googleDriveService.uploadFiles as jest.Mock).mockResolvedValueOnce(mockDriveResult);

      const result = await service.uploadFiles(mockFiles, 'test-path', { provider: 'google-drive' });

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].provider).toBe('google-drive');
    });
  });

  describe('Hybrid Upload', () => {
    beforeEach(() => {
      (googleDriveService.checkAccess as jest.Mock).mockResolvedValue(true);
      (googleDriveService.getOrCreatePropsBibleFolder as jest.Mock).mockResolvedValue({
        id: 'folder-123',
        name: 'Props Bible Files',
      });
    });

    it('should route files based on size in hybrid mode', async () => {
      const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });
      const largeFile = new File(['large'.repeat(2000000)], 'large.txt', { type: 'text/plain' });
      const files = [smallFile, largeFile];

      const mockFirebaseResult = {
        successful: [
          {
            url: 'https://firebase.com/small',
            filename: 'small.txt',
            originalName: 'small.txt',
            size: 5,
            type: 'text/plain',
          },
        ],
        failed: [],
      };

      const mockDriveResult = {
        successful: [
          {
            id: 'file-123',
            name: 'large.txt',
            mimeType: 'text/plain',
            size: '10000000',
            webViewLink: 'https://drive.google.com/file/123',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          },
        ],
        failed: [],
      };

      (firebaseUploadImages as jest.Mock).mockResolvedValueOnce(mockFirebaseResult);
      (googleDriveService.uploadFiles as jest.Mock).mockResolvedValueOnce(mockDriveResult);

      const result = await service.uploadFiles(files, 'test-path', {
        provider: 'hybrid',
        largeFileThreshold: 1000000, // 1MB
      });

      expect(result.successful).toHaveLength(2);
      expect(result.successful[0].provider).toBe('firebase');
      expect(result.successful[1].provider).toBe('google-drive');
      expect(firebaseUploadImages).toHaveBeenCalledWith([smallFile], 'test-path');
      expect(googleDriveService.uploadFiles).toHaveBeenCalledWith([largeFile], 'folder-123');
    });

    it('should use default threshold when not specified', async () => {
      const files = [new File(['content'], 'test.txt', { type: 'text/plain' })];

      const mockFirebaseResult = { successful: [], failed: [] };
      (firebaseUploadImages as jest.Mock).mockResolvedValueOnce(mockFirebaseResult);

      await service.uploadFiles(files, 'test-path', { provider: 'hybrid' });

      // Should use default 5MB threshold
      expect(firebaseUploadImages).toHaveBeenCalledWith(files, 'test-path');
    });

    it('should handle mixed success and failure in hybrid mode', async () => {
      const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });
      const largeFile = new File(['large'.repeat(2000000)], 'large.txt', { type: 'text/plain' });
      const files = [smallFile, largeFile];

      const mockFirebaseResult = {
        successful: [
          {
            url: 'https://firebase.com/small',
            filename: 'small.txt',
            originalName: 'small.txt',
            size: 5,
            type: 'text/plain',
          },
        ],
        failed: [],
      };

      const mockDriveResult = {
        successful: [],
        failed: [
          {
            file: 'large.txt',
            error: 'Drive upload failed',
          },
        ],
      };

      (firebaseUploadImages as jest.Mock).mockResolvedValueOnce(mockFirebaseResult);
      (googleDriveService.uploadFiles as jest.Mock).mockResolvedValueOnce(mockDriveResult);

      const result = await service.uploadFiles(files, 'test-path', {
        provider: 'hybrid',
        largeFileThreshold: 1000000,
      });

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.successful[0].provider).toBe('firebase');
      expect(result.failed[0].provider).toBe('google-drive');
    });
  });

  describe('File Deletion', () => {
    it('should delete Google Drive files successfully', async () => {
      (googleDriveService.deleteFile as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.deleteFile(
        'https://drive.google.com/file/123',
        'google-drive',
        'file-123'
      );

      expect(result).toBe(true);
      expect(googleDriveService.deleteFile).toHaveBeenCalledWith('file-123');
    });

    it('should handle Google Drive deletion failures', async () => {
      (googleDriveService.deleteFile as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.deleteFile(
        'https://drive.google.com/file/123',
        'google-drive',
        'file-123'
      );

      expect(result).toBe(false);
    });

    it('should handle Firebase file deletion (placeholder)', async () => {
      const result = await service.deleteFile(
        'https://firebase.com/file/123',
        'firebase'
      );

      expect(result).toBe(true); // Currently returns true as placeholder
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.deleteFile('https://example.com/file', 'unsupported' as StorageProvider)
      ).rejects.toThrow('Unsupported storage provider for deletion: unsupported');
    });

    it('should throw error when Google Drive ID is missing', async () => {
      await expect(
        service.deleteFile('https://drive.google.com/file/123', 'google-drive')
      ).rejects.toThrow('Google Drive file ID is required for deletion');
    });
  });

  describe('Provider Detection', () => {
    it('should detect Firebase URLs', () => {
      const provider = service.getProviderFromUrl('https://firebasestorage.googleapis.com/file/123');
      expect(provider).toBe('firebase');
    });

    it('should detect Google Drive URLs', () => {
      const provider = service.getProviderFromUrl('https://drive.google.com/file/123');
      expect(provider).toBe('google-drive');
    });

    it('should detect Google User Content URLs', () => {
      const provider = service.getProviderFromUrl('https://lh3.googleusercontent.com/image');
      expect(provider).toBe('google-drive');
    });

    it('should default to Firebase for unknown URLs', () => {
      const provider = service.getProviderFromUrl('https://example.com/file');
      expect(provider).toBe('firebase');
    });
  });

  describe('Access Control', () => {
    it('should check Google Drive access', async () => {
      (googleDriveService.checkAccess as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.checkGoogleDriveAccess();
      expect(result).toBe(true);
    });

    it('should handle Google Drive access check failures', async () => {
      (googleDriveService.checkAccess as jest.Mock).mockRejectedValueOnce(new Error('Access denied'));

      const result = await service.checkGoogleDriveAccess();
      expect(result).toBe(false);
    });

    it('should get or create user folder', async () => {
      (googleDriveService.getOrCreatePropsBibleFolder as jest.Mock).mockResolvedValueOnce({
        id: 'folder-123',
        name: 'Props Bible Files',
      });

      const result = await service.getOrCreateUserFolder();
      expect(result).toEqual({ id: 'folder-123', name: 'Props Bible Files' });
    });

    it('should handle folder creation failures', async () => {
      (googleDriveService.getOrCreatePropsBibleFolder as jest.Mock).mockRejectedValueOnce(
        new Error('Folder creation failed')
      );

      const result = await service.getOrCreateUserFolder();
      expect(result).toBe(null);
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences', () => {
      const newPreferences = {
        provider: 'google-drive' as StorageProvider,
        largeFileThreshold: 10000000,
      };

      service.updatePreferences(newPreferences);
      const preferences = service.getPreferences();

      expect(preferences.provider).toBe('google-drive');
      expect(preferences.largeFileThreshold).toBe(10000000);
    });

    it('should merge preferences with defaults', () => {
      const partialPreferences = {
        provider: 'hybrid' as StorageProvider,
      };

      service.updatePreferences(partialPreferences);
      const preferences = service.getPreferences();

      expect(preferences.provider).toBe('hybrid');
      expect(preferences.useHybridForLargeFiles).toBe(true); // Default value
    });

    it('should return default preferences', () => {
      const preferences = service.getPreferences();

      expect(preferences.provider).toBe('firebase');
      expect(preferences.useHybridForLargeFiles).toBe(true);
      expect(preferences.largeFileThreshold).toBe(5 * 1024 * 1024);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported storage provider', async () => {
      await expect(
        service.uploadFiles(mockFiles, 'test-path', { provider: 'unsupported' as StorageProvider })
      ).rejects.toThrow('Unsupported storage provider: unsupported');
    });

    it('should handle Google Drive access errors in hybrid mode', async () => {
      (googleDriveService.checkAccess as jest.Mock).mockResolvedValue(false);

      await expect(
        service.uploadFiles(mockFiles, 'test-path', { provider: 'hybrid' })
      ).rejects.toThrow('Google Drive access not available');
    });
  });
});
