import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, FlatList, Alert } from 'react-native';

interface LocationPickerModalProps {
  visible: boolean;
  currentLocation?: string;
  onSave: (location: string) => void;
  onCancel: () => void;
  predefinedLocations?: string[];
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  currentLocation = '',
  onSave,
  onCancel,
  predefinedLocations = [
    'Storage Room A',
    'Storage Room B',
    'Backstage Left',
    'Backstage Right',
    'Green Room',
    'Dressing Room 1',
    'Dressing Room 2',
    'On Stage',
    'In Transit',
    'Under Maintenance',
    'Missing',
  ],
}) => {
  const [customLocation, setCustomLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);

  const handleSave = () => {
    const location = customLocation.trim() || selectedLocation;
    if (!location) {
      Alert.alert('Error', 'Please select or enter a location.');
      return;
    }
    onSave(location);
    setCustomLocation('');
    setSelectedLocation('');
  };

  const handleCancel = () => {
    setCustomLocation('');
    setSelectedLocation('');
    onCancel();
  };

  const handlePredefinedSelect = (location: string) => {
    setSelectedLocation(location);
    setCustomLocation('');
  };

  const handleCustomInput = (text: string) => {
    setCustomLocation(text);
    setSelectedLocation('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Update Location</Text>
          
          <Text style={styles.sectionTitle}>Current Location:</Text>
          <Text style={styles.currentLocation}>{currentLocation || 'Not set'}</Text>
          
          <Text style={styles.sectionTitle}>Select from common locations:</Text>
          <FlatList
            data={predefinedLocations}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.locationItem,
                  selectedLocation === item && styles.selectedLocationItem,
                ]}
                onPress={() => handlePredefinedSelect(item)}
              >
                <Text
                  style={[
                    styles.locationText,
                    selectedLocation === item && styles.selectedLocationText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.locationList}
            showsVerticalScrollIndicator={false}
          />
          
          <Text style={styles.sectionTitle}>Or enter custom location:</Text>
          <TextInput
            style={styles.customInput}
            placeholder="Enter custom location..."
            value={customLocation}
            onChangeText={handleCustomInput}
            autoFocus={false}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Update Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  currentLocation: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
    marginBottom: 8,
  },
  locationList: {
    maxHeight: 150,
    marginBottom: 16,
  },
  locationItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedLocationItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLocationText: {
    color: '#007bff',
    fontWeight: '500',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
