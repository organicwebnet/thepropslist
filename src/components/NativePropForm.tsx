import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, SafeAreaView, Platform, Switch, Image, Alert, ActivityIndicator } from 'react-native';
import { type PropFormData, propCategories, type PropSource, type PropCategory } from '../shared/types/props';
import type { Show } from '../types/index';
import { type PropLifecycleStatus, lifecycleStatusLabels } from '../types/lifecycle';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import type { FirebaseStorageTypes } from '@react-native-firebase/storage';

// Utility function to strip HTML tags
const stripHtmlTags = (str: string) => {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '');
};

// Define simplified props for screen usage
interface NativePropFormProps {
  // onSubmit: (data: PropFormData) => void; // Removed
  // onCancel: () => void; // Removed
  initialData?: PropFormData;
  // mode?: 'create' | 'edit'; // Removed
  // show?: Show; // Removed (Show context needs to be handled by parent screen if necessary)
  
  // Add props for screen-based submission and navigation
  onFormSubmit: (data: PropFormData) => Promise<boolean>; // Function to handle actual DB add/update
  submitButtonText: string;
  showAddAnotherButton?: boolean; // Optional flag to show the button
}

export function NativePropForm({
  // onSubmit,
  // onCancel,
  initialData,
  // mode = 'create',
  // show,
  onFormSubmit, // New prop
  submitButtonText, // New prop
  showAddAnotherButton = false, // New prop
}: NativePropFormProps) {
  const router = useRouter(); // Get router instance
  const { service: firebaseService } = useFirebase(); // Get Firebase service
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [act, setAct] = useState(initialData?.act?.toString() || '');
  const [scene, setScene] = useState(initialData?.scene?.toString() || '');
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '1');
  const [price, setPrice] = useState(initialData?.price?.toString() || '0');
  const [category, setCategory] = useState<PropCategory>(initialData?.category || 'Other');
  const [source, setSource] = useState<PropSource>(initialData?.source || 'owned');
  const [status, setStatus] = useState<PropLifecycleStatus>(initialData?.status || 'confirmed');
  const [condition, setCondition] = useState(initialData?.condition || 'New');
  const [location, setLocation] = useState(initialData?.location || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tags, setTags] = useState(initialData?.tags?.join(',') || '');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(initialData?.imageUrl || null);
  const [isConsumable, setIsConsumable] = useState(initialData?.isConsumable || false);
  const [requiresPreShowSetup, setRequiresPreShowSetup] = useState(initialData?.requiresPreShowSetup || false);
  const [isBreakable, setIsBreakable] = useState(initialData?.isBreakable || false);
  const [hasUsageInstructions, setHasUsageInstructions] = useState(initialData?.hasUsageInstructions || false);
  const [hasMaintenanceNotes, setHasMaintenanceNotes] = useState(initialData?.hasMaintenanceNotes || false);
  const [hasSafetyNotes, setHasSafetyNotes] = useState(initialData?.hasSafetyNotes || false);
  const [hasOwnShippingCrate, setHasOwnShippingCrate] = useState(initialData?.hasOwnShippingCrate || false);
  const [requiresSpecialTransport, setRequiresSpecialTransport] = useState(initialData?.requiresSpecialTransport || false);
  const [hasBeenModified, setHasBeenModified] = useState(initialData?.hasBeenModified || false);
  const [statusNotes, setStatusNotes] = useState(initialData?.statusNotes || '');
  const [currentLocation, setCurrentLocation] = useState(initialData?.currentLocation || '');
  const [usageInstructions, setUsageInstructions] = useState(initialData?.usageInstructions || '');
  const [maintenanceNotes, setMaintenanceNotes] = useState(initialData?.maintenanceNotes || '');
  const [safetyNotes, setSafetyNotes] = useState(initialData?.safetyNotes || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [length, setLength] = useState(initialData?.length?.toString() || '');
  const [width, setWidth] = useState(initialData?.width?.toString() || '');
  const [height, setHeight] = useState(initialData?.height?.toString() || '');
  const [weight, setWeight] = useState(initialData?.weight?.toString() || '');
  const [materialsInput, setMaterialsInput] = useState(initialData?.materials?.join(',') || '');
  const [period, setPeriod] = useState(initialData?.period || '');

  // const storage = firebaseService.storage(); // This line is removed, firebaseService.storage() will be used directly where needed

  // --- Clear Form Function --- 
  const clearForm = () => {
    setName(initialData?.name || ''); // Reset to initial if editing, or empty if creating
    setDescription(initialData?.description || '');
    setAct(initialData?.act?.toString() || '');
    setScene(initialData?.scene?.toString() || '');
    setQuantity(initialData?.quantity?.toString() || '1');
    setPrice(initialData?.price?.toString() || '0');
    setCategory(initialData?.category || 'Other');
    setSource(initialData?.source || 'owned');
    setStatus(initialData?.status || 'confirmed');
    setCondition(initialData?.condition || 'New');
    setLocation(initialData?.location || '');
    setStatusNotes(initialData?.statusNotes || '');
    setCurrentLocation(initialData?.currentLocation || '');
    setTags(initialData?.tags?.join(',') || '');
    setSelectedImageUri(initialData?.imageUrl || null);
    setIsConsumable(initialData?.isConsumable || false);
    setRequiresPreShowSetup(initialData?.requiresPreShowSetup || false);
    setIsBreakable(initialData?.isBreakable || false);
    setHasUsageInstructions(initialData?.hasUsageInstructions || false);
    setHasMaintenanceNotes(initialData?.hasMaintenanceNotes || false);
    setHasSafetyNotes(initialData?.hasSafetyNotes || false);
    setHasOwnShippingCrate(initialData?.hasOwnShippingCrate || false);
    setRequiresSpecialTransport(initialData?.requiresSpecialTransport || false);
    setHasBeenModified(initialData?.hasBeenModified || false);
    setUsageInstructions(initialData?.usageInstructions || '');
    setMaintenanceNotes(initialData?.maintenanceNotes || '');
    setSafetyNotes(initialData?.safetyNotes || '');
    setIsUploading(false); // Reset upload status
    setUploadProgress(0);
    setMaterialsInput(initialData?.materials?.join(',') || '');
    setPeriod(initialData?.period || '');
    // Reset any other state added later
  };

  // --- Upload Image Function --- 
  const uploadImage = async (uri: string): Promise<string | null> => {
    if (!firebaseService) {
      Alert.alert("Error", "Firebase service is not available.");
      return null;
    }
    const filename = `props_images/${uuidv4()}-${uri.substring(uri.lastIndexOf('/') + 1)}`;
    const reference = firebaseService.storage.ref(filename);
    
    try {
      const task = reference.putFile(uri);

      task.on('state_changed',
        (taskSnapshot: FirebaseStorageTypes.TaskSnapshot) => {
          const progress = (taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100;
          setUploadProgress(progress);
        });

      await task;
      
      const url = await reference.getDownloadURL();
      setUploadProgress(0); // Reset progress
      return url;
    } catch (error) {
      Alert.alert("Upload Failed", "Could not upload the image. Please try again.");
      setUploadProgress(0); // Reset progress
      return null;
    }
  };
  // --- End Upload Image Function --- 

  // --- Form Submission Logic (Shared by both buttons) ---
  const prepareFormData = async (): Promise<PropFormData | null> => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Prop name is required.');
      return null;
    }

    let finalImageUrl = selectedImageUri;
    if (selectedImageUri && selectedImageUri.startsWith('file://') && selectedImageUri !== initialData?.imageUrl) {
      setIsUploading(true);
      finalImageUrl = await uploadImage(selectedImageUri);
      setIsUploading(false);
      if (!finalImageUrl) {
        return null; // Upload failed
      }
    }
    
    const formData: PropFormData = {
        name: name.trim(),
        description: description.trim(),
        act: parseInt(act, 10) || undefined,
        scene: parseInt(scene, 10) || undefined,
        category: category, 
        quantity: parseInt(quantity, 10) || 1, 
        price: parseFloat(price) || 0, 
        source: source, 
        status: status, 
        condition: condition.trim(), 
        location: location.trim(), 
        statusNotes: statusNotes.trim(),
        currentLocation: currentLocation.trim(),
        tags: tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
        imageUrl: finalImageUrl || '', 
        isConsumable: isConsumable,
        requiresPreShowSetup: requiresPreShowSetup,
        isBreakable: isBreakable,
        hasUsageInstructions: hasUsageInstructions,
        hasMaintenanceNotes: hasMaintenanceNotes,
        hasSafetyNotes: hasSafetyNotes,
        hasOwnShippingCrate: hasOwnShippingCrate,
        requiresSpecialTransport: requiresSpecialTransport,
        hasBeenModified: hasBeenModified,
        usageInstructions: usageInstructions.trim(),
        maintenanceNotes: maintenanceNotes.trim(),
        safetyNotes: safetyNotes.trim(),
        length: parseFloat(length) || undefined,
        width: parseFloat(width) || undefined,
        height: parseFloat(height) || undefined,
        weight: parseFloat(weight) || undefined,
        materials: materialsInput.split(',').map((m: string) => stripHtmlTags(m.trim())).filter((m: string) => m),
        period: stripHtmlTags(period.trim()) || undefined,
    };
    return formData;
  }

  // --- Button Handlers --- 
  const handleSubmitPress = async () => {
    const formData = await prepareFormData();
    if (formData) {
        const success = await onFormSubmit(formData); // Call the passed submit handler
        if (success) {
            router.back(); // Go back to the list on successful submit
        }
    }
  };

  const handleAddAnotherPress = async () => {
    const formData = await prepareFormData();
    if (formData) {
      try {
        const success = await onFormSubmit(formData); // Call the passed submit handler
        if (success) {
            clearForm(); // Clear form after successful submission
            Alert.alert('Success', 'Prop added. Add another or cancel.');
        } // Don't navigate back
      } catch (error) {
        console.error("Add Another Error:", error);
        Alert.alert('Error', 'Could not add prop.');
      }
    }
  };

  const handleCancelPress = () => {
    router.back(); // Use router to navigate back
  };

  // Function to handle image picking
  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant permission to access the photo library.");
      return;
    }

    // Launch image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.title}>{initialData ? 'Edit Prop' : 'Add New Prop'}</Text>
        
        {/* --- 1. Name --- */}
        <Text style={styles.label}>Name<Text style={styles.requiredAsterisk}> *</Text></Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter prop name"
          placeholderTextColor="#9CA3AF"
        />

        {/* --- 2. Image --- */}
        <Text style={styles.label}>Image</Text>
        <View style={styles.imagePickerContainer}>
          {selectedImageUri ? (
            <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}><Text style={styles.imagePlaceholderText}>No Image Selected</Text></View>
          )}
          <Button title="Select Image" onPress={pickImage} />
        </View>
        {isUploading && (
            <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.uploadingText}>Uploading: {uploadProgress}%</Text>
            </View>
        )}

        {/* --- 3. Description --- */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]} 
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description (optional)"
          placeholderTextColor="#9CA3AF"
          multiline={true}
          numberOfLines={4}
        />

        {/* --- 4. Act & Scene --- */}
        <View style={styles.dimensionRow}> 
          <View style={styles.dimensionInputContainer}>
            <Text style={styles.label}>Act (Optional)</Text>
            <TextInput
              style={styles.input}
              value={act}
              onChangeText={setAct}
              placeholder="e.g., 1"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.dimensionInputContainer}>
            <Text style={styles.label}>Scene (Optional)</Text>
            <TextInput
              style={styles.input}
              value={scene}
              onChangeText={setScene}
              placeholder="e.g., 3"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* --- 5. Dimensions & Weight --- */}
        <Text style={styles.sectionTitle}>Dimensions & Weight (Optional)</Text>
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionInputContainer}>
            <Text style={styles.label}>Length</Text>
            <TextInput
              style={styles.input}
              value={length}
              onChangeText={setLength}
              placeholder="e.g., 10.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.dimensionInputContainer}>
            <Text style={styles.label}>Width</Text>
            <TextInput
              style={styles.input}
              value={width}
              onChangeText={setWidth}
              placeholder="e.g., 5"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionInputContainer}>
            <Text style={styles.label}>Height</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="e.g., 2"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
           <View style={styles.dimensionInputContainer}>
            <Text style={styles.label}>Weight</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g., 1.2"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* --- 6. Condition --- */}
        <Text style={styles.label}>Condition<Text style={styles.requiredAsterisk}> *</Text></Text>
        <TextInput
          style={styles.input}
          value={condition}
          onChangeText={setCondition}
          placeholder="e.g., New, Used, Needs Repair"
          placeholderTextColor="#9CA3AF"
        />

        {/* --- 7. Lifecycle Status --- */}
        <Text style={styles.sectionTitle}>Lifecycle Status</Text>

        {/* --- 8. Location --- */}
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.label}>Current Location (if different)</Text>
        <TextInput
          style={styles.input}
          value={currentLocation}
          onChangeText={setCurrentLocation}
          placeholder="e.g., On stage, Rehearsal Room B"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.label}>Storage Location<Text style={styles.requiredAsterisk}> *</Text></Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., Prop Room Shelf A, Backstage Left"
          placeholderTextColor="#9CA3AF"
        />

        {/* --- 9. Source --- */}

        {/* --- 10. Price --- */}
        <Text style={styles.label}>Price</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Category</Text>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue as PropCategory)}
          style={styles.picker}
        >
          {propCategories.map((cat: PropCategory) => <Picker.Item key={cat} label={cat} value={cat} />)}
        </Picker>

        <Text style={styles.label}>Materials (comma-separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Wood, Metal, Plastic"
          value={materialsInput}
          onChangeText={setMaterialsInput}
        />

        <Text style={styles.label}>Historical Period</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Victorian, 1920s, Futuristic"
          value={period}
          onChangeText={setPeriod}
        />

        {/* --- 11. Quantity --- */}
        <Text style={styles.label}>Quantity<Text style={styles.requiredAsterisk}> *</Text></Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />
        
        {/* --- 12. Tags --- */}
        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="e.g., fragile, needs batteries, wood"
          placeholderTextColor="#9CA3AF"
        />

        {/* --- 13. Details & Flags --- */}
        <Text style={styles.sectionTitle}>Details & Flags</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Add Usage Instructions?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={hasUsageInstructions ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setHasUsageInstructions}
            value={hasUsageInstructions}
          />
        </View>
        {hasUsageInstructions && (
          <TextInput
            style={[styles.input, styles.textArea, styles.conditionalInput]}
            value={usageInstructions}
            onChangeText={setUsageInstructions}
            placeholder="Enter usage instructions"
            placeholderTextColor="#9CA3AF"
            multiline={true}
            numberOfLines={4}
          />
        )}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Add Maintenance Notes?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={hasMaintenanceNotes ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setHasMaintenanceNotes}
            value={hasMaintenanceNotes}
          />
        </View>
        {hasMaintenanceNotes && (
          <TextInput
            style={[styles.input, styles.textArea, styles.conditionalInput]}
            value={maintenanceNotes}
            onChangeText={setMaintenanceNotes}
            placeholder="Enter maintenance notes"
            placeholderTextColor="#9CA3AF"
            multiline={true}
            numberOfLines={4}
          />
        )}
         <View style={styles.switchContainer}>
          <Text style={styles.label}>Add Safety Notes?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={hasSafetyNotes ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setHasSafetyNotes}
            value={hasSafetyNotes}
          />
        </View>
        {hasSafetyNotes && (
          <TextInput
            style={[styles.input, styles.textArea, styles.conditionalInput]}
            value={safetyNotes}
            onChangeText={setSafetyNotes}
            placeholder="Enter safety notes"
            placeholderTextColor="#9CA3AF"
            multiline={true}
            numberOfLines={4}
          />
        )}

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Consumable?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isConsumable ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setIsConsumable}
            value={isConsumable}
          />
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Requires Pre-Show Setup?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={requiresPreShowSetup ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setRequiresPreShowSetup}
            value={requiresPreShowSetup}
          />
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Breakable?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isBreakable ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setIsBreakable}
            value={isBreakable}
          />
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Has Dedicated Shipping Crate?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={hasOwnShippingCrate ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setHasOwnShippingCrate}
            value={hasOwnShippingCrate}
          />
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Requires Special Transport?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={requiresSpecialTransport ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setRequiresSpecialTransport}
            value={requiresSpecialTransport}
          />
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Prop Has Been Modified?</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={hasBeenModified ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setHasBeenModified}
            value={hasBeenModified}
          />
        </View>

        {/* --- 14. General Notes --- */}
        <Text style={styles.sectionTitle}>General Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter any other relevant notes (optional)"
          placeholderTextColor="#9CA3AF"
          multiline={true}
          numberOfLines={4}
        />

        {/* --- Buttons --- */}
        <View style={styles.buttonContainer}>
          <Button title="Cancel" onPress={handleCancelPress} color="#EF4444" />
          {showAddAnotherButton && (
            <Button title="Add Another" onPress={handleAddAnotherPress} disabled={isUploading} />
          )}
          <Button 
            title={submitButtonText} 
            onPress={handleSubmitPress} 
            disabled={isUploading} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1F2937', // Dark background
  },
  container: {
    // flex: 1, // Removed
    // padding: 20, // Moved to contentContainerStyle
  },
  scrollContentContainer: { // New style for ScrollView content
    padding: 20,
    flexGrow: 1, // Allow content to grow and enable scrolling
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#D1D5DB',
    marginBottom: 5,
  },
  requiredAsterisk: {
    color: '#EF4444', // Red color for asterisk
    marginLeft: 2, // Space it slightly from the label text
  },
  input: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4B5563',
    height: 50, // Ensure consistent height for inputs/pickers
  },
  pickerContainer: { // Container to style the picker like an input
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4B5563',
    height: 50, // Match input height
    justifyContent: 'center', // Center picker item vertically
  },
  picker: {
    color: '#FFFFFF',
    // height: 50, // Height is controlled by container
  },
  textArea: { // Style for multiline description
    height: 100, 
    textAlignVertical: 'top', // Align text to top for multiline
  },
  conditionalInput: { // Style for inputs that appear conditionally
    marginTop: -5, // Reduce space after switch
    marginBottom: 15, // Keep standard bottom margin
    borderColor: '#5A677A', // Slightly different border to indicate relation
  },
  switchContainer: { // Style for Switch row
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5, // Add some horizontal padding
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
  },
  imagePickerContainer: { // Container for image preview and button
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#555', // Placeholder background
  },
  imagePlaceholder: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  imagePlaceholderText: {
    color: '#9CA3AF',
  },
  sectionTitle: { // Style for section titles
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E5E7EB',
    marginTop: 15,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
    paddingTop: 10,
  },
  dimensionRow: { // Style for side-by-side dimension inputs
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dimensionInputContainer: { // Container for each dimension input+label
    flex: 1, // Take up half the space
    marginHorizontal: 5, // Add some spacing between inputs
  },
  uploadingContainer: { // Style for upload indicator
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  uploadingText: {
    color: '#FFFFFF',
    marginLeft: 10,
  },
}); 
