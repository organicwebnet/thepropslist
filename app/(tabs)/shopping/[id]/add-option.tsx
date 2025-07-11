import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useFirebase } from '../../../../src/platforms/mobile/contexts/FirebaseContext';
import { ShoppingService } from '../../../../src/services/shoppingService';
import { CameraService } from '../../../../src/services/cameraService';
import { ShoppingOption } from '../../../../src/types/shopping';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import * as Location from 'expo-location';

export default function AddOptionScreen() {
  const { service } = useFirebase();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [shoppingService] = useState(() => new ShoppingService(service));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'camera' | 'form'>('camera');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    shopName: '',
    price: '',
    initialComment: '',
    status: 'pending' as const,
  });

  // Get user location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Reset form data when component mounts to ensure clean state
  useEffect(() => {
    setFormData({
      shopName: '',
      price: '',
      initialComment: '',
      status: 'pending' as const,
    });
    setCapturedImages([]);
    setStep('camera');
  }, [id]); // Reset when shopping item ID changes

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to log shop locations.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? `${address[0].street || ''} ${address[0].city || ''} ${address[0].region || ''}`.trim() : undefined,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not get your current location. You can still add the option.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await CameraService.takePhoto({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result) {
        setCapturedImages([result.uri]);
        setStep('form');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Camera Error', 'Failed to take photo. Please check camera permissions.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const results = await CameraService.pickFromGallery({
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (results.length > 0) {
        setCapturedImages([results[0].uri]);
        setStep('form');
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Gallery Error', 'Failed to pick image. Please check gallery permissions.');
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImages([]);
    setStep('camera');
  };

  const handleSubmit = async () => {
    if (!formData.shopName.trim()) {
      Alert.alert('Error', 'Please enter the shop name');
      return;
    }

    if (!formData.price.trim()) {
      Alert.alert('Error', 'Please enter the price');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!id) {
      Alert.alert('Error', 'Shopping item ID not found');
      return;
    }

    setLoading(true);

    try {
      const newOption: Omit<ShoppingOption, 'createdAt' | 'updatedAt'> & {
        shopLocation?: {
          latitude: number;
          longitude: number;
          address?: string;
        };
        addedAt?: string;
      } = {
        price,
        notes: '', // Legacy field
        status: formData.status,
        images: capturedImages,
        shopName: formData.shopName.trim(),
        uploadedBy: 'shopper', // This should be the current user's name/email
        comments: formData.initialComment.trim() ? [{
          id: `comment_${Date.now()}`,
          text: formData.initialComment.trim(),
          author: 'shopper', // This should be the current user's name/email
          timestamp: new Date().toISOString(),
          type: 'shopper' as const,
        }] : [],
        shopLocation: userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          address: userLocation.address,
        } : undefined,
        addedAt: new Date().toISOString(),
      };

      await shoppingService.addOptionToItem(id, newOption);
      
      // Go directly back to the shopping list without showing a modal
      router.back();
    } catch (error) {
      console.error('Error adding option:', error);
      Alert.alert('Error', 'Failed to add option. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'camera') {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Stack.Screen 
            options={{ 
              title: 'Add Option Photo',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: '#fff',
              headerTransparent: true,
              gestureEnabled: true,
              headerLeft: () => (
                <TouchableOpacity 
                  onPress={() => router.back()}
                  style={{ marginLeft: 16 }}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              ),
            }} 
          />

          <View style={[styles.cameraContainer, { marginTop: 100 }]}>
            <View style={styles.cameraInstructions}>
              <Ionicons name="camera" size={64} color="#fff" />
              <Text style={styles.instructionTitle}>Take a Photo</Text>
              <Text style={styles.instructionText}>
                Take a clear photo of the item you found, including the price tag if visible
              </Text>
            </View>

            <View style={styles.cameraButtons}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.cameraButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
              >
                <Ionicons name="images" size={24} color="#fff" />
                <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {userLocation && (
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.locationText}>
                  {userLocation.address || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Stack.Screen 
          options={{ 
            title: 'Add Option Details',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
            headerTransparent: true,
            gestureEnabled: true,
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()}
                style={{ marginLeft: 16 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }} 
        />

        <ScrollView style={[styles.scrollView, { marginTop: 100 }]} showsVerticalScrollIndicator={false}>
          {/* Photo Preview */}
          <View style={styles.section}>
            <View style={styles.photoHeader}>
              <Text style={styles.sectionTitle}>Photo</Text>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleRetakePhoto}
              >
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
            </View>
            {capturedImages[0] && (
              <Image source={{ uri: capturedImages[0] }} style={styles.previewImage} />
            )}
          </View>

          {/* Shop Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. IKEA, B&Q, Local Antique Shop"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.shopName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, shopName: text }))}
            />
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price (£) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.price}
              onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Initial Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              placeholder="Add any comments about this option (quality, availability, etc.)..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.initialComment}
              onChangeText={(text) => setFormData(prev => ({ ...prev, initialComment: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Location Info */}
          {userLocation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shop Location</Text>
              <View style={styles.locationCard}>
                <Ionicons name="location" size={20} color="#4CAF50" />
                <Text style={styles.locationCardText}>
                  {userLocation.address || `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`}
                </Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding Option...' : 'Add Option'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cameraInstructions: {
    alignItems: 'center',
    marginBottom: 48,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  cameraButtons: {
    gap: 16,
    width: '100%',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  locationCardText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 