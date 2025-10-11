import { GoogleDriveService, googleDriveService } from '../googleDrive';
import { getGoogleAuthToken } from '../google';

// Mock the Google authentication module
jest.mock('../google', () => ({
  getGoogleAuthToken: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;
  const mockToken = 'mock-access-token';

  beforeEach(() => {
    service = GoogleDriveService.getInstance();
    jest.clearAllMocks();
    (getGoogleAuthToken as jest.Mock).mockResolvedValue(mockToken);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GoogleDriveService.getInstance();
      const instance2 = GoogleDriveService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      const instance = GoogleDriveService.getInstance();
      expect(instance).toBe(googleDriveService);
    });
  });

  describe('Authentication', () => {
    it('should ensure authentication before making requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { displayName: 'Test User' } }),
      });

      await service.checkAccess();

      expect(getGoogleAuthToken).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication failures', async () => {
      (getGoogleAuthToken as jest.Mock).mockRejectedValueOnce(new Error('Auth failed'));

      const result = await service.checkAccess();
      expect(result).toBe(false);
    });
  });

  describe('Folder Management', () => {
    it('should create a folder successfully', async () => {
      const mockResponse = {
        id: 'folder-123',
        name: 'Test Folder',
        mimeType: 'application/vnd.google-apps.folder',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.createFolder('Test Folder');

      expect(result).toEqual({
        id: 'folder-123',
        name: 'Test Folder',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            name: 'Test Folder',
            mimeType: 'application/vnd.google-apps.folder',
          }),
        })
      );
    });

    it('should create a folder with parent ID', async () => {
      const mockResponse = {
        id: 'folder-123',
        name: 'Child Folder',
        parents: ['parent-123'],
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.createFolder('Child Folder', 'parent-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Child Folder',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['parent-123'],
          }),
        })
      );
    });

    it('should get or create Props Bible folder', async () => {
      // First call - folder doesn't exist
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'props-bible-folder',
            name: 'Props Bible Files',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          }),
        });

      const result = await service.getOrCreatePropsBibleFolder();

      expect(result.name).toBe('Props Bible Files');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return existing Props Bible folder if found', async () => {
      const existingFolder = {
        id: 'existing-folder',
        name: 'Props Bible Files',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [existingFolder] }),
      });

      const result = await service.getOrCreatePropsBibleFolder();

      expect(result).toEqual({
        id: 'existing-folder',
        name: 'Props Bible Files',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Upload', () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    it('should upload a file successfully', async () => {
      const mockResponse = {
        id: 'file-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: '12',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
        webContentLink: 'https://drive.google.com/uc?id=file-123',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.file).toEqual({
        id: 'file-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: '12',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
        webContentLink: 'https://drive.google.com/uc?id=file-123',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should upload a file to a specific folder', async () => {
      const mockResponse = {
        id: 'file-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        parents: ['folder-123'],
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.uploadFile(mockFile, 'folder-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should handle upload failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid file' } }),
      });

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed: 400');
    });

    it('should upload multiple files', async () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' }),
      ];

      const mockResponse = {
        id: 'file-123',
        name: 'file1.txt',
        mimeType: 'text/plain',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockResponse, id: 'file-456', name: 'file2.txt' }),
        });

      const result = await service.uploadFiles(files);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('File Management', () => {
    it('should get file information', async () => {
      const mockResponse = {
        id: 'file-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: '12',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getFileInfo('file-123');

      expect(result).toEqual({
        id: 'file-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: '12',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      });
    });

    it('should delete a file successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const result = await service.deleteFile('file-123');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle delete failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.deleteFile('file-123');

      expect(result).toBe(false);
    });

    it('should list files in a folder', async () => {
      const mockResponse = {
        files: [
          {
            id: 'file-1',
            name: 'file1.txt',
            mimeType: 'text/plain',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'file-2',
            name: 'file2.txt',
            mimeType: 'text/plain',
            createdTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: '2025-01-01T00:00:00.000Z',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.listFiles('folder-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('file1.txt');
      expect(result[1].name).toBe('file2.txt');
    });
  });

  describe('Sharing', () => {
    it('should create a shareable link', async () => {
      const mockFileInfo = {
        id: 'file-123',
        name: 'test.txt',
        mimeType: 'text/plain',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
        createdTime: '2025-01-01T00:00:00.000Z',
        modifiedTime: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFileInfo,
        });

      const result = await service.createShareableLink('file-123');

      expect(result).toBe('https://drive.google.com/file/d/file-123/view');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.checkAccess();
      expect(result).toBe(false);
    });

    it('should handle API errors with detailed messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'Insufficient permissions' } }),
      });

      await expect(service.getFileInfo('file-123')).rejects.toThrow(
        'Google Drive API error: 403 - Insufficient permissions'
      );
    });

    it('should handle malformed API responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(service.getFileInfo('file-123')).rejects.toThrow(
        'Google Drive API error: 500 - Internal Server Error'
      );
    });
  });

  describe('Access Control', () => {
    it('should check access successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { displayName: 'Test User' } }),
      });

      const result = await service.checkAccess();
      expect(result).toBe(true);
    });

    it('should return false when access check fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await service.checkAccess();
      expect(result).toBe(false);
    });
  });
});
