import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, Platform } from 'react-native';
import { Address } from '../types/address.ts'; // Assuming Address type is in shared/types
import { Picker } from '@react-native-picker/picker';

interface AddressSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddressSelect: (address: Address) => void;
  // TODO: Add props for saved addresses (user & show-specific), and a way to save new addresses
  // userSavedAddresses?: Address[];
  // showRehearsalAddresses?: Address[];
  // showStorageAddresses?: Address[];
  // showVenueAddress?: Address; // A show might have one primary venue address
  // onSaveNewAddress?: (address: Address, type: 'user' | 'showRehearsal' | 'showStorage' | 'showVenue') => Promise<void>;
}

const defaultNewAddress: Address = {
  id: '',
  name: '',
  companyName: '',
  street1: '',
  street2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'United Kingdom', // Default
  nickname: '',
};

export const AddressSelectionModal: React.FC<AddressSelectionModalProps> = ({
  isVisible,
  onClose,
  onAddressSelect,
  // Placeholder for props that would bring in saved addresses:
  // userSavedAddresses = [], 
  // showAddresses = [], // Combined show addresses for simplicity here
}) => {
  // Combine address sources (TEMPORARY - needs real data from props)
  const allSavedAddresses: Address[] = []; 
  const hasSavedAddresses = allSavedAddresses.length > 0;

  const [selectedAddressType, setSelectedAddressType] = useState<'saved' | 'new'>(hasSavedAddresses ? 'saved' : 'new'); // Default to 'new' if no saved addresses
  const [newAddress, setNewAddress] = useState<Address>(defaultNewAddress);
  const [saveToProfile, setSaveToProfile] = useState(false);
  // TODO: Add state for selected saved address ID
  // const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);

  // Combine address sources for simplified checking/display (requires props)
  // const allSavedAddresses = [...userSavedAddresses, ...showAddresses];

  const handleSelectAndClose = (address: Address) => {
    onAddressSelect(address);
    onClose(); // Close modal after selection
  };

  const handleSaveNewAddress = () => {
    // TODO: Implement saving logic, potentially calling onSaveNewAddress prop
    // For now, just select it
    // Optionally validate newAddress here
    const addressToSave: Address = {
        ...newAddress,
        id: newAddress.id || `new-${Date.now()}` // ensure an ID
    }
    handleSelectAndClose(addressToSave);
    setNewAddress(defaultNewAddress); // Reset form
    setSaveToProfile(false);
  };

  const renderNewAddressForm = () => (
    <View style={styles.formContainer}>
      {/* Top row for "Save Address As" and "Save to profile" switch */}
      <View style={styles.topFormRow}>
        <View style={styles.inputGroupSaveAs}> 
          <Text style={styles.labelSaveAs}>Save Address As:</Text>
          <TextInput
            style={styles.input}
            value={newAddress.nickname || ''}
            onChangeText={(text) => setNewAddress(prev => ({ ...prev, nickname: text }))}
            placeholder="e.g., Home, Work, Venue X"
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.switchContainerTopRow}>
          <Switch value={saveToProfile} onValueChange={setSaveToProfile} trackColor={{ false: "#767577", true: "#3B82F6"}} thumbColor={saveToProfile ? "#fff" : "#f4f3f4"}/>
          <Text style={styles.labelSwitch} onPress={() => setSaveToProfile(v => !v)}> Save to profile</Text>
        </View>
      </View>

      {/* Loop for other address fields */}
      {(Object.keys(defaultNewAddress) as Array<keyof Address>)
        .filter(key => key !== 'id' && key !== 'nickname') // Exclude id and nickname (already handled)
        .map(key => (
          <View key={key} style={styles.inputGroup}>
            <Text style={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</Text>
            <TextInput
              style={styles.input}
              value={newAddress[key] || ''}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, [key]: text }))}
              placeholder={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              placeholderTextColor="#888"
            />
          </View>
      ))}
      {/* TODO: Add UK Postcode Validation Button here */}
    </View>
  );

  // Updated renderSavedAddresses - no need for the complex empty state now
  const renderSavedAddresses = () => {
    // TODO: Future implementation: Render Picker/List for actual saved addresses
    return (
      <View>
        <Text style={styles.subHeader}>Select Saved Address</Text>
        <Text style={styles.placeholderText}>Saved addresses list will appear here (Not implemented yet).</Text>
        {/* Example Picker structure */}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Address</Text>

          <View style={styles.toggleButtonsContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, selectedAddressType === 'saved' && styles.toggleButtonActive, !hasSavedAddresses && styles.toggleButtonDisabled]} // Added disabled style
              onPress={() => hasSavedAddresses && setSelectedAddressType('saved')} // Only allow press if enabled
              disabled={!hasSavedAddresses} // Disable button
            >
              <Text style={styles.toggleButtonText}>Use Saved</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, selectedAddressType === 'new' && styles.toggleButtonActive]}
              onPress={() => setSelectedAddressType('new')}
            >
              <Text style={styles.toggleButtonText}>Enter New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {selectedAddressType === 'saved' ? renderSavedAddresses() : renderNewAddressForm()}
          </ScrollView>
          
          {/* Action Buttons - Conditionally render based on selectedAddressType */}
          {selectedAddressType === 'new' && (
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={[styles.actionButton, styles.useAddressButton]} onPress={handleSaveNewAddress}>
                    <Text style={styles.actionButtonText}>Use This Address</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.cancelButtonAlt]} onPress={onClose}>
                    <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
          )}
          {selectedAddressType === 'saved' && hasSavedAddresses && (
             // Optional: Add a select button here if using a list instead of auto-select on Picker change
             <TouchableOpacity style={[styles.actionButton, styles.cancelButtonFullWidth]} onPress={onClose}> 
                 <Text style={styles.actionButtonText}>Cancel</Text>
             </TouchableOpacity>
          )}
          {/* If saved tab is selected but disabled, only show Cancel */}
          {selectedAddressType === 'saved' && !hasSavedAddresses && (
             <TouchableOpacity style={[styles.actionButton, styles.cancelButtonFullWidth]} onPress={onClose}> 
                 <Text style={styles.actionButtonText}>Cancel</Text>
             </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
  },
  modalView: {
    margin: 20,
    backgroundColor: 'transparent', 
    borderRadius: 15,
    padding: 20, // Reduced padding
    alignItems: 'center', 
    shadowColor: '#000',
    
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: 'auto', 
    maxWidth: Platform.OS === 'web' ? 800 : '95%', // Increased maxWidth for web
    minWidth: 300, 
    // maxHeight: '85%', // Removed to allow content to define height
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c0c0c0',
    marginTop: 10,
    marginBottom: 15, // Increased margin for separation
    alignSelf: 'flex-start',
  },
  toggleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20, 
    width: '100%', 
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 15, 
    borderRadius: 8,
    backgroundColor: '#444',
    flex: 1, 
    marginHorizontal: 5, 
    alignItems: 'center', 
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6', 
  },
  toggleButtonDisabled: { // Added style for disabled button
    opacity: 0.5,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14, 
  },
  scrollView: {
    width: '100%',
    flexShrink: 1, // Allow scrollview to shrink if content is short
  },
  formContainer: {
    width: '100%', 
    alignItems: 'stretch', 
  },
  topFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
  },
  inputGroupSaveAs: { // For the "Save Address As" field in the top row
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1, // Takes up space
    marginRight: 10, // Space before the switch
  },
  labelSaveAs: {
    fontSize: 14,
    color: '#b0b0b0',
    width: 110, // Specific width for "Save Address As:"
    marginRight: 10, 
  },
  switchContainerTopRow: { // For the switch in the top row
    flexDirection: 'row',
    alignItems: 'center',
    // No specific width, it will take the space its content needs
  },
  labelSwitch: {
    fontSize: 14,
    color: '#b0b0b0',
    marginLeft: 8, // Space after the switch
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',  
    marginBottom: 12,    
    width: '100%', 
  },
  label: {
    fontSize: 14,
    color: '#b0b0b0',
    width: 110, // Standard width for inline labels
    marginRight: 10,      
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10, // Adjusted padding for consistency
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#555',
    flex: 1, 
  },
  // Removed old switchContainer style as it's now split or handled by switchContainerTopRow
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', 
    width: '100%',
    marginTop: 20, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#444',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120, 
    marginHorizontal: 5,
  },
  useAddressButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonAlt: {
    backgroundColor: '#555',
  },
  cancelButtonFullWidth: {
    backgroundColor: '#555', 
    width: '100%', 
    marginTop: 10,
    marginHorizontal: 0, // Override horizontal margin for full width
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14, 
  },
  placeholderText: { 
    color: '#888',
    textAlign: 'center',
    marginVertical: 5, 
    lineHeight: 20, 
  },
  modal: { backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { backgroundColor: 'transparent' },
  button: { backgroundColor: 'transparent' },
});

export default AddressSelectionModal; 