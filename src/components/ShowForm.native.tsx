import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { default as DateTimePicker, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Show, Act, Scene, Venue, Contact, ShowCollaborator } from '../types/index.ts';
import { Address } from '../shared/types/address.ts';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import { PlusCircle, MinusCircle } from 'lucide-react-native'; // Import icons

interface ShowFormNativeProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Show>; // Partial to allow for incomplete data during dev
  onSubmit: (data: Partial<Show> & { _logoImageUri?: string | null }) => void;
  onCancel?: () => void;
}

// Updated initial state including more fields
const initialNativeFormState: Partial<Show> = {
  name: '',
  description: '',
  acts: [{ id: '1', name: '', scenes: [{ id: '1', name: '' }] }], // Initialize with one act and scene
  venues: [{ id: String(Math.random()), name: '', address: { id: '', name: '', street1: '', city: '', postalCode: '', country: 'United Kingdom', region: '' } }], // Initialize with one venue
  contacts: [{ name: '', role: '' }], // Initialize with one contact
  rehearsalAddresses: [{ id: String(Math.random()), name: '', street1: '', city: '', postalCode: '', country: 'United Kingdom', region: '' }],
  storageAddresses: [{ id: String(Math.random()), name: '', street1: '', city: '', postalCode: '', country: 'United Kingdom', region: '' }],
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
  collaborators: []
};

