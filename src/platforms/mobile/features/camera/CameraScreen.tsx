import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Camera, CameraView, CameraType } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraService, CameraPermissions } from './CameraService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaLibrary } from 'expo-media-library';

interface CameraScreenProps {
  onPhotoTaken: (uri: string) => void;
  onClose: () => void;
}

export function CameraScreen({ onPhotoTaken, onClose }: CameraScreenProps) {
  const [type, setType] = useState<CameraType>(CameraType.back);
  const [permissions, setPermissions] = useState<CameraPermissions | null>(null);
  const [isReady, setIsReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const cameraService = CameraService.getInstance();

  useEffect(() => {
    (async () => {
      const perms = await cameraService.requestPermissions();
      setPermissions(perms);
      setIsReady(true);
    })();
  }, []);

  const toggleCameraType = () => {
    setType((current: CameraType) => (current === CameraType.back ? CameraType.front : CameraType.back));
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const uri = await cameraService.takePicture(cameraRef.current);
      if (uri) {
        onPhotoTaken(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const handlePickImage = async () => {
    try {
      const uri = await cameraService.pickImage();
      if (uri) {
        onPhotoTaken(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  if (!isReady || !permissions) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!permissions.camera) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing={type === CameraType.back ? 'back' : 'front'} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <MaterialIcons name="close" size={32} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleTakePicture}>
            <View style={styles.captureButton} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
            <MaterialIcons name="flip-camera-ios" size={32} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
          <MaterialIcons name="photo-library" size={32} color="white" />
        </TouchableOpacity>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    width: '100%',
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  galleryButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 