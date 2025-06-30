import { Camera, CameraType } from 'expo-camera';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

export interface CameraPermissions {
  camera: boolean;
  mediaLibrary: boolean;
}

export class CameraService {
  private static instance: CameraService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  async requestPermissions(): Promise<CameraPermissions> {
    const [cameraPermission, mediaLibraryPermission] = await Promise.all([
      Camera.requestCameraPermissionsAsync(),
      MediaLibrary.requestPermissionsAsync(),
    ]);

    return {
      camera: cameraPermission.status === 'granted',
      mediaLibrary: mediaLibraryPermission.status === 'granted',
    };
  }

  async takePicture(camera: CameraView): Promise<string | null> {
    if (!camera) {
      console.error("Camera instance not provided to takePicture");
      return null;
    }
    try {
      const photo = await camera.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: true,
      });

      if (photo?.uri) {
        // Save to media library if on mobile
        if (Platform.OS !== 'web') {
          if (photo) {
            await MediaLibrary.saveToLibraryAsync(photo.uri);
          }
        }
        return photo.uri;
      }
      return null;
    } catch (error) {
      console.error('Error taking picture:', error);
      throw error;
    }
  }

  async pickImage(): Promise<string | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }
} 
