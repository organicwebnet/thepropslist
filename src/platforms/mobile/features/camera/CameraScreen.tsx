import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export default function CameraScreen() {
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaPermission?.granted) {
        requestMediaPermission();
    }
  }, [mediaPermission, requestMediaPermission]);

  if (!permission) {
    return <View><Text>Loading permissions...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}><Text style={styles.text}>Grant Permission</Text></TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        console.log('Photo taken:', photo);
        
        if (photo?.uri) { 
          setPhotoUri(photo.uri);

          if (mediaPermission?.granted) {
        if (mediaPermission?.granted) {
            const asset = await MediaLibrary.createAssetAsync(photo.uri);
            console.log('Photo saved to library:', asset);
            alert('Photo saved!'); 
        } else {
            console.warn('Media Library permission not granted, photo not saved.');
            alert('Photo taken but not saved (permission denied).');
        }

      } catch (error) {
        console.error('Failed to take picture:', error);
      }
    }
  }

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.button}><Text style={styles.text}>Take Another</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <Text style={styles.text}>Take Picture</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  button: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
}); 