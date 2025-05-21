import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Show } from '@/types/index'; // Assuming Show type is available
import { Address } from '@/shared/types/address'; // Correct import for Address
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

interface ShowFormNativeProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Show>; // Partial to allow for incomplete data during dev
  onSubmit: (data: Partial<Show>) => void;
  onCancel?: () => void;
}

// Updated initial state including more fields
const initialNativeFormState: Partial<Show> = {
  name: '',
  description: '',
  isTouringShow: false,
  stageManager: '',
  stageManagerEmail: '',
  stageManagerPhone: '',
  propsSupervisor: '',
  propsSupervisorEmail: '',
  propsSupervisorPhone: '',
  productionCompany: '',
  productionContactName: '',
  productionContactEmail: '',
  productionContactPhone: '',
  imageUrl: '',
  logoImage: undefined, // Default to undefined
  startDate: '', 
  endDate: '',
  status: 'planning', // Default status
  acts: [],
  venues: [],
  contacts: [],
  rehearsalAddresses: [],
  storageAddresses: [],
  collaborators: []
};

// Helper component for form fields
const FormField = ({ label, children, required = false }: { label: string, children: React.ReactNode, required?: boolean }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}{required ? <Text style={styles.requiredAsterisk}> *</Text> : null}</Text>
    {children}
  </View>
);

// Helper function to format Date objects, Timestamps, or string dates
const formatDate = (date: Date | Timestamp | string | null | undefined): string => {
  if (!date) return 'Select Date';
  let dateObj: Date;
  
  // Check if it's a Firestore Timestamp
  if (date instanceof Timestamp) {
     dateObj = date.toDate();
  } else if (typeof date === 'string') {
    // Attempt to parse ISO string or DD-MM-YYYY
    if (date.includes('-') && date.length >= 10) {
       const parts = date.split('-');
       if (parts[0].length === 4) { // Assume YYYY-MM-DD (ISO-like)
          dateObj = new Date(date);
       } else if (parts[2].length === 4) { // Assume DD-MM-YYYY
          dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
       } else {
          return 'Invalid Date';
       }
    } else {
       return 'Invalid Date';
    }
  } else {
     // Assume it's already a Date object
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper function to parse string/Timestamp back to Date or return now
const parseDateString = (dateInput: string | Date | Timestamp | null | undefined): Date => {
   if (dateInput instanceof Date) return dateInput;
   if (dateInput instanceof Timestamp) return dateInput.toDate();
   
   if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length >= 10) {
      const parts = dateInput.split('-');
      let parsedDate: Date;
       if (parts[0].length === 4) { // Assume YYYY-MM-DD (ISO-like)
          parsedDate = new Date(dateInput);
       } else if (parts[2].length === 4) { // Assume DD-MM-YYYY
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
       } else {
          return new Date(); // Fallback
       }
       if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
       }
   }
   return new Date(); // Default to now if parsing fails or input is invalid
};

