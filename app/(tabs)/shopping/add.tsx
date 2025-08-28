import React, { useState } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ShoppingService } from '../../../src/services/shoppingService';
import { CameraService } from '../../../src/services/cameraService';
import { ShoppingItem } from '../../../src/types/shopping';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../../../src/styles/theme';
import LinearGradient from 'react-native-linear-gradient';

export default function AddShoppingItemScreen() {
  const { service } = useFirebase();
  const { user } = useAuth();
  const { theme: themeName } = useTheme();
  const router = useRouter();
  const currentTheme = themeName === 'dark' ? darkTheme : lightTheme;

  const [shoppingService] = useState(() => new ShoppingService(service));
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<{
    type: 'prop' | 'material' | 'hired';
    description: string;
    quantity: string;
    budget: string;
    note: string;
    labels: string;
    referenceImage: string | null;
  }>({
    type: 'prop',
    description: '',
    quantity: '1',
    budget: '',
    note: '',
    labels: '',
    referenceImage: null,
  });

  const handleTakePhoto = async () => {
    try {
      const result = await CameraService.takePhoto({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result) {
        setFormData(prev => ({ ...prev, referenceImage: result.uri }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please check camera permissions.');
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
        setFormData(prev => ({ ...prev, referenceImage: results[0].uri }));
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to pick image. Please check gallery permissions.');
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, referenceImage: null }));
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!formData.budget.trim()) {
      Alert.alert('Error', 'Please enter a budget');
      return;
    }

    const quantity = parseInt(formData.quantity);
    const budget = parseFloat(formData.budget);

    if (isNaN(quantity) || quantity < 1) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (isNaN(budget) || budget < 0) {
      Alert.alert('Error', 'Please enter a valid budget');
      return;
    }

    setLoading(true);

    try {
      const labels = formData.labels
        .split(',')
        .map(label => label.trim())
        .filter(label => label.length > 0);

      const newItem: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'> = {
        type: formData.type,
        description: formData.description.trim(),
        requestedBy: user?.email || 'Unknown',
        status: 'pending',
        options: [],
        quantity,
        budget,
        referenceImage: formData.referenceImage || undefined,
        note: formData.note.trim() || undefined,
        labels: labels.length > 0 ? labels : undefined,
      };

      await shoppingService.addShoppingItem(newItem);
      
      Alert.alert('Success', 'Shopping item added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error adding shopping item:', error);
      Alert.alert('Error', 'Failed to add shopping item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { key: 'prop', label: 'Prop', icon: 'cube' },
    { key: 'material', label: 'Material', icon: 'build' },
    { key: 'hired', label: 'Hired', icon: 'briefcase' },
  ] as const;

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: 'transparent' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Stack.Screen 
          options={{ 
            title: 'Add Shopping Item',
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
          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>
              Type
            </Text>
            <View style={styles.typeContainer}>
              {typeOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.typeButton,
                    { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' },
                    formData.type === option.key && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: option.key }))}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={24} 
                    color={formData.type === option.key ? '#fff' : 'rgba(255, 255, 255, 0.7)'} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    { color: formData.type === option.key ? '#fff' : 'rgba(255, 255, 255, 0.7)' }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>
              Description *
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)' 
              }]}
              placeholder="What are you looking for?"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Quantity and Budget */}
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={[styles.sectionTitle, { color: '#fff' }]}>
                  Quantity *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)' 
                  }]}
                  placeholder="1"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.sectionTitle, { color: '#fff' }]}>
                  Budget (£) *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)' 
                  }]}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={formData.budget}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, budget: text }))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>
              Note
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)' 
              }]}
              placeholder="Additional notes or requirements..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.note}
              onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Labels */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>
              Labels
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)' 
              }]}
              placeholder="Comma separated (e.g. B&Q, Hardware)"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.labels}
              onChangeText={(text) => setFormData(prev => ({ ...prev, labels: text }))}
            />
          </View>

          {/* Reference Image */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>
              Reference Image
            </Text>
            
            {formData.referenceImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: formData.referenceImage }} style={styles.referenceImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Ionicons name="close-circle" size={24} color="#FF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageActionsContainer}>
                <TouchableOpacity
                  style={[styles.imageActionButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={[styles.imageActionButtonText, { color: '#fff' }]}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.imageActionButton, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}
                  onPress={handlePickFromGallery}
                >
                  <Ionicons name="images" size={24} color="#fff" />
                  <Text style={[styles.imageActionButtonText, { color: '#fff' }]}>
                    From Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              loading && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[styles.submitButtonText, { color: '#fff' }]}>
              {loading ? 'Adding...' : 'Add Shopping Item'}
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  referenceImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  imageActionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageActionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
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
    fontSize: 18,
    fontWeight: '600',
  },
}); 