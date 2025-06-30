import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { globalStyles } from '../../../../styles/globalStyles';

export default function CameraScreen() {
  const router = useRouter();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      if (!mediaPermission?.granted) {
        console.log('Requesting media library permission...');
        await requestMediaPermission();
      }
    })();
  }, [mediaPermission, requestMediaPermission]);

  if (!permission) {
    return <View><Text>Loading camera permissions...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={globalStyles.container}>
        <Text style={globalStyles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={globalStyles.button}>
          <Text style={globalStyles.text}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={[globalStyles.button, globalStyles.cancelButton]}>
          <Text style={globalStyles.text}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();
      console.log('Photo taken:', photo);

      if (photo?.uri) {
        if (!mediaPermission?.granted) {
          console.log('Requesting media library permission before saving...');
          const { granted } = await requestMediaPermission();
          if (!granted) {
            Alert.alert('Permission Required', 'Cannot save photo without Media Library permission.');
            return;
          }
        }
        
        try {
          const asset = await MediaLibrary.createAssetAsync(photo.uri);
          console.log('Photo saved to library:', asset);
          
          router.replace({ 
              pathname: '/props/add',
              params: { photoUri: photo.uri } 
          } as any);

        } catch (saveError) {
            console.error("Error saving photo to Media Library:", saveError);
            Alert.alert('Save Error', 'Could not save photo to library.');
        }
      } else {
        console.warn('Photo taken but URI is missing.');
        Alert.alert('Capture Error', 'Could not get photo data after taking picture.');
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Capture Error', 'An error occurred while taking the picture.');
    }
  }

  return (
    <View style={globalStyles.container}>
      <CameraView style={globalStyles.camera} facing={facing} ref={cameraRef}>
        <View style={globalStyles.buttonContainer}>
          <TouchableOpacity style={[globalStyles.button, globalStyles.cancelButton]} onPress={() => router.back()}>
            <Text style={globalStyles.text}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.button} onPress={toggleCameraFacing}>
            <Text style={globalStyles.text}>Flip Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={globalStyles.button} onPress={takePicture}>
            <Text style={globalStyles.text}>Take Picture</Text>
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
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 50,
    width: 70,
    height: 70,
    marginHorizontal: 10,
  },
  cancelButton: {
     backgroundColor: 'rgba(200, 0, 0, 0.6)',
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
}); 
