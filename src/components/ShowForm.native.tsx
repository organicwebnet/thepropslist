import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, Alert, Platform, TouchableOpacity, Image, PanResponder, Modal } from 'react-native';
import DatePicker from 'react-native-date-picker';
import * as ImagePicker from 'expo-image-picker';
import { Show, Act, Scene, Venue, Contact, ShowCollaborator } from '../types/index.ts';
import { Address } from '../shared/types/address.ts';
import { Timestamp } from 'firebase/firestore';
import { CustomTimestamp } from '../shared/services/firebase/types';
import { Feather } from '@expo/vector-icons';

interface ShowFormNativeProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Show>; // Partial to allow for incomplete data during dev
  onSubmit: (data: Partial<Show> & { _logoImageUri?: string | null }) => void;
  onCancel?: () => void;
}

// Updated initial state including more fields
const initialNativeFormState: Partial<Show> & { propmakerName?: string; designerAssistantName?: string; assistantStageManager?: string; techWeekStart?: string; firstPreview?: string; pressNight?: string; additionalDates?: { label: string; date: string }[]; collaborators?: ExtendedShowCollaborator[] } = {
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
  collaborators: [{ name: '', jobRole: '', email: '', role: 'viewer', addedAt: '', addedBy: '' }],
  propmakerName: '',
  designerAssistantName: '',
  assistantStageManager: '',
  techWeekStart: '',
  firstPreview: '',
  pressNight: '',
  additionalDates: [],
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
const formatDate = (date: Date | CustomTimestamp | string | null | undefined): string => {
  if (!date) return 'Select Date';

  if (date && typeof (date as any).toDate === 'function') {
    return (date as any).toDate().toLocaleDateString();
  }

  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    // Handle ISO string or other string formats
    dateObj = new Date(date);
  } else if (date && typeof (date as any).toDate === 'function') {
    // Handle Firestore Timestamp-like objects from different SDK versions
    dateObj = (date as any).toDate();
  } else {
    // If it's an unrecognized format, return a fallback string
    return 'Invalid Date';
  }

  // Check if dateObj is valid before calling toLocaleDateString
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString();
};