export default function ShowFormNative({ mode, initialData, onSubmit, onCancel }: ShowFormNativeProps) {
  const [formData, setFormData] = useState<Partial<Show>>(() => {
    // Merge initialData with defaults, ensuring all keys exist
    const merged = { ...initialNativeFormState, ...(initialData || {}) };
    // Ensure arrays exist
    merged.acts = Array.isArray(merged.acts) ? merged.acts : [];
    merged.venues = Array.isArray(merged.venues) ? merged.venues : [];
    merged.contacts = Array.isArray(merged.contacts) ? merged.contacts : [];
    merged.rehearsalAddresses = Array.isArray(merged.rehearsalAddresses) ? merged.rehearsalAddresses : [];
    merged.storageAddresses = Array.isArray(merged.storageAddresses) ? merged.storageAddresses : [];
    merged.collaborators = Array.isArray(merged.collaborators) ? merged.collaborators : [];
    return merged;
  });

   // State for date pickers
   const [startDate, setStartDate] = useState<Date>(() => parseDateString(initialData?.startDate));
   const [endDate, setEndDate] = useState<Date>(() => parseDateString(initialData?.endDate));
   const [showStartDatePicker, setShowStartDatePicker] = useState(false);
   const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    if (initialData) {
       const merged = { ...initialNativeFormState, ...initialData };
        merged.acts = Array.isArray(merged.acts) ? merged.acts : [];
        merged.venues = Array.isArray(merged.venues) ? merged.venues : [];
        merged.contacts = Array.isArray(merged.contacts) ? merged.contacts : [];
        merged.rehearsalAddresses = Array.isArray(merged.rehearsalAddresses) ? merged.rehearsalAddresses : [];
        merged.storageAddresses = Array.isArray(merged.storageAddresses) ? merged.storageAddresses : [];
        merged.collaborators = Array.isArray(merged.collaborators) ? merged.collaborators : [];
       setFormData(merged);
       // Update date states when initialData changes
       setStartDate(parseDateString(merged.startDate));
       setEndDate(parseDateString(merged.endDate));
    } else if (mode === 'create') {
        // Reset to initial state only if creating and no initial data
        setFormData(initialNativeFormState);
        setStartDate(new Date()); // Default to today for create mode
        setEndDate(new Date());
    }
  }, [initialData, mode]);

  const handleInputChange = (name: keyof Show, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Date picker change handlers
  const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios'); // Keep open on iOS until dismissal
    if (selectedDate) {
        setStartDate(selectedDate);
        // Update formData with the formatted string immediately
        handleInputChange('startDate', formatDate(selectedDate)); 
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
        setEndDate(selectedDate);
        handleInputChange('endDate', formatDate(selectedDate));
    }
  };

  const handleSubmit = () => {
    // Basic validation (can be expanded)
    if (!formData.name?.trim()) {
      Alert.alert('Validation Error', 'Show name is required.');
      return;
    }
    // Add more validation as needed...

    // Ensure dates in formData are strings before submitting
    const dataToSubmit = {
        ...formData,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
    };

    onSubmit(dataToSubmit);
  };

  console.log(`Rendering ShowFormNative: showStartDatePicker=${showStartDatePicker}, showEndDatePicker=${showEndDatePicker}`); // Log state on render

  return (
    <View style={styles.formContainer}>
       {/* Basic Show Info */}
      <FormField label="Show Name" required>
        <TextInput
          style={styles.input}
          placeholder="Enter show name"
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>

      <FormField label="Description">
         {/* Placeholder for WysiwygEditor */}
         <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter show description"
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          multiline
          numberOfLines={4}
          placeholderTextColor="#6b7280"
        />
        {/* <Text style={styles.placeholderText}>Rich Text Editor (Coming Soon)</Text> */}
      </FormField>

      <FormField label="Image URL">
        <TextInput
          style={styles.input}
          placeholder="Enter image URL"
          value={formData.imageUrl}
          onChangeText={(value) => handleInputChange('imageUrl', value)}
          keyboardType="url"
          placeholderTextColor="#6b7280"
        />
      </FormField>

      <FormField label="Logo Image">
         {/* Placeholder for Image Upload */}
         <Text style={styles.placeholderText}>Image Upload (Coming Soon)</Text>
      </FormField>

      <FormField label="Is Touring Show?">
        <View style={styles.switchContainer}>
             <Switch
                 trackColor={{ false: "#767577", true: "#81b0ff" }}
                 thumbColor={formData.isTouringShow ? "#007AFF" : "#f4f3f4"}
                 ios_backgroundColor="#3e3e3e"
                 onValueChange={(value) => handleInputChange('isTouringShow', value)}
                 value={formData.isTouringShow}
                 style={styles.switch}
             />
         </View>
      </FormField>

       {/* Personnel */}
       <FormField label="Stage Manager" required>
        <TextInput
          style={styles.input}
          placeholder="Enter stage manager name"
          value={formData.stageManager}
          onChangeText={(value) => handleInputChange('stageManager', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>
      <FormField label="SM Email" required>
        <TextInput
          style={styles.input}
          placeholder="Enter stage manager email"
          value={formData.stageManagerEmail}
          onChangeText={(value) => handleInputChange('stageManagerEmail', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#6b7280"
        />
      </FormField>
       <FormField label="SM Phone">
        <TextInput
          style={styles.input}
          placeholder="Enter stage manager phone"
          value={formData.stageManagerPhone}
          onChangeText={(value) => handleInputChange('stageManagerPhone', value)}
          keyboardType="phone-pad"
          placeholderTextColor="#6b7280"
        />
      </FormField>

      <FormField label="Props Supervisor" required>
        <TextInput
          style={styles.input}
          placeholder="Enter props supervisor name"
          value={formData.propsSupervisor}
          onChangeText={(value) => handleInputChange('propsSupervisor', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>
      <FormField label="Props Email" required>
        <TextInput
          style={styles.input}
          placeholder="Enter props supervisor email"
          value={formData.propsSupervisorEmail}
          onChangeText={(value) => handleInputChange('propsSupervisorEmail', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#6b7280"
        />
      </FormField>
       <FormField label="Props Phone">
        <TextInput
          style={styles.input}
          placeholder="Enter props supervisor phone"
          value={formData.propsSupervisorPhone}
          onChangeText={(value) => handleInputChange('propsSupervisorPhone', value)}
          keyboardType="phone-pad"
          placeholderTextColor="#6b7280"
        />
      </FormField>

      <FormField label="Production Company" required>
        <TextInput
          style={styles.input}
          placeholder="Enter production company name"
          value={formData.productionCompany}
          onChangeText={(value) => handleInputChange('productionCompany', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>
       <FormField label="Prod. Contact Name" required>
        <TextInput
          style={styles.input}
          placeholder="Enter production contact name"
          value={formData.productionContactName}
          onChangeText={(value) => handleInputChange('productionContactName', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>
      <FormField label="Prod. Contact Email" required>
        <TextInput
          style={styles.input}
          placeholder="Enter production contact email"
          value={formData.productionContactEmail}
          onChangeText={(value) => handleInputChange('productionContactEmail', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#6b7280"
        />
      </FormField>
       <FormField label="Prod. Contact Phone">
        <TextInput
          style={styles.input}
          placeholder="Enter production contact phone"
          value={formData.productionContactPhone}
          onChangeText={(value) => handleInputChange('productionContactPhone', value)}
          keyboardType="phone-pad"
          placeholderTextColor="#6b7280"
        />
      </FormField>

       <FormField label="Contacts">
         <Text style={styles.placeholderText}>Contact Management (Coming Soon)</Text>
       </FormField>

      {/* Dates & Status */}
      <FormField label="Start Date">
         <TouchableOpacity 
            onPress={() => {
                console.log('Start Date TouchableOpacity pressed'); // Log press
                setShowStartDatePicker(true);
            }}
            style={styles.dateInputTouchable}
          >
            <Text style={styles.dateInputText}>{formatDate(startDate)}</Text>
         </TouchableOpacity>
          {showStartDatePicker && (
             <DateTimePicker
                 testID="startDatePicker"
                 value={startDate}
                 mode="date"
                 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                 onChange={onStartDateChange}
             />
         )}
      </FormField>
       <FormField label="End Date">
          <TouchableOpacity 
            onPress={() => {
                console.log('End Date TouchableOpacity pressed'); // Log press
                setShowEndDatePicker(true);
            }}
            style={styles.dateInputTouchable}
           >
            <Text style={styles.dateInputText}>{formatDate(endDate)}</Text>
         </TouchableOpacity>
         {showEndDatePicker && (
             <DateTimePicker
                 testID="endDatePicker"
                 value={endDate}
                 mode="date"
                 display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                 onChange={onEndDateChange}
             />
         )}
      </FormField>
      <FormField label="Status">
         <TextInput
           style={styles.input}
           placeholder="planning, active, completed"
           value={formData.status}
           onChangeText={(value) => handleInputChange('status', value)}
           placeholderTextColor="#6b7280"
         />
         {/* <Text style={styles.placeholderText}>Status Picker (Coming Soon)</Text> */}
      </FormField>

       {/* Venues/Locations */}
       {/* <FormField label="Venue">
         <TextInput
           style={styles.input}
           placeholder="Enter primary venue name/details"
           value={formData.venue} // Simple text for now
           onChangeText={(value) => handleInputChange('venue', value)}
           placeholderTextColor="#6b7280"
         />
         <Text style={styles.placeholderText}>Venue Management (Coming Soon)</Text>
       </FormField> */}
       <FormField label="Rehearsal Addresses">
         <Text style={styles.placeholderText}>Address Management (Coming Soon)</Text>
       </FormField>
       <FormField label="Storage Addresses">
         <Text style={styles.placeholderText}>Address Management (Coming Soon)</Text>
       </FormField>

      {/* Acts & Scenes */}
      <FormField label="Acts & Scenes">
         <Text style={styles.placeholderText}>Act/Scene Management (Coming Soon)</Text>
      </FormField>

       {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={mode === 'create' ? 'Create Show' : 'Update Show'}
          onPress={handleSubmit}
          color={Platform.OS === 'ios' ? '#FFFFFF' : '#007AFF'} // iOS uses white text on blue bg
        />
        {onCancel && (
          <View style={styles.cancelButtonContainer}>
            <Button
              title="Cancel"
              onPress={onCancel}
              color={Platform.OS === 'ios' ? '#FFFFFF' : '#FF3B30'} // Red color for cancel
            />
          </View>
        )}
      </View>
    </View>
  );
}

// Styles need significant updates for new fields
const styles = StyleSheet.create({
  formContainer: {
    padding: 16,
    backgroundColor: '#1f2937', // Darker background for form area
    borderRadius: 8,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#d1d5db', // Lighter gray for labels
    marginBottom: 6,
    fontWeight: '500',
  },
  requiredAsterisk: {
     color: '#f87171', // Red asterisk
  },
  input: {
    backgroundColor: '#374151', // Slightly lighter background for inputs
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563', // Border color for inputs
    fontSize: 16,
  },
  textArea: {
      height: 100, // Make text area taller
      textAlignVertical: 'top', // Align text to top for multiline
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align switch to the left
    // height: 40, // Ensure consistent height like TextInput
  },
  switch: {
     // Add specific styles for the switch if needed, e.g., margins
     // marginLeft: 10, // Example if spacing is needed
  },
  placeholderText: {
     color: '#9ca3af', // Gray color for placeholder info
     fontSize: 14,
     fontStyle: 'italic',
     marginTop: 8,
     paddingVertical: 10, // Match input padding
     paddingHorizontal: 12,
     backgroundColor: '#374151',
     borderRadius: 6,
     borderColor: '#4b5563',
     borderWidth: 1,
  },
  buttonContainer: {
    marginTop: 24,
    backgroundColor: Platform.OS === 'ios' ? '#007AFF' : 'transparent', // Blue background for iOS button wrapper
    borderRadius: Platform.OS === 'ios' ? 8 : 0, // Rounded corners for iOS wrapper
  },
  cancelButtonContainer: {
     marginTop: 12,
     backgroundColor: Platform.OS === 'ios' ? '#FF3B30' : 'transparent', // Red background for iOS cancel wrapper
     borderRadius: Platform.OS === 'ios' ? 8 : 0, // Rounded corners for iOS wrapper
  },
  dateInputTouchable: {
      backgroundColor: '#374151',
      paddingHorizontal: 12,
      paddingVertical: 12, // Adjust padding to match text input vertically
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#4b5563',
      justifyContent: 'center',
      minHeight: 44, // Ensure touchable area is large enough
  },
  dateInputText: {
      color: '#FFFFFF',
      fontSize: 16,
  },
  // Remove button styles as react-native Button is used
}); 