const defaultAddress: Address = {
  id: '',
  name: '', // Can be used for venue name if address is standalone
  companyName: '',
  street1: '',
  street2: '',
  city: '',
  region: '', // Or state/province
  postalCode: '',
  country: 'United Kingdom', // Default country or make it selectable
  nickname: '', // e.g., "Main Rehearsal Hall"
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
    // Ensure arrays exist and have at least one item for acts
    merged.acts = (Array.isArray(merged.acts) && merged.acts.length > 0) ? merged.acts.map(act => ({
      ...act,
      id: act.id || String(Math.random()), // Ensure act has an ID
      scenes: (Array.isArray(act.scenes) && act.scenes.length > 0) ? act.scenes.map(scene => ({
        ...scene,
        id: scene.id || String(Math.random()) // Ensure scene has an ID
      })) : [{ id: String(Math.random()), name: '' }]
    })) : [{ id: String(Math.random()), name: '', scenes: [{ id: String(Math.random()), name: '' }] }];
    
    merged.venues = (Array.isArray(merged.venues) && merged.venues.length > 0) 
      ? merged.venues.map(venue => ({
          ...venue,
          id: venue.id || String(Math.random()),
          address: venue.address ? { ...defaultAddress, ...venue.address } : { ...defaultAddress },
          startDate: venue.startDate ? formatDate(parseDateString(venue.startDate)) : '',
          endDate: venue.endDate ? formatDate(parseDateString(venue.endDate)) : '',
          notes: venue.notes || ''
        })) 
      : [{ id: String(Math.random()), name: '', address: { ...defaultAddress }, startDate: '', endDate: '', notes: '' }];
      
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

   // State for Venue Date Pickers
   const [venueDatePickerVisible, setVenueDatePickerVisible] = useState<{ index: number; field: 'startDate' | 'endDate' } | null>(null);
   const [currentVenueDateValue, setCurrentVenueDateValue] = useState<Date>(new Date());

   // State for Logo Image
   const [selectedLogoUri, setSelectedLogoUri] = useState<string | null>(initialData?.logoImage?.url || null);
   const [isUploadingLogo, setIsUploadingLogo] = useState(false); // Keep for potential future direct upload

   // State for new collaborator input
   const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
   const [newCollaboratorRole, setNewCollaboratorRole] = useState<'viewer' | 'editor'>('viewer');

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
       setSelectedLogoUri(merged.logoImage?.url || null); // Get URL from logoImage object
    } else if (mode === 'create') {
        // Reset to initial state only if creating and no initial data
        setFormData(initialNativeFormState);
        setStartDate(new Date()); // Default to today for create mode
        setEndDate(new Date());
        setSelectedLogoUri(null); // Reset logo URI for create mode
    }
  }, [initialData, mode]);

  const handleInputChange = (name: keyof Show, value: string | boolean | null) => {
    setFormData((prev: Partial<Show>) => ({ ...prev, [name]: value }));
  };

  const handleActChange = (actIndex: number, field: keyof Act, value: string) => {
    setFormData((prevData) => {
      const updatedActs = [...(prevData.acts || [])];
      if (updatedActs[actIndex]) {
        updatedActs[actIndex] = { ...updatedActs[actIndex], [field]: value };
      }
      return { ...prevData, acts: updatedActs };
    });
  };

  const handleSceneChange = (actIndex: number, sceneIndex: number, field: keyof Scene, value: string) => {
    setFormData((prevData) => {
      const updatedActs = [...(prevData.acts || [])];
      if (updatedActs[actIndex] && updatedActs[actIndex].scenes && updatedActs[actIndex].scenes[sceneIndex]) {
        updatedActs[actIndex].scenes[sceneIndex] = { ...updatedActs[actIndex].scenes[sceneIndex], [field]: value };
      }
      return { ...prevData, acts: updatedActs };
    });
  };

  const addAct = () => {
    setFormData((prevData) => ({
      ...prevData,
      acts: [...(prevData.acts || []), { id: String(Date.now()), name: '', scenes: [{ id: String(Date.now() + 1), name: '' }] }]
    }));
  };

  const removeAct = (actIndex: number) => {
    setFormData((prevData) => {
      if (!prevData.acts || prevData.acts.length <= 1) {
        Alert.alert("Cannot Remove", "A show must have at least one act.");
        return prevData;
      }
      return {
        ...prevData,
        acts: (prevData.acts || []).filter((_, i) => i !== actIndex)
      };
    });
  };

  const addScene = (actIndex: number) => {
    setFormData((prevData) => {
      const updatedActs = [...(prevData.acts || [])];
      if (updatedActs[actIndex]) {
        if (!updatedActs[actIndex].scenes) {
          updatedActs[actIndex].scenes = [];
        }
        updatedActs[actIndex].scenes.push({ id: String(Date.now()), name: '' });
      }
      return { ...prevData, acts: updatedActs };
    });
  };

  const removeScene = (actIndex: number, sceneIndex: number) => {
    setFormData((prevData) => {
      const updatedActs = [...(prevData.acts || [])];
      if (updatedActs[actIndex] && updatedActs[actIndex].scenes) {
        if (updatedActs[actIndex].scenes.length <= 1) {
          Alert.alert("Cannot Remove", "An act must have at least one scene.");
          return prevData;
        }
        updatedActs[actIndex].scenes = updatedActs[actIndex].scenes.filter((_, i) => i !== sceneIndex);
      }
      return { ...prevData, acts: updatedActs };
    });
  };

  const handleVenueChange = (venueIndex: number, field: keyof Venue | `address.${keyof Address}`, value: string) => {
    setFormData(prevData => {
      const updatedVenues = [...(prevData.venues || [])];
      if (updatedVenues[venueIndex]) {
        const currentVenue = { ...updatedVenues[venueIndex], address: updatedVenues[venueIndex].address || { ...defaultAddress } };
        if (field.startsWith('address.')) {
          const addressField = field.split('.')[1] as keyof Address;
          currentVenue.address = { ...currentVenue.address, [addressField]: value };
        } else {
          // Ensure that 'startDate' and 'endDate' are correctly typed when updating
          if (field === 'startDate' || field === 'endDate') {
            (currentVenue as any)[field] = value; // Keep as string from date picker for now
          } else {
            (currentVenue as any)[field] = value;
          }
        }
        updatedVenues[venueIndex] = currentVenue;
      }
      return { ...prevData, venues: updatedVenues };
    });
  };

  const addVenue = () => {
    setFormData(prevData => ({
      ...prevData,
      venues: [...(prevData.venues || []), { id: String(Date.now()), name: '', address: { ...defaultAddress }, startDate: '', endDate: '', notes: '' }]
    }));
  };

  const removeVenue = (venueIndex: number) => {
    setFormData(prevData => {
      const currentVenues = prevData.venues ?? [];
      if (currentVenues.length <= 1) {
        if (!formData.isTouringShow) {
          Alert.alert("Cannot Remove", "A non-touring show must have at least one venue.");
          return prevData;
        }
         // Allow removing the last venue if it's a touring show and it's empty (or becomes empty)
         if (currentVenues.length === 1 && !formData.isTouringShow) return prevData;
      }
      return {
        ...prevData,
        venues: currentVenues.filter((_, i) => i !== venueIndex)
      };
    });
  };

  const handleContactChange = (contactIndex: number, field: keyof Contact, value: string) => {
    setFormData(prevData => {
      const updatedContacts = [...(prevData.contacts || [])];
      if (updatedContacts[contactIndex]) {
        updatedContacts[contactIndex] = { ...updatedContacts[contactIndex], [field]: value };
      }
      return { ...prevData, contacts: updatedContacts };
    });
  };

  const addContact = () => {
    setFormData(prevData => ({
      ...prevData,
      contacts: [...(prevData.contacts || []), { id: String(Date.now()), name: '', role: '' }]
    }));
  };

  const removeContact = (contactIndex: number) => {
    setFormData(prevData => ({
      ...prevData,
      contacts: (prevData.contacts || []).filter((_, i) => i !== contactIndex)
    }));
  };

  const handleAddressListChange = (
    listName: 'rehearsalAddresses' | 'storageAddresses',
    addressIndex: number, 
    field: keyof Address, 
    value: string
  ) => {
    setFormData(prevData => {
      const list = prevData[listName] || [];
      const updatedAddresses = [...list];
      if (updatedAddresses[addressIndex]) {
        updatedAddresses[addressIndex] = { ...updatedAddresses[addressIndex], [field]: value };
      }
      return { ...prevData, [listName]: updatedAddresses };
    });
  };

  const addAddressToList = (listName: 'rehearsalAddresses' | 'storageAddresses') => {
    setFormData(prevData => {
      const list = prevData[listName] || [];
      return {
        ...prevData,
        [listName]: [...list, { ...defaultAddress, id: String(Date.now()) }]
      };
    });
  };

  const removeAddressFromList = (listName: 'rehearsalAddresses' | 'storageAddresses', addressIndex: number) => {
    setFormData(prevData => {
      const list = prevData[listName] || [];
      return {
        ...prevData,
        [listName]: list.filter((_, i) => i !== addressIndex)
      };
    });
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

  // Venue Date picker change handler
  const onVenueDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const visiblePickerInfo = venueDatePickerVisible;
    // Hide picker: on iOS, this might be handled by a dismiss button, for Android it's immediate after selection.
    // For simplicity, we'll hide it. If iOS needs manual dismissal, this might need adjustment or a confirm button.
    setVenueDatePickerVisible(null); 

    if (selectedDate && visiblePickerInfo) {
        handleVenueChange(visiblePickerInfo.index, visiblePickerInfo.field, formatDate(selectedDate));
    }
  };

  // Collaborator Handlers
  const handleAddCollaborator = () => {
    if (!newCollaboratorEmail.trim()) {
      Alert.alert("Validation Error", "Collaborator email cannot be empty.");
      return;
    }
    // Basic email validation (can be improved)
    if (!/\S+@\S+\.\S+/.test(newCollaboratorEmail)) {
        Alert.alert("Validation Error", "Please enter a valid email address.");
        return;
    }

    setFormData(prevData => {
      const existingCollaborators = prevData.collaborators || [];
      if (existingCollaborators.some(c => c.email.toLowerCase() === newCollaboratorEmail.toLowerCase())) {
        Alert.alert("Error", "This collaborator has already been added.");
        return prevData;
      }
      const newCollaborator: ShowCollaborator = {
        email: newCollaboratorEmail,
        role: newCollaboratorRole,
        // addedAt and addedBy will be set server-side or by a higher-order function
        addedAt: new Date().toISOString(), // Placeholder, should be handled by submission logic
        addedBy: 'current-user-placeholder', // Placeholder
      };
      return {
        ...prevData,
        collaborators: [...existingCollaborators, newCollaborator]
      };
    });
    setNewCollaboratorEmail('');
    setNewCollaboratorRole('viewer'); // Reset to default
  };

  const handleRemoveCollaborator = (emailToRemove: string) => {
    setFormData(prevData => ({
      ...prevData,
      collaborators: (prevData.collaborators || []).filter(c => c.email !== emailToRemove)
    }));
  };

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for logos
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedLogoUri(result.assets[0].uri);
    }
  };

  const handleRemoveLogo = () => {
    setSelectedLogoUri(null);
  };

  const handleSubmit = () => {
    // Basic validation (can be expanded)
    if (!formData.name?.trim()) {
      Alert.alert('Validation Error', 'Show name is required.');
      return;
    }
    // Add more validation as needed...

    const dataToSubmit: Partial<Show> & { _logoImageUri?: string | null } = {
        ...formData,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        // logoImage object will be constructed by parent if _logoImageUri is new
        // If selectedLogoUri is null, it means remove existing or don't add new.
        // If selectedLogoUri is same as initialData.logoImage.url, no change to URI.
    };

    // If a new logo URI is selected (or an existing one is kept), pass it.
    // If logo was removed (selectedLogoUri is null), _logoImageUri will be null.
    // If no logo was ever selected and none existed, it will be undefined.
    if (selectedLogoUri !== (initialData?.logoImage?.url || null) || (selectedLogoUri === null && initialData?.logoImage)) {
        dataToSubmit._logoImageUri = selectedLogoUri; 
    } else if (!selectedLogoUri && !initialData?.logoImage) {
        // Explicitly pass null if no logo is selected and none existed, to differentiate from not touching it
        dataToSubmit._logoImageUri = null; 
    }
    // If selectedLogoUri is the same as the initial one, _logoImageUri won't be set,
    // implying no change to the logo from the form's perspective for URI handling.
    // The existing formData.logoImage (which is the object) will be passed.

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
         <Text style={styles.placeholderText}>Rich Text Editor (Coming Soon)</Text>
      </FormField>

      <FormField label="Image URL (Optional Poster/Banner)">
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
        <TouchableOpacity onPress={handlePickLogo} style={styles.imagePickerButton}>
          <Text style={styles.imagePickerButtonText}>{selectedLogoUri ? 'Change Logo' : 'Select Logo'}</Text>
        </TouchableOpacity>
        {selectedLogoUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedLogoUri }} style={styles.logoPreview} />
            <TouchableOpacity onPress={handleRemoveLogo} style={styles.removeImageButton}>
              <Text style={styles.removeImageButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        {!selectedLogoUri && mode === 'edit' && initialData?.logoImage?.url && (
          <Text style={styles.placeholderText}>Current logo will be kept unless a new one is selected.</Text>
        )}
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

      {/* Contacts Section */}
      <FormField label="Other Key Contacts">
        {(formData.contacts || []).map((contact, contactIndex) => (
          <View key={contact.id || contactIndex} style={styles.contactContainer}>
            <View style={styles.contactHeader}>
              <Text style={styles.subLabel}>Contact {contactIndex + 1}</Text>
              <TouchableOpacity onPress={() => removeContact(contactIndex)} style={styles.removeButton}>
                <MinusCircle size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Contact Name"
              value={contact.name}
              onChangeText={(value) => handleContactChange(contactIndex, 'name', value)}
              placeholderTextColor="#6b7280"
            />
            <TextInput
              style={styles.input}
              placeholder="Role"
              value={contact.role}
              onChangeText={(value) => handleContactChange(contactIndex, 'role', value)}
              placeholderTextColor="#6b7280"
            />
            <TextInput
              style={styles.input}
              placeholder="Email (Optional)"
              value={contact.email}
              onChangeText={(value) => handleContactChange(contactIndex, 'email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#6b7280"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (Optional)"
              value={contact.phone}
              onChangeText={(value) => handleContactChange(contactIndex, 'phone', value)}
              keyboardType="phone-pad"
              placeholderTextColor="#6b7280"
            />
          </View>
        ))}
        <TouchableOpacity onPress={addContact} style={styles.addButton}>
          <PlusCircle size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Contact</Text>
        </TouchableOpacity>
      </FormField>

      {/* Collaborators Section */}
      <FormField label="Collaborators">
        {(formData.collaborators || []).map((collaborator, index) => (
          <View key={index} style={styles.collaboratorItemContainer}>
            <View style={styles.collaboratorInfoContainer}>
                <Text style={styles.collaboratorText}>{collaborator.email}</Text>
                <Text style={styles.collaboratorRoleText}>({collaborator.role})</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemoveCollaborator(collaborator.email)} style={styles.removeButtonSmall}>
              <MinusCircle size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Collaborator Email"
          value={newCollaboratorEmail}
          onChangeText={setNewCollaboratorEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#6b7280"
        />
        <View style={styles.roleSelectorContainer}> 
            <Text style={styles.subLabel}>Role: </Text>
            <TouchableOpacity 
                style={[styles.roleButton, newCollaboratorRole === 'viewer' && styles.roleButtonSelected]}
                onPress={() => setNewCollaboratorRole('viewer')}
            >
                <Text style={styles.roleButtonText}>Viewer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.roleButton, newCollaboratorRole === 'editor' && styles.roleButtonSelected]}
                onPress={() => setNewCollaboratorRole('editor')}
            >
                <Text style={styles.roleButtonText}>Editor</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleAddCollaborator} style={styles.addButtonSmallMargin}>
          <PlusCircle size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Collaborator</Text>
        </TouchableOpacity>
      </FormField>

      {/* Dates & Status */}
      <FormField label="Start Date">
        <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePickerButton}>
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker
            testID="startDatePicker"
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
          />
        )}
      </FormField>

      <FormField label="End Date">
        <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.datePickerButton}>
          <Text style={styles.dateText}>{formatDate(endDate)}</Text>
        </TouchableOpacity>
        {showEndDatePicker && (
          <DateTimePicker
            testID="endDatePicker"
            value={endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
          />
        )}
      </FormField>

      <FormField label="Status">
         <Text style={styles.placeholderText}>Status Picker (Coming Soon)</Text>
      </FormField>

       {/* Venues/Locations */}
       <FormField label="Venues">
        {(!formData.isTouringShow && formData.venues && formData.venues.length > 0 ? [formData.venues[0]] : formData.venues || []).map((venue, venueIndex) => (
          <View key={venue.id || venueIndex} style={styles.venueContainer}>
            <View style={styles.venueHeader}>
              <TextInput
                style={[styles.input, styles.venueNameInput]}
                placeholder={formData.isTouringShow ? `Venue ${venueIndex + 1} Name` : "Primary Venue Name"}
                value={venue.name}
                onChangeText={(value) => handleVenueChange(venueIndex, 'name', value)}
                placeholderTextColor="#6b7280"
              />
              {(formData.isTouringShow && (formData.venues || []).length > 0) && // Show remove only if touring and has venues
                <TouchableOpacity onPress={() => removeVenue(venueIndex)} style={styles.removeButton}>
                  <MinusCircle size={20} color="#FF3B30" />
                </TouchableOpacity>
              }
            </View>
            
            {/* Address Fields */}
            <Text style={styles.subLabel}>Address</Text>
            {(Object.keys(defaultAddress) as Array<keyof Address>)
              .filter(key => key !== 'id' && key !== 'companyName' && key !== 'nickname' && key !== 'name') // Exclude fields not typically for venue address block
              .map((addressKey) => (
                <TextInput
                  key={addressKey}
                  style={styles.input}
                  placeholder={`${addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}`}
                  value={venue.address?.[addressKey] || ''}
                  onChangeText={(value) => handleVenueChange(venueIndex, `address.${addressKey}`, value)}
                  placeholderTextColor="#6b7280"
                  // Add keyboardType for postalCode, etc. if needed
                />
            ))}
            
            <Text style={styles.subLabel}>Venue Dates</Text>
             <TouchableOpacity 
                onPress={() => { 
                    setCurrentVenueDateValue(parseDateString(venue.startDate)); 
                    setVenueDatePickerVisible({ index: venueIndex, field: 'startDate' }); 
                }}
                style={styles.datePickerButton}
             >
                <Text style={styles.dateText}>{venue.startDate ? formatDate(venue.startDate) : 'Select Start Date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={() => { 
                    setCurrentVenueDateValue(parseDateString(venue.endDate)); 
                    setVenueDatePickerVisible({ index: venueIndex, field: 'endDate' }); 
                }}
                style={styles.datePickerButton}
            >
                <Text style={styles.dateText}>{venue.endDate ? formatDate(venue.endDate) : 'Select End Date'}</Text>
            </TouchableOpacity>

            <Text style={styles.subLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Venue notes (e.g., stage door, parking)"
              value={venue.notes}
              onChangeText={(value) => handleVenueChange(venueIndex, 'notes', value)}
              multiline
              placeholderTextColor="#6b7280"
            />
          </View>
        ))}
        {formData.isTouringShow && (
          <TouchableOpacity onPress={addVenue} style={styles.addButton}>
            <PlusCircle size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Venue</Text>
          </TouchableOpacity>
        )}
         { (!formData.venues || formData.venues.length === 0) && !formData.isTouringShow && (
          <TouchableOpacity onPress={addVenue} style={styles.addButton}>
            <PlusCircle size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Venue Details</Text>
          </TouchableOpacity>
        )}
      </FormField>

      {/* Conditionally rendered DateTimePicker for Venue Dates */}
      {venueDatePickerVisible && (
        <DateTimePicker
          testID={`venueDatePicker_${venueDatePickerVisible.field}_${venueDatePickerVisible.index}`}
          value={currentVenueDateValue} // The date to show in the picker
          mode="date"
          display="default"
          onChange={onVenueDateChange}
        />
      )}

      {/* Rehearsal Addresses Section */}
      <FormField label="Rehearsal Addresses">
        {(formData.rehearsalAddresses || []).map((address, index) => (
          <View key={address.id || index} style={styles.addressContainer}>
            <View style={styles.addressHeader}>
                <Text style={styles.subLabel}>Rehearsal Space {index + 1}</Text>
                <TouchableOpacity onPress={() => removeAddressFromList('rehearsalAddresses', index)} style={styles.removeButton}>
                    <MinusCircle size={20} color="#FF3B30" />
                </TouchableOpacity>
            </View>
            {(Object.keys(defaultAddress) as Array<keyof Address>)
              .filter(key => key !== 'id' && key !== 'companyName') // Filter out fields not needed for simple address entry
              .map(addressKey => (
                <TextInput
                  key={addressKey}
                  style={styles.input}
                  placeholder={`${addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}`}
                  value={address[addressKey] || ''}
                  onChangeText={(value) => handleAddressListChange('rehearsalAddresses', index, addressKey, value)}
                  placeholderTextColor="#6b7280"
                />
            ))}
          </View>
        ))}
        <TouchableOpacity onPress={() => addAddressToList('rehearsalAddresses')} style={styles.addButton}>
          <PlusCircle size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Rehearsal Address</Text>
        </TouchableOpacity>
      </FormField>

      {/* Storage Addresses Section */}
      <FormField label="Storage Addresses">
        {(formData.storageAddresses || []).map((address, index) => (
          <View key={address.id || index} style={styles.addressContainer}>
             <View style={styles.addressHeader}>
                <Text style={styles.subLabel}>Storage Location {index + 1}</Text>
                <TouchableOpacity onPress={() => removeAddressFromList('storageAddresses', index)} style={styles.removeButton}>
                    <MinusCircle size={20} color="#FF3B30" />
                </TouchableOpacity>
            </View>
            {(Object.keys(defaultAddress) as Array<keyof Address>)
              .filter(key => key !== 'id' && key !== 'companyName') // Filter out fields not needed for simple address entry
              .map(addressKey => (
                <TextInput
                  key={addressKey}
                  style={styles.input}
                  placeholder={`${addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}`}
                  value={address[addressKey] || ''}
                  onChangeText={(value) => handleAddressListChange('storageAddresses', index, addressKey, value)}
                  placeholderTextColor="#6b7280"
                />
            ))}
          </View>
        ))}
        <TouchableOpacity onPress={() => addAddressToList('storageAddresses')} style={styles.addButton}>
          <PlusCircle size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Storage Address</Text>
        </TouchableOpacity>
      </FormField>

      {/* Acts & Scenes */}
      <FormField label="Acts & Scenes">
        {(formData.acts || []).map((act, actIndex) => (
          <View key={act.id || actIndex} style={styles.actContainer}>
            <View style={styles.actHeader}>
              <TextInput
                style={[styles.input, styles.actInput]}
                placeholder={`Act ${actIndex + 1} Name`}
                value={act.name}
                onChangeText={(value) => handleActChange(actIndex, 'name', value)}
                placeholderTextColor="#6b7280"
              />
              { (formData.acts || []).length > 1 &&
                <TouchableOpacity onPress={() => removeAct(actIndex)} style={styles.removeButton}>
                  <MinusCircle size={20} color="#FF3B30" />
                </TouchableOpacity>
              }
            </View>
            <TextInput
              style={[styles.input, styles.textArea, styles.actDescriptionInput]}
              placeholder={`Act ${actIndex + 1} Description (Optional)`}
              value={act.description}
              onChangeText={(value) => handleActChange(actIndex, 'description', value)}
              multiline
              placeholderTextColor="#6b7280"
            />

            {(act.scenes || []).map((scene, sceneIndex) => (
              <View key={scene.id || sceneIndex} style={styles.sceneContainer}>
                <TextInput
                  style={[styles.input, styles.sceneInput]}
                  placeholder={`Scene ${sceneIndex + 1} Name`}
                  value={scene.name}
                  onChangeText={(value) => handleSceneChange(actIndex, sceneIndex, 'name', value)}
                  placeholderTextColor="#6b7280"
                />
                <TextInput
                  style={[styles.input, styles.sceneInput]}
                  placeholder={`Scene ${sceneIndex + 1} Setting (Optional)`}
                  value={scene.setting}
                  onChangeText={(value) => handleSceneChange(actIndex, sceneIndex, 'setting', value)}
                  placeholderTextColor="#6b7280"
                />
                { (act.scenes || []).length > 1 &&
                  <TouchableOpacity onPress={() => removeScene(actIndex, sceneIndex)} style={styles.removeButton}>
                    <MinusCircle size={20} color="#FF3B30" />
                  </TouchableOpacity>
                }
              </View>
            ))}
            <TouchableOpacity onPress={() => addScene(actIndex)} style={styles.addButton}>
              <PlusCircle size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Scene</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addAct} style={styles.addButton}>
          <PlusCircle size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Act</Text>
        </TouchableOpacity>
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
  datePickerButton: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 44, // Ensure touchable area is large enough
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  imagePickerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  logoPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 8,
  },
  removeImageButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actContainer: {
    backgroundColor: '#2a3b4d', // Slightly different background for sectioning
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  actHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  actInput: {
    flex: 1, // Take up available space
    marginRight: 10, // Space before remove button
    fontSize: 16,
    fontWeight: 'bold',
  },
  actDescriptionInput: {
    minHeight: 40,
    marginBottom: 10,
  },
  sceneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10, // Indent scenes
    marginBottom: 5,
  },
  sceneInput: {
    flex: 1,
    marginRight: 5, // Space between scene inputs or before remove button
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4b5563',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: 'flex-start', // Don't take full width
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  removeButton: {
    padding: 5, // Make it easier to tap
  },
  removeButtonSmall: {
    padding: 3,
  },
  venueContainer: {
    backgroundColor: '#2a3b4d',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    borderColor: '#4b5563',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueNameInput: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subLabel: {
    fontSize: 13,
    color: '#a1a1aa', // Lighter gray for sub-labels
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '500',
  },
  contactContainer: {
    backgroundColor: '#2a3b4d',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderColor: '#4b5563',
    borderWidth: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressContainer: {
    backgroundColor: '#2a3b4d',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderColor: '#4b5563',
    borderWidth: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collaboratorItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a3b4d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  collaboratorInfoContainer: {
    flexDirection: 'column',
  },
  collaboratorText: {
    color: '#e5e7eb',
    fontSize: 15,
  },
  collaboratorRoleText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  roleSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#4b5563',
    borderRadius: 6,
    marginRight: 8,
  },
  roleButtonSelected: {
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addButtonSmallMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4b5563',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8, // Added specific margin for this button
    alignSelf: 'flex-start',
  },
}); 