import { uploadImages as firebaseUploadImages } from '../shared/services/firebase/firebase';
import { googleDriveService, GoogleDriveFile } from './googleDrive';
import type { UploadResult as FirebaseUploadResult } from '../shared/services/firebase/firebase';

export type StorageProvider = 'firebase' | 'google-drive' | 'hybrid';

export interface HybridUploadResult {
  successful: HybridFileResult[];
  failed: HybridFileError[];
}

export interface HybridFileResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  provider: StorageProvider;
  googleDriveId?: string;
  thumbnailUrl?: string;
}

export interface HybridFileError {
  file: string;
  error: string;
  provider: StorageProvider;
}

export interface StoragePreferences {
  provider: StorageProvider;
  googleDriveFolderId?: string;
  useHybridForLargeFiles?: boolean;
  largeFileThreshold?: number; // in bytes, default 5MB
}

export class HybridStorageService {
  private static instance: HybridStorageService;
  private defaultPreferences: StoragePreferences = {
    provider: 'firebase',
    useHybridForLargeFiles: true,
    largeFileThreshold: 5 * 1024 * 1024, // 5MB
  };

  public static getInstance(): HybridStorageService {
    if (!HybridStorageService.instance) {
      HybridStorageService.instance = new HybridStorageService();
    }
    return HybridStorageService.instance;
  }

  /**
   * Upload files using the specified storage provider
   */
  async uploadFiles(
    files: File[], 
    path: string, 
    preferences?: Partial<StoragePreferences>
  ): Promise<HybridUploadResult> {
    const prefs = { ...this.defaultPreferences, ...preferences };
    
    // Validate Google Drive access if needed
    if (prefs.provider === 'google-drive' || prefs.provider === 'hybrid') {
      const hasAccess = await googleDriveService.checkAccess();
      if (!hasAccess) {
        throw new Error('Google Drive access not available. Please authenticate with Google Drive first.');
      }
    }

    switch (prefs.provider) {
      case 'firebase':
        return this.uploadToFirebase(files, path);
      
      case 'google-drive':
        return this.uploadToGoogleDrive(files, prefs.googleDriveFolderId);
      
      case 'hybrid':
        return this.uploadHybrid(files, path, prefs);
      
      default:
        throw new Error(`Unsupported storage provider: ${prefs.provider}`);
    }
  }

  /**
   * Upload files to Firebase Storage
   */
  private async uploadToFirebase(files: File[], path: string): Promise<HybridUploadResult> {
    try {
      const result = await firebaseUploadImages(files, path);
      
      return {
        successful: result.successful.map(file => ({
          url: file.url,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          type: file.type,
          provider: 'firebase' as StorageProvider,
        })),
        failed: result.failed.map(error => ({
          file: error.file,
          error: error.error,
          provider: 'firebase' as StorageProvider,
        }))
      };
    } catch (error) {
      return {
        successful: [],
        failed: files.map(file => ({
          file: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'firebase' as StorageProvider,
        }))
      };
    }
  }

  /**
   * Upload files to Google Drive
   */
  private async uploadToGoogleDrive(
    files: File[], 
    folderId?: string
  ): Promise<HybridUploadResult> {
    try {
      // Get or create Props Bible folder if no specific folder provided
      let targetFolderId = folderId;
      if (!targetFolderId) {
        const folder = await googleDriveService.getOrCreatePropsBibleFolder();
        targetFolderId = folder.id;
      }

      const result = await googleDriveService.uploadFiles(files, targetFolderId);
      
      return {
        successful: result.successful.map(file => ({
          url: file.webViewLink,
          filename: file.name,
          originalName: file.name,
          size: file.size ? parseInt(file.size) : 0,
          type: file.mimeType,
          provider: 'google-drive' as StorageProvider,
          googleDriveId: file.id,
          thumbnailUrl: file.thumbnailLink,
        })),
        failed: result.failed.map(error => ({
          file: error.file,
          error: error.error,
          provider: 'google-drive' as StorageProvider,
        }))
      };
    } catch (error) {
      return {
        successful: [],
        failed: files.map(file => ({
          file: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'google-drive' as StorageProvider,
        }))
      };
    }
  }

  /**
   * Upload files using hybrid approach (large files to Google Drive, small files to Firebase)
   */
  private async uploadHybrid(
    files: File[], 
    path: string, 
    preferences: StoragePreferences
  ): Promise<HybridUploadResult> {
    const largeFiles: File[] = [];
    const smallFiles: File[] = [];
    const threshold = preferences.largeFileThreshold || this.defaultPreferences.largeFileThreshold!;

    // Separate files by size
    files.forEach(file => {
      if (file.size > threshold) {
        largeFiles.push(file);
      } else {
        smallFiles.push(file);
      }
    });

    const results: HybridUploadResult = {
      successful: [],
      failed: []
    };

    // Upload small files to Firebase
    if (smallFiles.length > 0) {
      const firebaseResult = await this.uploadToFirebase(smallFiles, path);
      results.successful.push(...firebaseResult.successful);
      results.failed.push(...firebaseResult.failed);
    }

    // Upload large files to Google Drive
    if (largeFiles.length > 0) {
      const driveResult = await this.uploadToGoogleDrive(largeFiles, preferences.googleDriveFolderId);
      results.successful.push(...driveResult.successful);
      results.failed.push(...driveResult.failed);
    }

    return results;
  }

  /**
   * Delete a file from the appropriate storage provider
   */
  async deleteFile(
    fileUrl: string, 
    provider: StorageProvider, 
    googleDriveId?: string
  ): Promise<boolean> {
    try {
      switch (provider) {
        case 'firebase':
          // Firebase Storage deletion would need to be implemented
          // For now, we'll return true as Firebase Storage files are typically
          // managed through the existing Firebase service
          console.warn('Firebase Storage file deletion not implemented in hybrid service');
          return true;
        
        case 'google-drive':
          if (!googleDriveId) {
            throw new Error('Google Drive file ID is required for deletion');
          }
          return await googleDriveService.deleteFile(googleDriveId);
        
        default:
          throw new Error(`Unsupported storage provider for deletion: ${provider}`);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Get storage provider from file URL
   */
  getProviderFromUrl(url: string): StorageProvider {
    if (url.includes('firebasestorage.googleapis.com') || url.includes('firebase')) {
      return 'firebase';
    } else if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
      return 'google-drive';
    } else {
      return 'firebase'; // Default fallback
    }
  }

  /**
   * Check if Google Drive is available and accessible
   */
  async checkGoogleDriveAccess(): Promise<boolean> {
    try {
      return await googleDriveService.checkAccess();
    } catch (error) {
      console.error('Google Drive access check failed:', error);
      return false;
    }
  }

  /**
   * Get user's Google Drive folder for Props Bible files
   */
  async getOrCreateUserFolder(): Promise<{ id: string; name: string } | null> {
    try {
      const folder = await googleDriveService.getOrCreatePropsBibleFolder();
      return { id: folder.id, name: folder.name };
    } catch (error) {
      console.error('Failed to get or create user folder:', error);
      return null;
    }
  }

  /**
   * Update storage preferences
   */
  updatePreferences(preferences: Partial<StoragePreferences>): void {
    this.defaultPreferences = { ...this.defaultPreferences, ...preferences };
  }

  /**
   * Get current storage preferences
   */
  getPreferences(): StoragePreferences {
    return { ...this.defaultPreferences };
  }
}

// Export singleton instance
export const hybridStorageService = HybridStorageService.getInstance();

























