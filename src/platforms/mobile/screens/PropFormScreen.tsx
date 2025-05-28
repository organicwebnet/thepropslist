import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { QRScannerScreen } from '../features/qr/QRScannerScreen.tsx';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface PropFormData {
  name: string;
  description: string;
  category: string;
  location: string;
  images: string[];
  qrCode?: string;
}

export function PropFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string }>();

  const [formData, setFormData] = useState<PropFormData>({
    name: '',
    description: '',
    category: '',
    location: '',
    images: [],
  });
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (params.photoUri) {
      console.log('Received photoUri param:', params.photoUri);
      handlePhotoTaken(params.photoUri);
    }
  }, [params.photoUri]);

  const handleSave = async () => {
    try {
      Alert.alert('Success', 'Prop saved successfully');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/props');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save prop');
    }
  };

  const handlePhotoTaken = (uri: string) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, uri],
    }));
  };

  const handleQRScanned = (data: Record<string, any>) => {
    setFormData(prev => ({
      ...prev,
      qrCode: JSON.stringify(data),
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.category && { category: data.category }),
      ...(data.location && { location: data.location }),
    }));
    setShowQRScanner(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (showQRScanner) {
    return (
      <QRScannerScreen
        onScan={handleQRScanned}
        onClose={() => setShowQRScanner(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={name => setFormData(prev => ({ ...prev, name }))}
            placeholder="Enter prop name"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={description => setFormData(prev => ({ ...prev, description }))}
            placeholder="Enter prop description"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            value={formData.category}
            onChangeText={category => setFormData(prev => ({ ...prev, category }))}
            placeholder="Enter prop category"
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={location => setFormData(prev => ({ ...prev, location }))}
            placeholder="Enter prop location"
          />

          <View style={styles.imageSection}>
            <Text style={styles.label}>Images</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/camera')}
            >
              <MaterialIcons name="camera-alt" size={24} color="white" />
              <Text style={styles.buttonText}>Add Photo</Text>
            </TouchableOpacity>

            <View style={styles.imageGrid}>
              {formData.images.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialIcons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.label}>QR Code</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowQRScanner(true)}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="white" />
              <Text style={styles.buttonText}>Scan QR Code</Text>
            </TouchableOpacity>
            {formData.qrCode && (
              <Text style={styles.qrData}>QR Data: {formData.qrCode}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Prop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  imageContainer: {
    width: '33.33%',
    padding: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSection: {
    marginBottom: 16,
  },
  qrData: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 