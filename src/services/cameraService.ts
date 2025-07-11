import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

export interface CameraOptions {
  allowsEditing?: boolean;
  quality?: number;
  allowsMultipleSelection?: boolean;
}

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string | null;
}

export class CameraService {
  static async requestPermissions(): Promise<{
    camera: boolean;
    mediaLibrary: boolean;
  }> {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();

    return {
      camera: cameraPermission.status === 'granted',
      mediaLibrary: mediaLibraryPermission.status === 'granted'
    };
  }

  static async getPermissionStatus(): Promise<{
    camera: ImagePicker.PermissionStatus;
    mediaLibrary: MediaLibrary.PermissionStatus;
  }> {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
    const mediaLibraryPermission = await MediaLibrary.getPermissionsAsync();

    return {
      camera: cameraPermission.status,
      mediaLibrary: mediaLibraryPermission.status
    };
  }

  static async takePhoto(options: CameraOptions = {}): Promise<PhotoResult | null> {
    try {
      const permissions = await this.getPermissionStatus();
      
      if (permissions.camera !== 'granted') {
        const requested = await this.requestPermissions();
        if (!requested.camera) {
          throw new Error('Camera permission is required to take photos');
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        quality: options.quality ?? 0.8,
        allowsMultipleSelection: false, // Camera only supports single photo
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        fileName: asset.fileName
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  static async pickFromGallery(options: CameraOptions = {}): Promise<PhotoResult[]> {
    try {
      const permissions = await this.getPermissionStatus();
      
      if (permissions.mediaLibrary !== 'granted') {
        const requested = await this.requestPermissions();
        if (!requested.mediaLibrary) {
          throw new Error('Media library permission is required to select photos');
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        quality: options.quality ?? 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection ?? false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      return result.assets.map(asset => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        fileName: asset.fileName
      }));
    } catch (error) {
      console.error('Error picking from gallery:', error);
      throw error;
    }
  }

  static async saveToGallery(uri: string): Promise<string> {
    try {
      const permissions = await this.getPermissionStatus();
      
      if (permissions.mediaLibrary !== 'granted') {
        const requested = await this.requestPermissions();
        if (!requested.mediaLibrary) {
          throw new Error('Media library permission is required to save photos');
        }
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      return asset.uri;
    } catch (error) {
      console.error('Error saving to gallery:', error);
      throw error;
    }
  }
} 