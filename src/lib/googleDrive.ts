import { getGoogleAuthToken } from './google';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

export interface UploadResult {
  success: boolean;
  file?: GoogleDriveFile;
  error?: string;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private accessToken: string | null = null;

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await getGoogleAuthToken();
    }
    return this.accessToken;
  }

  private async makeDriveRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.ensureAuthenticated();
    
    const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Drive API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<GoogleDriveFolder> {
    const folderMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] })
    };

    const result = await this.makeDriveRequest('/files', {
      method: 'POST',
      body: JSON.stringify(folderMetadata),
    });

    return {
      id: result.id,
      name: result.name,
      parents: result.parents,
      createdTime: result.createdTime,
      modifiedTime: result.modifiedTime,
    };
  }

  /**
   * Get or create a folder for Props Bible files
   */
  async getOrCreatePropsBibleFolder(): Promise<GoogleDriveFolder> {
    const folderName = 'Props Bible Files';
    
    // First, try to find existing folder
    const searchResult = await this.makeDriveRequest(
      `/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );

    if (searchResult.files && searchResult.files.length > 0) {
      const folder = searchResult.files[0];
      return {
        id: folder.id,
        name: folder.name,
        parents: folder.parents,
        createdTime: folder.createdTime,
        modifiedTime: folder.modifiedTime,
      };
    }

    // Create new folder if not found
    return this.createFolder(folderName);
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    file: File, 
    folderId?: string, 
    customName?: string
  ): Promise<UploadResult> {
    try {
      const token = await this.ensureAuthenticated();
      
      // Create metadata
      const metadata = {
        name: customName || file.name,
        ...(folderId && { parents: [folderId] })
      };

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        file: {
          id: result.id,
          name: result.name,
          mimeType: result.mimeType,
          size: result.size,
          webViewLink: result.webViewLink,
          webContentLink: result.webContentLink,
          thumbnailLink: result.thumbnailLink,
          createdTime: result.createdTime,
          modifiedTime: result.modifiedTime,
          parents: result.parents,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Upload multiple files to Google Drive
   */
  async uploadFiles(
    files: File[], 
    folderId?: string
  ): Promise<{ successful: GoogleDriveFile[]; failed: { file: string; error: string }[] }> {
    const successful: GoogleDriveFile[] = [];
    const failed: { file: string; error: string }[] = [];

    // Process files in parallel (limit to 5 concurrent uploads)
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadFile(file, folderId);
      if (result.success && result.file) {
        successful.push(result.file);
      } else {
        failed.push({
          file: file.name,
          error: result.error || 'Unknown error'
        });
      }
    });

    await Promise.all(uploadPromises);
    return { successful, failed };
  }

  /**
   * Get file information by ID
   */
  async getFileInfo(fileId: string): Promise<GoogleDriveFile> {
    const result = await this.makeDriveRequest(`/files/${fileId}?fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,createdTime,modifiedTime,parents`);
    
    return {
      id: result.id,
      name: result.name,
      mimeType: result.mimeType,
      size: result.size,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      thumbnailLink: result.thumbnailLink,
      createdTime: result.createdTime,
      modifiedTime: result.modifiedTime,
      parents: result.parents,
    };
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.makeDriveRequest(`/files/${fileId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId?: string, pageSize: number = 100): Promise<GoogleDriveFile[]> {
    let query = 'trashed=false';
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const result = await this.makeDriveRequest(
      `/files?q=${encodeURIComponent(query)}&pageSize=${pageSize}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,createdTime,modifiedTime,parents)`
    );

    return result.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      parents: file.parents,
    }));
  }

  /**
   * Create a shareable link for a file
   */
  async createShareableLink(fileId: string, role: 'reader' | 'writer' | 'owner' = 'reader'): Promise<string> {
    // First, make sure the file is shared
    await this.makeDriveRequest(`/files/${fileId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        role,
        type: 'anyone'
      }),
    });

    // Get the file info to return the webViewLink
    const fileInfo = await this.getFileInfo(fileId);
    return fileInfo.webViewLink;
  }

  /**
   * Check if user has Google Drive access
   */
  async checkAccess(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      await this.makeDriveRequest('/about?fields=user');
      return true;
    } catch (error) {
      console.error('Google Drive access check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const googleDriveService = GoogleDriveService.getInstance();