// Helper function to parse string/Timestamp back to Date or return now
const parseDateString = (dateInput: string | Date | Timestamp | null | undefined): Date => {
   if (dateInput instanceof Date) return dateInput;
   if (dateInput && typeof (dateInput as any).toDate === 'function') return (dateInput as any).toDate();
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

// Section styles and StyleSheet must be defined before the component uses them
const sectionCardStyle = {
  backgroundColor: 'rgba(45,45,68,0.95)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 24,
  borderWidth: 2,
  borderColor: '#a78bfa', // Match Add Prop form purple
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
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
    backgroundColor: '#374151',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 2, // Thicker border
    borderColor: '#a78bfa', // Match Add Prop form purple
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

type ExtendedShowCollaborator = ShowCollaborator & { name: string; jobRole: string; inviteStatus?: string };

export default function ShowFormNative({ mode, initialData, onSubmit, onCancel }: ShowFormNativeProps) {
  const [formData, setFormData] = useState<Partial<Show> & { propmakerName?: string; designerAssistantName?: string; assistantStageManager?: string; techWeekStart?: string; firstPreview?: string; pressNight?: string; additionalDates?: { label: string; date: string }[]; collaborators?: ExtendedShowCollaborator[] }>(() => {
    const merged = { ...initialNativeFormState, ...(initialData || {}) };
    merged.collaborators = (Array.isArray(merged.collaborators)
      ? merged.collaborators.map((c: any) => ({
          ...c,
          name: c.name || '',
          jobRole: c.jobRole || '',
        }))
      : [{ name: '', jobRole: '', email: '', role: 'viewer', addedAt: '', addedBy: '' }]) as ExtendedShowCollaborator[];
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
    merged.propmakerName = merged.propmakerName || '';
    merged.designerAssistantName = merged.designerAssistantName || '';
    merged.assistantStageManager = merged.assistantStageManager || '';
    merged.techWeekStart = merged.techWeekStart || '';
    merged.firstPreview = merged.firstPreview || '';
    merged.pressNight = merged.pressNight || '';
    merged.additionalDates = merged.additionalDates || [];
    return merged as Partial<Show> & {
      propmakerName?: string;
      designerAssistantName?: string;
      assistantStageManager?: string;
      techWeekStart?: string;
      firstPreview?: string;
      pressNight?: string;
      additionalDates?: { label: string; date: string }[];
      collaborators?: ExtendedShowCollaborator[];
    };
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

   // Add a new state for the press night picker
   const [showPressNightPicker, setShowPressNightPicker] = useState(false);

   // State for which additional date picker is open
   const [openAdditionalDateIndex, setOpenAdditionalDateIndex] = useState<number | null>(null);
   // State for new additional date label
   const [newDateLabel, setNewDateLabel] = useState('');

   // Add state for new collaborator name and job role
   const [newCollaboratorName, setNewCollaboratorName] = useState('');
   const [newCollaboratorJobRole, setNewCollaboratorJobRole] = useState('');

   // Add state for modal and new collaborator fields
   const [collabModalVisible, setCollabModalVisible] = useState(false);
   const [modalCollabName, setModalCollabName] = useState('');
   const [modalCollabJobRole, setModalCollabJobRole] = useState('');
   const [modalCollabEmail, setModalCollabEmail] = useState('');
   const [modalCollabRole, setModalCollabRole] = useState<'viewer' | 'editor'>('viewer');

  useEffect(() => {
    if (initialData) {
       const merged = { ...initialNativeFormState, ...initialData };
        merged.acts = Array.isArray(merged.acts) ? merged.acts : [];
        merged.venues = Array.isArray(merged.venues) ? merged.venues : [];
        merged.contacts = Array.isArray(merged.contacts) ? merged.contacts : [];
        merged.rehearsalAddresses = Array.isArray(merged.rehearsalAddresses) ? merged.rehearsalAddresses : [];
        merged.storageAddresses = Array.isArray(merged.storageAddresses) ? merged.storageAddresses : [];
        merged.collaborators = (Array.isArray(merged.collaborators)
          ? merged.collaborators.map((c: any) => ({
              ...c,
              name: c.name || '',
              jobRole: c.jobRole || '',
            }))
          : [{ name: '', jobRole: '', email: '', role: 'viewer', addedAt: '', addedBy: '' }]) as ExtendedShowCollaborator[];
       setFormData(merged as Partial<Show> & {
         propmakerName?: string;
         designerAssistantName?: string;
         assistantStageManager?: string;
         techWeekStart?: string;
         firstPreview?: string;
         pressNight?: string;
         additionalDates?: { label: string; date: string }[];
         collaborators?: ExtendedShowCollaborator[];
       });
       // Update date states when initialData changes
       setStartDate(parseDateString(merged.startDate));
       setEndDate(parseDateString(merged.endDate));
       setSelectedLogoUri(merged.logoImage?.url || null); // Get URL from logoImage object
    } else if (mode === 'create') {
        // Reset to initial state only if creating and no initial data
        setFormData({ ...initialNativeFormState, collaborators: [{ name: '', jobRole: '', email: '', role: 'viewer', addedAt: '', addedBy: '' }] });
        setStartDate(new Date()); // Default to today for create mode
        setEndDate(new Date());
        setSelectedLogoUri(null); // Reset logo URI for create mode
    }
  }, [initialData, mode]);

  const handleInputChange = (name: keyof Show | 'propmakerName' | 'designerAssistantName' | 'assistantStageManager' | 'techWeekStart' | 'firstPreview' | 'pressNight', value: string | boolean | null) => {
    setFormData((prev: Partial<Show> & { propmakerName?: string; designerAssistantName?: string; assistantStageManager?: string; techWeekStart?: string; firstPreview?: string; pressNight?: string }) => {
      const updated = { ...prev, [name]: value };
      if (updated.collaborators) {
        updated.collaborators = (updated.collaborators as any[]).map((c: any) => ({
          ...c,
          name: c.name || '',
          jobRole: c.jobRole || '',
        })) as ExtendedShowCollaborator[];
      }
      return updated as Partial<Show> & {
        propmakerName?: string;
        designerAssistantName?: string;
        assistantStageManager?: string;
        techWeekStart?: string;
        firstPreview?: string;
        pressNight?: string;
        additionalDates?: { label: string; date: string }[];
        collaborators?: ExtendedShowCollaborator[];
      };
    });
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
  const onStartDateChange = (date: Date) => {
    setShowStartDatePicker(false);
    setStartDate(date);
    handleInputChange('startDate', formatDate(date));
  };

  const onEndDateChange = (date: Date) => {
    setShowEndDatePicker(false);
    setEndDate(date);
    handleInputChange('endDate', formatDate(date));
  };

  // Venue Date picker change handler
  const onVenueDateChange = (date: Date) => {
    setVenueDatePickerVisible(null); 
    if (date && venueDatePickerVisible) {
        handleVenueChange(venueDatePickerVisible.index, venueDatePickerVisible.field, formatDate(date));
    }
  };

  // Collaborator Handlers
  const handleAddCollaborator = () => {
    if (!newCollaboratorName.trim()) {
      Alert.alert("Validation Error", "Collaborator name cannot be empty.");
      return;
    }
    if (!newCollaboratorJobRole.trim()) {
      Alert.alert("Validation Error", "Collaborator job role cannot be empty.");
      return;
    }
    if (!newCollaboratorEmail.trim()) {
      Alert.alert("Validation Error", "Collaborator email cannot be empty.");
      return;
    }
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
      const newCollaborator: ExtendedShowCollaborator = {
        name: newCollaboratorName,
        jobRole: newCollaboratorJobRole,
        email: newCollaboratorEmail,
        role: newCollaboratorRole,
        addedAt: new Date().toISOString(),
        addedBy: 'current-user-placeholder',
      };
      return {
        ...prevData,
        collaborators: [...existingCollaborators, newCollaborator].map((c: any) => ({
          ...c,
          name: c.name || '',
          jobRole: c.jobRole || '',
        })),
      };
    });
    setNewCollaboratorName('');
    setNewCollaboratorJobRole('');
    setNewCollaboratorEmail('');
    setNewCollaboratorRole('viewer');
  };

  const handleRemoveCollaborator = (emailToRemove: string) => {
    setFormData(prevData => ({
      ...prevData,
      collaborators: (prevData.collaborators || [])
        .filter(c => c.email !== emailToRemove)
        .map((c: any) => ({
          ...c,
          name: c.name || '',
          jobRole: c.jobRole || '',
        })),
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

  // Stepper logic
  const steps = [
    'Basic Info',
    'Dates',
    'Acts & Scenes',
    'Venues',
    'Contacts',
    'Collaborators',
  ];
  const [step, setStep] = useState(0);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          setStep(s => Math.min(s + 1, steps.length - 1));
        } else if (gestureState.dx > 50) {
          setStep(s => Math.max(s - 1, 0));
        }
      },
    })
  ).current;

  // Renderers for each step
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={sectionCardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Basic Info</Text>
              <TouchableOpacity onPress={() => Alert.alert('Basic Info', 'Enter the show name, description, and other basic details.')}> 
                <Feather name="help-circle" size={20} color="#a78bfa" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
            {/* Name, Description, Logo, Production Company, etc. */}
      <FormField label="Show Name" required>
        <TextInput
          style={styles.input}
          placeholder="Enter show name"
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>

      <FormField label="Description" required>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Enter show description"
          value={formData.description}
          onChangeText={value => handleInputChange('description', value)}
          multiline
          numberOfLines={4}
          placeholderTextColor="#6b7280"
        />
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

            
          </View>
        );
      case 1:
        return (
          <View style={sectionCardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Important Dates</Text>
              <TouchableOpacity onPress={() => Alert.alert('Important Dates', 'Enter the start of tech week, first preview, and press night.')}> 
                <Feather name="help-circle" size={20} color="#a78bfa" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
            
            {/* Start of Tech Week */}
            <FormField label="Start of Tech Week">
              <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePickerButton}>
                <Text style={styles.dateText}>{formData.techWeekStart ? formatDate(formData.techWeekStart) : 'Select Date'}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <Modal visible={showStartDatePicker} transparent animationType="slide" onRequestClose={() => setShowStartDatePicker(false)}>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                      <DatePicker
                        date={formData.techWeekStart ? parseDateString(formData.techWeekStart) : new Date()}
                  mode="date"
                        onDateChange={date => { setShowStartDatePicker(false); onStartDateChange(date); }}
                      />
                      <Button title="Cancel" onPress={() => setShowStartDatePicker(false)} />
                    </View>
                  </View>
                </Modal>
              )}
      </FormField>
            {/* First Preview */}
            <FormField label="First Preview">
              <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.datePickerButton}>
                <Text style={styles.dateText}>{formData.firstPreview ? formatDate(formData.firstPreview) : 'Select Date'}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <Modal visible={showEndDatePicker} transparent animationType="slide" onRequestClose={() => setShowEndDatePicker(false)}>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                      <DatePicker
                        date={formData.firstPreview ? parseDateString(formData.firstPreview) : new Date()}
                  mode="date"
                        onDateChange={date => { setShowEndDatePicker(false); onEndDateChange(date); }}
                      />
                      <Button title="Cancel" onPress={() => setShowEndDatePicker(false)} />
                    </View>
                  </View>
                </Modal>
              )}
      </FormField>
            {/* Press Night */}
            <FormField label="Press Night">
              <TouchableOpacity onPress={() => setShowPressNightPicker(true)} style={styles.datePickerButton}>
                <Text style={styles.dateText}>{formData.pressNight ? formatDate(formData.pressNight) : 'Select Date'}</Text>
              </TouchableOpacity>
              {showPressNightPicker && (
                <Modal visible={showPressNightPicker} transparent animationType="slide" onRequestClose={() => setShowPressNightPicker(false)}>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                      <DatePicker
                        date={formData.pressNight ? parseDateString(formData.pressNight) : new Date()}
                  mode="date"
                        onDateChange={date => { setShowPressNightPicker(false); handleInputChange('pressNight', formatDate(date)); }}
                      />
                      <Button title="Cancel" onPress={() => setShowPressNightPicker(false)} />
                    </View>
                  </View>
                </Modal>
              )}
      </FormField>
            {(formData.additionalDates || []).map((item, idx) => (
              <View key={idx} style={{ marginBottom: 12 }}>
                <FormField label={`Custom Date Name`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Enter date name (e.g. Final Dress)"
                      value={item.label}
                      onChangeText={v => handleUpdateAdditionalDate(idx, 'label', v)}
          placeholderTextColor="#6b7280"
        />
                    <TouchableOpacity onPress={() => handleRemoveAdditionalDate(idx)} style={{ marginLeft: 8 }}>
                      <Text style={{ color: '#f87171', fontWeight: 'bold' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
      </FormField>
                <FormField label="Date">
                  <TouchableOpacity onPress={() => setOpenAdditionalDateIndex(idx)} style={styles.datePickerButton}>
                    <Text style={styles.dateText}>{item.date ? formatDate(item.date) : 'Select Date'}</Text>
                  </TouchableOpacity>
                  {openAdditionalDateIndex === idx && (
                    <Modal visible={openAdditionalDateIndex === idx} transparent animationType="slide" onRequestClose={() => setOpenAdditionalDateIndex(null)}>
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                          <DatePicker
                            date={item.date ? parseDateString(item.date) : new Date()}
                      mode="date"
                            onDateChange={date => { setOpenAdditionalDateIndex(null); handleUpdateAdditionalDate(idx, 'date', formatDate(date)); }}
                    />
                          <Button title="Cancel" onPress={() => setOpenAdditionalDateIndex(null)} />
                        </View>
                      </View>
                    </Modal>
                  )}
      </FormField>
              </View>
            ))}
            <FormField label="Custom Date Name">
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Add another date (name)"
                  value={newDateLabel}
                  onChangeText={setNewDateLabel}
          placeholderTextColor="#6b7280"
        />
                <TouchableOpacity onPress={handleAddAdditionalDate} style={[styles.addButton, { marginLeft: 8 }]}> 
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
      </FormField>
          </View>
        );
      case 2:
        return (
          <View style={sectionCardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Acts & Scenes</Text>
              <TouchableOpacity onPress={() => Alert.alert('Acts & Scenes', 'Enter the acts and scenes for the show.')}> 
                <Feather name="help-circle" size={20} color="#a78bfa" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
            {/* Acts, Scenes, Add/Remove, etc. */}
            {(formData.acts || []).map((act, actIndex) => (
              <View key={act.id || actIndex} style={[styles.actContainer, { marginBottom: 20 }]}>
                <FormField label={`Act ${actIndex + 1} Name`} required>
        <TextInput
                    style={[styles.input, { fontSize: 18, fontWeight: '600', color: '#fff' }]}
                    placeholder={`Act ${actIndex + 1} Name`}
                    value={act.name}
                    onChangeText={(value) => handleActChange(actIndex, 'name', value)}
                    placeholderTextColor="#b3b3b3"
        />
      </FormField>
                {(act.scenes || []).map((scene, sceneIndex) => (
                  <View key={scene.id || sceneIndex} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <FormField label={`Scene ${sceneIndex + 1} Name`}>
        <TextInput
                        style={[styles.input, styles.sceneInput, { fontSize: 16, color: '#fff' }]}
                        placeholder={`Scene ${sceneIndex + 1} Name`}
                        value={scene.name}
                        onChangeText={(value) => handleSceneChange(actIndex, sceneIndex, 'name', value)}
                        placeholderTextColor="#b3b3b3"
        />
      </FormField>
                    { (act.scenes || []).length > 1 &&
                      <TouchableOpacity onPress={() => removeScene(actIndex, sceneIndex)} style={styles.removeButton}>
                <Feather name="minus-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
                    }
            </View>
                ))}
                <TouchableOpacity onPress={() => addScene(actIndex)} style={styles.addButton}>
                  <Feather name="plus-circle" size={22} color="#34d399" />
                  <Text style={styles.addButtonText}>Add Scene</Text>
                </TouchableOpacity>
          </View>
        ))}
            <TouchableOpacity onPress={addAct} style={styles.addButton}>
          <Feather name="plus-circle" size={22} color="#34d399" />
              <Text style={styles.addButtonText}>Add Act</Text>
        </TouchableOpacity>
            </View>
        );
      case 3:
        return (
          <View style={sectionCardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Venues</Text>
              <TouchableOpacity onPress={() => Alert.alert('Venues', 'Enter the venues for the show.')}> 
                <Feather name="help-circle" size={20} color="#a78bfa" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
            {(formData.venues || []).map((venue, venueIndex) => (
              <View key={venue.id || venueIndex} style={styles.venueContainer}>
                <FormField label="Venue Name" required>
        <TextInput
          style={styles.input}
                    placeholder={formData.isTouringShow ? `Venue ${venueIndex + 1} Name` : 'Primary Venue Name'}
                    value={venue.name}
                    onChangeText={(value) => handleVenueChange(venueIndex, 'name', value)}
          placeholderTextColor="#6b7280"
        />
      </FormField>
                <Text style={[styles.label, { marginTop: 8, marginBottom: 2 }]}>Address</Text>
                {(Object.keys(defaultAddress) as Array<keyof Address>)
                  .filter(key => key !== 'id' && key !== 'companyName' && key !== 'nickname' && key !== 'name')
                  .map((addressKey) => (
                    <FormField key={addressKey} label={addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}>
                      <TextInput
                        style={styles.input}
                        placeholder={addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                        value={venue.address?.[addressKey] || ''}
                        onChangeText={(value) => handleVenueChange(venueIndex, `address.${addressKey}`, value)}
                        placeholderTextColor="#6b7280"
                      />
                    </FormField>
                ))}
                <Text style={[styles.label, { marginTop: 8, marginBottom: 2 }]}>Venue Dates</Text>
      <FormField label="Start Date">
                  <TouchableOpacity onPress={() => setVenueDatePickerVisible({ index: venueIndex, field: 'startDate' })} style={styles.datePickerButton}>
                    <Text style={styles.dateText}>{venue.startDate ? formatDate(venue.startDate) : 'Select Start Date'}</Text>
        </TouchableOpacity>
                  {venueDatePickerVisible && venueDatePickerVisible.index === venueIndex && venueDatePickerVisible.field === 'startDate' && (
                    <Modal visible={venueDatePickerVisible.index === venueIndex && venueDatePickerVisible.field === 'startDate'} transparent animationType="slide" onRequestClose={() => setVenueDatePickerVisible(null)}>
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                          <DatePicker
                            date={venue.startDate ? parseDateString(venue.startDate) : new Date()}
            mode="date"
                            onDateChange={date => { setVenueDatePickerVisible(null); handleVenueChange(venueIndex, 'startDate', formatDate(date)); }}
          />
                          <Button title="Cancel" onPress={() => setVenueDatePickerVisible(null)} />
                        </View>
                      </View>
                    </Modal>
        )}
      </FormField>
      <FormField label="End Date">
                  <TouchableOpacity onPress={() => setVenueDatePickerVisible({ index: venueIndex, field: 'endDate' })} style={styles.datePickerButton}>
                    <Text style={styles.dateText}>{venue.endDate ? formatDate(venue.endDate) : 'Select End Date'}</Text>
        </TouchableOpacity>
                  {venueDatePickerVisible && venueDatePickerVisible.index === venueIndex && venueDatePickerVisible.field === 'endDate' && (
                    <Modal visible={venueDatePickerVisible.index === venueIndex && venueDatePickerVisible.field === 'endDate'} transparent animationType="slide" onRequestClose={() => setVenueDatePickerVisible(null)}>
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
                          <DatePicker
                            date={venue.endDate ? parseDateString(venue.endDate) : new Date()}
            mode="date"
                            onDateChange={date => { setVenueDatePickerVisible(null); handleVenueChange(venueIndex, 'endDate', formatDate(date)); }}
          />
                          <Button title="Cancel" onPress={() => setVenueDatePickerVisible(null)} />
                        </View>
                      </View>
                    </Modal>
        )}
      </FormField>
                <FormField label="Notes">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Venue notes (e.g., stage door, parking)"
              value={venue.notes}
              onChangeText={(value) => handleVenueChange(venueIndex, 'notes', value)}
              multiline
              placeholderTextColor="#6b7280"
            />
                </FormField>
          </View>
        ))}
          <TouchableOpacity onPress={addVenue} style={styles.addButton}>
            <Feather name="plus-circle" size={22} color="#34d399" />
            <Text style={styles.addButtonText}>Add Venue</Text>
          </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={sectionCardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Contacts</Text>
              <TouchableOpacity onPress={() => Alert.alert('Contacts', 'Enter the contacts for the show.')}> 
                <Feather name="help-circle" size={20} color="#a78bfa" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
            </View>
            <FormField label="Props Supervisor Name" required>
              <TextInput
                style={styles.input}
                placeholder="Enter props supervisor's name"
                value={formData.propsSupervisor}
                onChangeText={(value) => handleInputChange('propsSupervisor', value)}
                placeholderTextColor="#6b7280"
              />
      </FormField>
            <FormField label="Designer Name" required>
              <TextInput
                style={styles.input}
                placeholder="Enter designer's name"
                value={formData.productionContactName}
                onChangeText={(value) => handleInputChange('productionContactName', value)}
                placeholderTextColor="#6b7280"
              />
            </FormField>
            <FormField label="Designer Assistant Name">
                <TextInput
                  style={styles.input}
                placeholder="Enter designer assistant's name"
                value={formData.designerAssistantName}
                onChangeText={(value) => handleInputChange('designerAssistantName', value)}
                  placeholderTextColor="#6b7280"
                />
      </FormField>
            <FormField label="Stage Manager Name" required>
                <TextInput
                  style={styles.input}
                placeholder="Enter stage manager's name"
                value={formData.stageManager}
                onChangeText={(value) => handleInputChange('stageManager', value)}
                  placeholderTextColor="#6b7280"
                />
      </FormField>
            <FormField label="Assistant Stage Manager Name">
              <TextInput
                style={styles.input}
                placeholder="Enter assistant stage manager's name"
                value={formData.assistantStageManager}
                onChangeText={(value) => handleInputChange('assistantStageManager', value)}
                placeholderTextColor="#6b7280"
              />
            </FormField>
            <FormField label="Propmaker Name">
              <TextInput
                style={styles.input}
                placeholder="Enter propmaker's name"
                value={formData.propmakerName}
                onChangeText={(value) => handleInputChange('propmakerName', value)}
                placeholderTextColor="#6b7280"
              />
            </FormField>
           
            {/* Remove all contacts rendering, only show add contact button */}
            <TouchableOpacity onPress={addContact} style={styles.addButton}>
              <Feather name="plus-circle" size={22} color="#34d399" />
              <Text style={styles.addButtonText}>Add Contact</Text>
                </TouchableOpacity>
            </View>
        );
      case 5:
        return (
          <View style={sectionCardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { flex: 1 }]}>Collaborators</Text>
              <TouchableOpacity onPress={() => setCollabModalVisible(true)} style={styles.addButtonSmallMargin}>
                <Feather name="plus-circle" size={22} color="#34d399" />
                <Text style={styles.addButtonText}>Add Collaborator</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Collaborators', 'Enter the collaborators for the show.')}> 
                <Feather name="help-circle" size={20} color="#a78bfa" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
            {/* Collaborators, Add/Remove, etc. */}
            {(formData.collaborators || []).map((collaborator, index) => {
              const { name = '', jobRole = '', email, role, inviteStatus } = collaborator as ExtendedShowCollaborator & { inviteStatus?: string };
              return (
                <View key={index} style={styles.collaboratorItemContainer}>
                  <View style={styles.collaboratorInfoContainer}>
                    <Text style={styles.collaboratorText}>{name} <Text style={{ color: '#9ca3af' }}>({jobRole})</Text></Text>
                    <Text style={styles.collaboratorRoleText}>{email} ({role})</Text>
                    {inviteStatus && (
                      <Text style={[styles.collaboratorRoleText, { color: inviteStatus === 'accepted' ? '#22c55e' : inviteStatus === 'pending' ? '#facc15' : '#f87171' }]}>Invite: {inviteStatus}</Text>
                    )}
                  </View>
                  {inviteStatus && (inviteStatus === 'pending' || inviteStatus === 'rejected') && (
                    <TouchableOpacity onPress={() => handleReinviteCollaborator(email)} style={styles.addButtonSmallMargin}>
                      <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Reinvite</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleRemoveCollaborator(email)} style={styles.removeButtonSmall}>
                    <Feather name="minus-circle" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {/* Modal for adding collaborator */}
            <Modal
              visible={collabModalVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setCollabModalVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#23234a', padding: 24, borderRadius: 12, width: '90%' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Add Collaborator</Text>
                  <FormField label="Name" required>
            <TextInput
                      style={styles.input}
                      placeholder="Collaborator Name"
                      value={modalCollabName}
                      onChangeText={setModalCollabName}
              placeholderTextColor="#6b7280"
            />
                  </FormField>
                  <FormField label="Job Role" required>
                <TextInput
                      style={styles.input}
                      placeholder="e.g. Lighting Designer"
                      value={modalCollabJobRole}
                      onChangeText={setModalCollabJobRole}
                  placeholderTextColor="#6b7280"
                />
                  </FormField>
                  <FormField label="Email" required>
                <TextInput
                      style={styles.input}
                      placeholder="Collaborator Email"
                      value={modalCollabEmail}
                      onChangeText={setModalCollabEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                  placeholderTextColor="#6b7280"
                />
                  </FormField>
                  <View style={styles.roleSelectorContainer}>
                    <Text style={styles.subLabel}>Permission: </Text>
                    <TouchableOpacity
                      style={[styles.roleButton, modalCollabRole === 'viewer' && styles.roleButtonSelected]}
                      onPress={() => setModalCollabRole('viewer')}
                    >
                      <Text style={styles.roleButtonText}>Viewer</Text>
                  </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleButton, modalCollabRole === 'editor' && styles.roleButtonSelected]}
                      onPress={() => setModalCollabRole('editor')}
                    >
                      <Text style={styles.roleButtonText}>Editor</Text>
                    </TouchableOpacity>
              </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                    <TouchableOpacity onPress={() => setCollabModalVisible(false)} style={[styles.addButton, { backgroundColor: '#6b7280', marginRight: 8 }]}> 
                      <Text style={styles.addButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleModalAddCollaborator} style={styles.addButton}> 
                      <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
                </View>
              </View>
            </Modal>
          </View>
        );
      default:
        return <View><Text>Step not implemented yet.</Text></View>;
    }
  };

  // Stepper header with dots
  const renderStepperHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
      {steps.map((label, idx) => (
        <View key={label} style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: step === idx ? '#c084fc' : '#404040',
          marginHorizontal: 4,
        }} />
      ))}
    </View>
  );

  // Handler to add a new additional date
  const handleAddAdditionalDate = () => {
    if (!newDateLabel.trim()) return;
    setFormData(prev => ({
      ...prev,
      additionalDates: [...(prev.additionalDates || []), { label: newDateLabel, date: '' }],
    }));
    setNewDateLabel('');
  };

  // Handler to update label/date of an additional date
  const handleUpdateAdditionalDate = (idx: number, field: 'label' | 'date', value: string) => {
    setFormData(prev => {
      const updated = [...(prev.additionalDates || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, additionalDates: updated };
    });
  };

  // Handler to remove an additional date
  const handleRemoveAdditionalDate = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      additionalDates: (prev.additionalDates || []).filter((_, i) => i !== idx),
    }));
  };

  // Add handler for modal add
  const handleModalAddCollaborator = () => {
    if (!modalCollabName.trim() || !modalCollabJobRole.trim() || !modalCollabEmail.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(modalCollabEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    setFormData(prevData => {
      const existingCollaborators = prevData.collaborators || [];
      if (existingCollaborators.some(c => c.email.toLowerCase() === modalCollabEmail.toLowerCase())) {
        Alert.alert('Error', 'This collaborator has already been added.');
        return prevData;
      }
      const newCollaborator: ExtendedShowCollaborator = {
        name: modalCollabName,
        jobRole: modalCollabJobRole,
        email: modalCollabEmail,
        role: modalCollabRole,
        addedAt: new Date().toISOString(),
        addedBy: 'current-user-placeholder',
        inviteStatus: 'pending', // mock status
      };
      return {
        ...prevData,
        collaborators: [...existingCollaborators, newCollaborator].map((c: any) => ({
          ...c,
          name: c.name || '',
          jobRole: c.jobRole || '',
        })),
      };
    });
    setModalCollabName('');
    setModalCollabJobRole('');
    setModalCollabEmail('');
    setModalCollabRole('viewer');
    setCollabModalVisible(false);
  };

  // Add handler for reinvite
  const handleReinviteCollaborator = (email: string) => {
    setFormData(prevData => {
      const updated = (prevData.collaborators || []).map(c => {
        const collab = c as ExtendedShowCollaborator;
        if (collab.email === email) {
          return { ...collab, inviteStatus: 'pending', name: collab.name || '', jobRole: collab.jobRole || '' };
        }
        return { ...collab, name: collab.name || '', jobRole: collab.jobRole || '' };
      });
      return { ...prevData, collaborators: updated as ExtendedShowCollaborator[] };
    });
  };

  return (
    <View style={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16 }}>
      {renderStepperHeader()}
      <View {...panResponder.panHandlers}>
        {renderStep()}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
        <TouchableOpacity
          onPress={() => setStep(s => Math.max(s - 1, 0))}
          disabled={step === 0}
          style={{
            flex: 1,
            backgroundColor: step === 0 ? '#6b7280' : '#a78bfa',
            borderRadius: 8,
            paddingVertical: 14,
            marginRight: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setStep(s => Math.min(s + 1, steps.length - 1))}
          disabled={step === steps.length - 1}
          style={{
            flex: 1,
            backgroundColor: step === steps.length - 1 ? '#6b7280' : '#a78bfa',
            borderRadius: 8,
            paddingVertical: 14,
            marginLeft: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Next</Text>
        </TouchableOpacity>
      </View>
      {/* Submit/Cancel Buttons (only on last step) */}
      {step === steps.length - 1 && (
        <View style={{ marginTop: 24 }}>
        <Button
          title={mode === 'create' ? 'Create Show' : 'Update Show'}
          onPress={handleSubmit}
            color={Platform.OS === 'ios' ? '#007AFF' : undefined}
        />
        {onCancel && (
          <View style={styles.cancelButtonContainer}>
            <Button
              title="Cancel"
              onPress={onCancel}
                color={Platform.OS === 'ios' ? '#FF3B30' : undefined}
            />
          </View>
        )}
      </View>
      )}
      
    </View>
  );
} 
