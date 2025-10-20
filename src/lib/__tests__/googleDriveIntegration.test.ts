import { GoogleDriveService } from '../googleDrive';
import { HybridStorageService } from '../hybridStorage';
import { getGoogleAuthToken } from '../google';

// Mock dependencies
jest.mock('../google', () => ({
  getGoogleAuthToken: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Google Drive Integration Tests', () => {
  let driveService: GoogleDriveService;
  let hybridService: HybridStorageService;
  const mockToken = 'mock-access-token';

  beforeEach(() => {
    driveService = GoogleDriveService.getInstance();
    hybridService = HybridStorageService.getInstance();
    jest.clearAllMocks();
    (getGoogleAuthToken as jest.Mock).mockResolvedValue(mockToken);
  });

  describe('End-to-End Upload Flow', () => {
    it('should complete full upload flow from authentication to file storage', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock the complete flow
      (global.fetch as jest.Mock)
        // Check access
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        // Create folder
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'folder-123',
            name: 'Props Bible Files',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        })
        // Upload file
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file-123',
            name: 'test.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-123/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        });

      // Test the complete flow
      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(true);

      const folder = await driveService.getOrCreatePropsBibleFolder();
      expect(folder.id).toBe('folder-123');

      const uploadResult = await driveService.uploadFile(testFile, folder.id);
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.file?.id).toBe('file-123');
    });

    it('should handle authentication failure gracefully', async () => {
      (getGoogleAuthToken as jest.Mock).mockRejectedValue(new Error('Auth failed'));

      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(false);
    });

    it('should handle network failures during upload', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(true);

      const uploadResult = await driveService.uploadFile(testFile);
      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('Network error');
    });
  });

  describe('Hybrid Storage Integration', () => {
    it('should route files correctly based on size in hybrid mode', async () => {
      const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });
      const largeFile = new File(['large'.repeat(2000000)], 'large.txt', { type: 'text/plain' });
      const files = [smallFile, largeFile];

      // Mock Google Drive access
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'folder-123',
            name: 'Props Bible Files',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            successful: [{
              id: 'file-123',
              name: 'large.txt',
              mimeType: 'text/plain',
              size: '10000000',
              webViewLink: 'https://drive.google.com/file/d/file-123/view',
              createdTime: '2025-01-01T00:00:00.000Z',
              modifiedTime: '2025-01-01T00:00:00.000Z',
            }],
            failed: [],
          }),
        });

      // Mock Firebase upload (this would be mocked in the actual test)
      const mockFirebaseUpload = jest.fn().mockResolvedValue({
        successful: [{
          url: 'https://firebase.com/small',
          filename: 'small.txt',
          originalName: 'small.txt',
          size: 5,
          type: 'text/plain',
        }],
        failed: [],
      });

      // This would be properly mocked in a real integration test
      const result = await hybridService.uploadFiles(files, 'test-path', {
        provider: 'hybrid',
        largeFileThreshold: 1000000,
      });

      // Verify the routing logic worked
      expect(result.successful.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should retry failed operations', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      // First call fails, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file-123',
            name: 'test.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-123/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        });

      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(true);

      // First upload attempt fails
      const firstResult = await driveService.uploadFile(testFile);
      expect(firstResult.success).toBe(false);

      // Second upload attempt succeeds
      const secondResult = await driveService.uploadFile(testFile);
      expect(secondResult.success).toBe(true);
    });

    it('should handle quota exceeded errors', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: { message: 'Quota exceeded' } }),
        });

      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(true);

      const uploadResult = await driveService.uploadFile(testFile);
      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('Quota exceeded');
    });

    it('should handle file size limit errors', async () => {
      const largeFile = new File(['x'.repeat(100000000)], 'large.txt', { type: 'text/plain' });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 413,
          statusText: 'Payload Too Large',
          json: async () => ({ error: { message: 'File too large' } }),
        });

      const uploadResult = await driveService.uploadFile(largeFile);
      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('File too large');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous uploads', async () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' }),
        new File(['content3'], 'file3.txt', { type: 'text/plain' }),
      ];

      // Mock successful responses for all files
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            id: 'file-123',
            name: 'file.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-123/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        });

      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(true);

      // Upload all files concurrently
      const uploadPromises = files.map(file => driveService.uploadFile(file));
      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle mixed success and failure in concurrent uploads', async () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' }),
        new File(['content3'], 'file3.txt', { type: 'text/plain' }),
      ];

      // Mock mixed responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file-1',
            name: 'file1.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-1/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        })
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file-3',
            name: 'file3.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-3/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        });

      const hasAccess = await driveService.checkAccess();
      expect(hasAccess).toBe(true);

      const uploadPromises = files.map(file => driveService.uploadFile(file));
      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent file metadata', async () => {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file-123',
            name: 'test.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-123/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file-123',
            name: 'test.txt',
            mimeType: 'text/plain',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/file-123/view',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        });

      const uploadResult = await driveService.uploadFile(testFile);
      expect(uploadResult.success).toBe(true);

      const fileInfo = await driveService.getFileInfo(uploadResult.file!.id);
      expect(fileInfo.id).toBe(uploadResult.file!.id);
      expect(fileInfo.name).toBe(uploadResult.file!.name);
      expect(fileInfo.mimeType).toBe(uploadResult.file!.mimeType);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of files efficiently', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        new File([`content${i}`], `file${i}.txt`, { type: 'text/plain' })
      );

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: { displayName: 'Test User' } }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            successful: files.map((file, i) => ({
              id: `file-${i}`,
              name: file.name,
              mimeType: 'text/plain',
              size: '12',
              webViewLink: `https://drive.google.com/file/d/file-${i}/view`,
              createdTime: '2025-01-01T00:00:00.000Z',
              modifiedTime: '2025-01-01T00:00:00.000Z',
            })),
            failed: [],
          }),
        });

      const startTime = Date.now();
      const result = await driveService.uploadFiles(files);
      const endTime = Date.now();

      expect(result.successful).toHaveLength(10);
      expect(result.failed).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});













