import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, Switch, Modal, Button, Platform, useWindowDimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext';
import type { Prop } from '@/shared/types/props';
import { 
  PropLifecycleStatus, 
  PropStatusUpdate as PropStatusUpdateType, 
  MaintenanceRecord as MaintenanceRecordType,
  lifecycleStatusLabels, 
  lifecycleStatusPriority, 
} from '@/types/lifecycle';
import { Pencil, Trash2, ArrowLeft, Wrench, History, ClipboardList, CheckCircle, XCircle, FileText, Video as VideoIcon, MoveRight, CalendarDays, Users, ImagePlus, X } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';
import * as ImagePicker from 'expo-image-picker';

// Local type for Maintenance Form
export type MaintenanceType = 'repair' | 'maintenance' | 'modification' | 'inspection';
export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  repair: 'Repair',
  maintenance: 'Maintenance',
  modification: 'Modification',
  inspection: 'Inspection',
};

// Helper to format dates
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper to check if the source is a valid structure for RN <Image>
function isValidImageSource(source: any): source is { uri: string } {
  return typeof source === 'object' && source !== null && typeof source.uri === 'string';
}

// Extend Prop type locally for state
interface PropWithHistory extends Prop {
  statusHistory?: PropStatusUpdateType[];
  maintenanceHistory?: MaintenanceRecordType[];
  // Fields from web version that might be in prop.data
  isModified?: boolean;
  modificationDetails?: string;
  modifiedAt?: string | null;
  rentalSource?: string;
  rentalReferenceNumber?: string;
  travelsUnboxed?: boolean;
  statusNotes?: string;
}

interface UserProfileInfo { // Simplified profile for display
  displayName?: string;
}

// --- Mobile specific lifecycle components ---

interface MobilePropStatusUpdateFormProps {
  currentStatus: PropLifecycleStatus;
  onSubmit: (newStatus: PropLifecycleStatus, notes: string, notifyTeam: boolean, damageImageUris: string[]) => Promise<void>;
  disabled?: boolean;
}

const MobilePropStatusUpdateForm: React.FC<MobilePropStatusUpdateFormProps> = ({ currentStatus, onSubmit, disabled }) => {
  const [newStatus, setNewStatus] = useState<PropLifecycleStatus | ''>(currentStatus || '');
  const [notes, setNotes] = useState('');
  const [notifyTeam, setNotifyTeam] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      setSelectedImages(prevImages => [...prevImages, ...result.assets]);
    }
  };

  const removeImage = (uriToRemove: string) => {
    setSelectedImages(prevImages => prevImages.filter(img => img.uri !== uriToRemove));
  };

  const handleSubmit = async () => {
    if (!newStatus || newStatus === currentStatus) {
      Alert.alert("No Change", "Please select a new status different from the current one.");
      return;
    }
    setIsSubmitting(true);
    try {
      const imageUris = selectedImages.map(img => img.uri);
      await onSubmit(newStatus, notes.trim(), notifyTeam, imageUris);
      setNotes('');
      setNotifyTeam(false);
      setSelectedImages([]);
      Alert.alert("Success", "Status updated.");
    } catch (error) {
      console.error("Error in status update form submit:", error);
      Alert.alert("Error", `Failed to update status. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableStatuses = Object.entries(lifecycleStatusLabels)
    .filter(([statusValue]) => statusValue !== currentStatus);

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Current Status: {lifecycleStatusLabels[currentStatus]}</Text>
      
      <TouchableOpacity onPress={() => setShowStatusPicker(true)} style={styles.pickerButton} disabled={disabled || isSubmitting}>
        <Text style={styles.pickerButtonText}>{newStatus ? lifecycleStatusLabels[newStatus] : "Select New Status"}</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showStatusPicker}
        onRequestClose={() => setShowStatusPicker(false)}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select New Status</Text>
            {availableStatuses.map(([statusValue, label]) => (
              <TouchableOpacity 
                key={statusValue} 
                style={styles.modalItem}
                onPress={() => {
                  setNewStatus(statusValue as PropLifecycleStatus);
                  setShowStatusPicker(false);
                }}
              >
                <Text style={styles.modalItemText}>{label}</Text>
              </TouchableOpacity>
            ))}
            <Button title="Cancel" onPress={() => setShowStatusPicker(false)} color="#EF4444"/>
          </View>
        </View>
      </Modal>

      <Text style={styles.formLabel}>Notes</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Reason for status change, details of any damage..."
        multiline
        numberOfLines={4}
        editable={!disabled && !isSubmitting}
      />

      <Text style={styles.formLabel}>Attach Images (Optional)</Text>
      <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton} disabled={disabled || isSubmitting}>
        <ImagePlus size={20} color="#F9FAFB" style={{ marginRight: 8 }} />
        <Text style={styles.pickerButtonText}>Add Image</Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <ScrollView horizontal style={styles.imagePreviewContainer} showsHorizontalScrollIndicator={false}>
          {selectedImages.map((imageAsset) => (
            <View key={imageAsset.uri} style={styles.imagePreviewItem}>
              <Image source={{ uri: imageAsset.uri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => removeImage(imageAsset.uri)} style={styles.removeImageButton}>
                <X size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.switchContainer}>
        <Text style={styles.formLabel}>Notify Team?</Text>
        <Switch
          value={notifyTeam}
          onValueChange={setNotifyTeam}
          disabled={disabled || isSubmitting}
        />
      </View>
      <TouchableOpacity 
        style={[styles.submitButton, (disabled || isSubmitting || !newStatus) && styles.disabledButton]}
        onPress={handleSubmit} 
        disabled={disabled || isSubmitting || !newStatus}
      >
        <Text style={styles.submitButtonText}>{isSubmitting ? "Submitting..." : "Update Status"}</Text>
      </TouchableOpacity>
    </View>
  );
};

interface MobileStatusHistoryListProps {
  history: PropStatusUpdateType[];
  userProfiles: Record<string, UserProfileInfo>; // Pass profiles map
}

const MobileStatusHistoryList: React.FC<MobileStatusHistoryListProps> = ({ history, userProfiles }) => {
  const { width } = useWindowDimensions();
  const [imageViewer, setImageViewer] = useState<{visible: boolean, images: {url: string}[], index: number}>({visible: false, images: [], index: 0});

  if (!history || history.length === 0) {
    return <Text style={styles.placeholderText}>No status updates yet.</Text>;
  }

  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusStyle = (status: PropLifecycleStatus) => {
    const priority = lifecycleStatusPriority[status] || 'info';
    switch (priority) {
      case 'critical': return styles.statusCritical;
      case 'high': return styles.statusHigh;
      case 'medium': return styles.statusMedium;
      case 'low': return styles.statusLow;
      default: return styles.statusInfo;
    }
  };

  const baseStyle = {
    color: '#D1D5DB', 
    fontSize: 14,
  };
  const tagsStyles = {
    p: { marginVertical: 4 },
    ul: { marginVertical: 4 },
    ol: { marginVertical: 4 },
    li: { marginVertical: 2 },
    strong: { fontWeight: 'bold' as 'bold' }, 
    em: { fontStyle: 'italic' as 'italic' },
  };

  const openImageViewer = (imageUrls: string[], startIndex: number) => {
    const imagesForViewer = imageUrls.map(url => ({ url }));
    setImageViewer({ visible: true, images: imagesForViewer, index: startIndex });
  };

  const closeImageViewer = () => {
    setImageViewer({ visible: false, images: [], index: 0 });
  };

  return (
    <View style={styles.historyListContainer}>
      {sortedHistory.map((item) => {
        const userName = userProfiles[item.updatedBy]?.displayName || item.updatedBy.substring(0,10) + '...';
        return (
          <View key={item.id || item.date} style={styles.historyItemContainer}>
            <View style={styles.historyItemHeader}>
              <Text style={styles.historyItemDate}>{new Date(item.date).toLocaleDateString()} - {new Date(item.date).toLocaleTimeString()}</Text>
              {item.notified && <Text style={styles.notifiedBadge}>Team Notified</Text>}
            </View>
            <View style={styles.statusChangeContainer}>
              <Text style={[styles.statusText, getStatusStyle(item.previousStatus)]}>{lifecycleStatusLabels[item.previousStatus]}</Text>
              <MoveRight size={16} color="#9CA3AF" style={{ marginHorizontal: 5 }}/>
              <Text style={[styles.statusText, getStatusStyle(item.newStatus)]}>{lifecycleStatusLabels[item.newStatus]}</Text>
            </View>
            {item.notes && (
              <View style={styles.notesHtmlContainer}> 
                <RenderHTML
                  contentWidth={width - (styles.historyItemContainer.padding * 2 || 32)} 
                  source={{ html: `<div style="font-size: 14px; color: #D1D5DB;">${item.notes}</div>` }} 
                  baseStyle={baseStyle} 
                  tagsStyles={tagsStyles} 
                  systemFonts={[Platform.OS === 'ios' ? 'System' : 'sans-serif']} 
                />
              </View>
            )}
            {/* Display Damage Images */}
            {item.damageImageUrls && item.damageImageUrls.length > 0 && (
              <View style={styles.damageImagesSectionContainer}>
                <Text style={styles.damageImagesTitle}>Attached Images:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.damageImagesScrollContainer}>
                  {item.damageImageUrls.map((imageUrl, index) => (
                    <TouchableOpacity key={index} onPress={() => openImageViewer(item.damageImageUrls || [], index)}>
                      <Image 
                        source={{ uri: imageUrl }}
                        style={styles.damageImageThumbnail}
                        onError={(e) => console.log(`Failed to load image: ${imageUrl}`, e.nativeEvent.error)}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {item.updatedBy && <Text style={styles.updatedByText}>By: {userName}</Text>}
          </View>
        );
      })}
      {/* Image Viewer Modal - a simple implementation for now */}
      <Modal visible={imageViewer.visible} transparent={true} onRequestClose={closeImageViewer}>
        <View style={styles.imageViewerBackdrop}>
          <TouchableOpacity style={styles.imageViewerCloseButton} onPress={closeImageViewer}>
            <X size={30} color="#FFFFFF" />
          </TouchableOpacity>
          {/* For a proper image viewer, you'd use a library like react-native-image-viewing */}
          {/* This is a very basic display of the selected image */}
          {imageViewer.images.length > 0 && imageViewer.images[imageViewer.index] && (
            <Image 
                source={{ uri: imageViewer.images[imageViewer.index].url }}
                style={styles.imageViewerMainImage}
                resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

interface MobileMaintenanceRecordFormProps {
  onSubmit: (record: Omit<MaintenanceRecordType, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  disabled?: boolean;
}

const MobileMaintenanceRecordForm: React.FC<MobileMaintenanceRecordFormProps> = ({ onSubmit, disabled }) => {
  const [formData, setFormData] = useState<Omit<MaintenanceRecordType, 'id' | 'createdAt' | 'createdBy'>>({
    date: new Date().toISOString().split('T')[0], // Will be set to current on submit
    type: 'maintenance',
    description: '',
    performedBy: '',
    cost: undefined,
    notes: '',
    estimatedReturnDate: undefined,
    repairDeadline: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Date Picker State
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [currentDateField, setCurrentDateField] = useState<'estimatedReturnDate' | 'repairDeadline' | null>(null);
  const [selectedDateValue, setSelectedDateValue] = useState<Date>(new Date());

  const handleInputChange = (field: keyof typeof formData, value: string | number | undefined | MaintenanceType) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showDatePickerFor = (field: 'estimatedReturnDate' | 'repairDeadline') => {
    setCurrentDateField(field);
    setSelectedDateValue(formData[field] ? new Date(formData[field]!) : new Date());
    setDatePickerVisible(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setDatePickerVisible(Platform.OS === 'ios'); // Keep open on iOS until user confirms
    if (selectedDate && currentDateField) {
      const dateString = selectedDate.toISOString().split('T')[0];
      handleInputChange(currentDateField, dateString);
      setSelectedDateValue(selectedDate); // Update the picker's current date
      if (Platform.OS !== 'ios') { // Auto-close on Android after selection
        setCurrentDateField(null);
      }
    } else if (Platform.OS !== 'ios') { // Handle cancel on Android
        setDatePickerVisible(false);
        setCurrentDateField(null);
    }
  };

  const confirmIOSDate = () => {
    setDatePickerVisible(false);
    setCurrentDateField(null);
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.performedBy) {
      Alert.alert("Missing Fields", "Please fill in description and performed by.");
      return;
    }
    if (formData.type === 'repair' && !formData.estimatedReturnDate) {
        Alert.alert("Missing Fields", "Please provide an estimated return date for repairs.");
        return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        date: new Date().toISOString(), // Set current date on submission
        cost: formData.cost ? Number(formData.cost) : undefined, // Ensure cost is a number
      });
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'maintenance',
        description: '',
        performedBy: '',
        cost: undefined,
        notes: '',
        estimatedReturnDate: undefined,
        repairDeadline: undefined,
      });
      Alert.alert("Success", "Maintenance record added.");
    } catch (error) {
      console.error("Error in MobileMaintenanceRecordForm:", error)
      Alert.alert("Error", "Failed to add record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}> 
      <Text style={styles.formLabel}>Record Type</Text>
      <TouchableOpacity onPress={() => setShowTypePicker(true)} style={styles.pickerButton} disabled={disabled || isSubmitting}>
        <Text style={styles.pickerButtonText}>{maintenanceTypeLabels[formData.type]}</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showTypePicker}
        onRequestClose={() => setShowTypePicker(false)}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Record Type</Text>
            {Object.entries(maintenanceTypeLabels).map(([typeValue, label]) => (
              <TouchableOpacity 
                key={typeValue} 
                style={styles.modalItem}
                onPress={() => {
                  handleInputChange('type', typeValue as MaintenanceType);
                  setShowTypePicker(false);
                }}
              >
                <Text style={styles.modalItemText}>{label}</Text>
              </TouchableOpacity>
            ))}
            <Button title="Cancel" onPress={() => setShowTypePicker(false)} color="#EF4444"/>
          </View>
        </View>
      </Modal>

      <Text style={styles.formLabel}>Performed By</Text>
      <TextInput
        style={styles.textInput}
        value={formData.performedBy}
        onChangeText={(val) => handleInputChange('performedBy', val)}
        placeholder="Person or company name"
        editable={!disabled && !isSubmitting}
      />

      <Text style={styles.formLabel}>Description</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        value={formData.description}
        onChangeText={(val) => handleInputChange('description', val)}
        placeholder="Details of work done..."
        multiline
        numberOfLines={4}
        editable={!disabled && !isSubmitting}
      />

      {formData.type === 'repair' && (
        <>
          <Text style={styles.formLabel}>Estimated Return Date (for Repairs)</Text>
          <TouchableOpacity onPress={() => showDatePickerFor('estimatedReturnDate')} style={styles.datePickerButton} disabled={disabled || isSubmitting}>
            <Text style={styles.datePickerButtonText}>{formData.estimatedReturnDate ? formatDate(formData.estimatedReturnDate) : "Select Date"}</Text>
          </TouchableOpacity>

          <Text style={styles.formLabel}>Repair Deadline (Optional)</Text>
          <TouchableOpacity onPress={() => showDatePickerFor('repairDeadline')} style={styles.datePickerButton} disabled={disabled || isSubmitting}>
            <Text style={styles.datePickerButtonText}>{formData.repairDeadline ? formatDate(formData.repairDeadline) : "Select Date"}</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.formLabel}>Cost (Optional)</Text>
      <TextInput
        style={styles.textInput}
        value={formData.cost?.toString() || ''}
        onChangeText={(val) => handleInputChange('cost', val ? parseFloat(val) : undefined)}
        placeholder="0.00"
        keyboardType="numeric"
        editable={!disabled && !isSubmitting}
      />

      <Text style={styles.formLabel}>Additional Notes (Optional)</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        value={formData.notes || ''}
        onChangeText={(val) => handleInputChange('notes', val)}
        placeholder="Any extra details..."
        multiline
        numberOfLines={3}
        editable={!disabled && !isSubmitting}
      />
      <TouchableOpacity 
        style={[styles.submitButton, (disabled || isSubmitting) && styles.disabledButton]}
        onPress={handleSubmit} 
        disabled={disabled || isSubmitting}
      >
        <Text style={styles.submitButtonText}>{isSubmitting ? "Adding..." : "Add Record"}</Text>
      </TouchableOpacity>

      {/* DateTimePicker Modal/Component */}
      {datePickerVisible && (
        <> 
          {Platform.OS === 'ios' && (
            <Modal transparent={true} animationType="slide" visible={datePickerVisible} onRequestClose={() => setDatePickerVisible(false)}>
              <View style={styles.iosDatePickerModalContainer}>
                  <View style={styles.iosDatePickerHeader}>
                      <Button title="Done" onPress={confirmIOSDate} />
                  </View>
                  <DateTimePicker
                    value={selectedDateValue}
                    mode="date"
                    display="inline" // or "spinner" for iOS
                    onChange={onDateChange}
                  />
              </View>
            </Modal>
          )}
          {Platform.OS === 'android' && (
             <DateTimePicker
                value={selectedDateValue}
                mode="date"
                display="default" // "default" or "spinner" for Android
                onChange={onDateChange}
              />
          )}
        </>
      )}
    </View>
  );
};

interface MobileMaintenanceHistoryListProps {
  records: MaintenanceRecordType[];
  userProfiles: Record<string, UserProfileInfo>; // Pass profiles map
}

const MobileMaintenanceHistoryList: React.FC<MobileMaintenanceHistoryListProps> = ({ records, userProfiles }) => {
  const { width } = useWindowDimensions(); 

  if (!records || records.length === 0) {
    return <Text style={styles.placeholderText}>No maintenance records yet.</Text>;
  }
  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const baseStyle = {
    color: '#D1D5DB', 
    fontSize: 14,
  };
  const tagsStyles = {
    p: { marginVertical: 4 },
    ul: { marginVertical: 4 },
    ol: { marginVertical: 4 },
    li: { marginVertical: 2 },
    strong: { fontWeight: 'bold' as 'bold' },
    em: { fontStyle: 'italic' as 'italic' },
  };
  const descriptionTitleStyle = {
    color: '#9CA3AF', 
    fontSize: 12,
    fontWeight: '600' as '600',
    textTransform: 'uppercase' as 'uppercase',
    marginTop: 6,
    marginBottom: 2,
  };

  return (
    <View style={styles.historyListContainer}>
      {sortedRecords.map((record) => {
        const userName = userProfiles[record.createdBy]?.displayName || record.createdBy.substring(0,10) + '...';
        return (
          <View key={record.id || record.date} style={styles.historyItemContainer}>
            <View style={styles.historyItemHeader}>
              <View>
                  <Text style={styles.recordTypeLabel}>{maintenanceTypeLabels[record.type]}</Text>
                  <Text style={styles.historyItemDate}>{new Date(record.date).toLocaleDateString()}</Text>
              </View>
              {record.cost !== undefined && <Text style={styles.costText}>Cost: ${record.cost.toFixed(2)}</Text>}
            </View>
            <Text style={styles.performedByText}><Users size={14} color="#9CA3AF"/> Performed by: {record.performedBy}</Text>
            
            {record.description && (
              <>
                <Text style={descriptionTitleStyle}>Description:</Text>
                <View style={styles.notesHtmlContainer}>
                  <RenderHTML
                    contentWidth={width - (styles.historyItemContainer.padding * 2 || 32)} 
                    source={{ html: `<div style="font-size: 14px; color: #D1D5DB;">${record.description}</div>` }}
                    baseStyle={baseStyle}
                    tagsStyles={tagsStyles}
                    systemFonts={[Platform.OS === 'ios' ? 'System' : 'sans-serif']}
                  />
                </View>
              </>
            )}
            
            {record.type === 'repair' && (
              <View style={styles.repairDatesContainer}>
                {record.estimatedReturnDate && <Text style={styles.repairDateText}><CalendarDays size={14} color="#9CA3AF"/> Est. Return: {formatDate(record.estimatedReturnDate)}</Text>}
                {record.repairDeadline && <Text style={styles.repairDateText}><CalendarDays size={14} color="#F87171"/> Deadline: {formatDate(record.repairDeadline)}</Text>}
              </View>
            )}
            {record.notes && (
              <>
                <Text style={descriptionTitleStyle}>Notes:</Text>
                <View style={styles.notesHtmlContainer}>
                  <RenderHTML
                    contentWidth={width - (styles.historyItemContainer.padding * 2 || 32)} 
                    source={{ html: `<div style="font-size: 14px; color: #D1D5DB;">${record.notes}</div>` }}
                    baseStyle={baseStyle}
                    tagsStyles={tagsStyles}
                    systemFonts={[Platform.OS === 'ios' ? 'System' : 'sans-serif']}
                  />
                </View>
              </>
            )}
            {record.createdBy && <Text style={styles.updatedByText}>Logged by: {userName}</Text>}
          </View>
        );
      })}
    </View>
  );
};

export default function NativePropDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { service: firebaseService } = useFirebase();
  const [prop, setProp] = useState<PropWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState('Details');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileInfo>>({}); // Cache for user profiles

  // Fetch prop data and associated user profiles
  const fetchPropData = useCallback(async () => {
    if (!id || !firebaseService?.getDocument) {
      setError('Required information missing to fetch prop.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setImageError(false);
    try {
      const propDoc = await firebaseService.getDocument<Prop>('props', id);
      if (propDoc && propDoc.data) {
        const { id: dataId, ...restOfData } = propDoc.data; // Destructure to remove dataId from spread
        const fetchedProp: PropWithHistory = {
          id: propDoc.id, // Explicitly use the document ID from snapshot
          ...restOfData,
          // Ensure history arrays are initialized if not present in restOfData (though they should be if Prop type includes them)
          statusHistory: restOfData.statusHistory || [], 
          maintenanceHistory: restOfData.maintenanceHistory || [],
        } as PropWithHistory;
        setProp(fetchedProp);

        // Collect UIDs from history
        const uidsToFetch = new Set<string>();
        fetchedProp.statusHistory?.forEach(item => item.updatedBy && uidsToFetch.add(item.updatedBy));
        fetchedProp.maintenanceHistory?.forEach(record => record.createdBy && uidsToFetch.add(record.createdBy));
        
        // Fetch profiles for these UIDs if not already cached
        const profilesToUpdate: Record<string, UserProfileInfo> = {};
        for (const uid of uidsToFetch) {
          if (!userProfiles[uid] && firebaseService.getDocument) { // Check if service.getDocument exists
            try {
              const userDoc = await firebaseService.getDocument<{displayName: string}>('userProfiles', uid);
              if (userDoc && userDoc.data && userDoc.data.displayName) {
                profilesToUpdate[uid] = { displayName: userDoc.data.displayName };
              } else {
                profilesToUpdate[uid] = { displayName: uid.substring(0, 10) + '...' }; // Fallback if no name
              }
            } catch (profileError) {
              console.warn(`Failed to fetch profile for UID ${uid}:`, profileError);
              profilesToUpdate[uid] = { displayName: uid.substring(0, 10) + '...' }; // Fallback on error
            }
          }
        }
        if (Object.keys(profilesToUpdate).length > 0) {
          setUserProfiles(prevProfiles => ({ ...prevProfiles, ...profilesToUpdate }));
        }
      } else {
        setError('Prop not found.');
      }
    } catch (err) {
      console.error("Error fetching prop details or user profiles:", err);
      setError('Failed to load prop details.');
    } finally {
      setLoading(false);
    }
  }, [id, firebaseService]); // REMOVED userProfiles from dependency array

  useEffect(() => {
    fetchPropData();
  }, [fetchPropData]);

  // --- Handlers --- 
  const handleDelete = async () => {
    if (!id || !firebaseService?.deleteDocument) {
      Alert.alert('Error', 'Cannot delete prop. Service unavailable.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this prop?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await firebaseService.deleteDocument('props', id);
              console.log('Prop deleted:', id);
              Alert.alert('Success', 'Prop deleted successfully.');
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/propsTab'); // Or a suitable default route
              }
            } catch (err) {
              console.error('Error deleting prop:', err);
              Alert.alert('Error', 'Failed to delete prop.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleStatusUpdate = useCallback(async (newStatus: PropLifecycleStatus, notes: string, notifyTeam: boolean, damageImageUris: string[]) => {
    if (!prop || !id || !firebaseService?.updateDocument || !firebaseService.addDocument || !firebaseService.uploadFile) {
      Alert.alert("Error", "Service not available to update status or upload files.");
      return;
    }
    console.log("Attempting status update (Native):", { newStatus, notes, notifyTeam, damageImageUris });
    
    const uploadedImageUrls: string[] = [];
    if (damageImageUris && damageImageUris.length > 0) {
      Alert.alert("Uploading Images", `Starting upload of ${damageImageUris.length} image(s)...`);
      try {
        for (const uri of damageImageUris) {
          const fileName = uri.split('/').pop() || `image-${Date.now()}`;
          const storagePath = `props/${id}/status_damages/${Date.now()}-${fileName}`;
          const downloadURL = await firebaseService.uploadFile(storagePath, uri); 
          uploadedImageUrls.push(downloadURL);
        }
        Alert.alert("Upload Complete", `${uploadedImageUrls.length} image(s) uploaded successfully.`);
      } catch (uploadError: any) {
        console.error("Error uploading damage images:", uploadError);
        Alert.alert("Image Upload Failed", `Could not upload images: ${uploadError.message || 'Unknown error'}. Status will be updated without images.`);
      }
    }

    const statusUpdateRecord: Omit<PropStatusUpdateType, 'id' | 'createdAt'> = {
      date: new Date().toISOString(),
      previousStatus: prop.status as PropLifecycleStatus,
      newStatus: newStatus,
      notes: notes,
      updatedBy: firebaseService.auth().currentUser?.uid || 'native-user-placeholder',
      notified: notifyTeam ? [/* Add relevant user IDs/emails */] : [],
      damageImageUrls: uploadedImageUrls,
    };

    try {
      const updatedHistory = [...(prop.statusHistory || []), { ...statusUpdateRecord, id: `status_${Date.now()}`, createdAt: new Date().toISOString() }];
      
      await firebaseService.updateDocument('props', id, {
        status: newStatus,
        statusNotes: notes,
        lastStatusUpdate: new Date().toISOString(),
        statusHistory: updatedHistory,
      });
      Alert.alert('Success', 'Status updated successfully!');
      fetchPropData();
    } catch (err) {
      console.error("Error in handleStatusUpdate (Native):", err);
      Alert.alert("Error", "Failed to update status record.");
    }
  }, [prop, id, firebaseService, fetchPropData]);

  const handleAddMaintenanceRecord = useCallback(async (recordData: Omit<MaintenanceRecordType, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!prop || !id || !firebaseService?.updateDocument || !firebaseService.addDocument) return;
    console.log("Adding maintenance record (Native):", recordData);

    const newRecord: MaintenanceRecordType = {
      ...recordData,
      id: `maint_${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: firebaseService.auth().currentUser?.uid || 'native-user-placeholder',
    };

    try {
      const updatedHistory = [...(prop.maintenanceHistory || []), newRecord];

      await firebaseService.updateDocument('props', id, {
        maintenanceHistory: updatedHistory,
        lastMaintenanceDate: newRecord.date,
      });
      Alert.alert('Success', 'Maintenance record added successfully!');
      fetchPropData();
    } catch (err) {
      console.error("Error in handleAddMaintenanceRecord (Native):", err);
      Alert.alert("Error", "Failed to add maintenance record.");
    }
  }, [prop, id, firebaseService, fetchPropData]);

  // --- Render Methods ---
  const renderImage = () => {
    const primaryImageUrl = prop?.images && prop.images.length > 0 ? prop.images[0]?.url : null;
    
    if (imageError || !primaryImageUrl) {
      return (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>{prop?.name?.[0]?.toUpperCase()}</Text>
        </View>
      );
    }
    const imageSource = { uri: primaryImageUrl };
    if (isValidImageSource(imageSource)) {
        return (
          <Image
            source={imageSource} 
            style={styles.propImage}
            onError={() => setImageError(true)}
            resizeMode="contain" // Ensure the image fits well
          />
        );
    } else {
         return (
            <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>{prop?.name?.[0]?.toUpperCase()}</Text>
            </View>
         );
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#FFFFFF" /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (!prop) {
    return <View style={styles.centered}><Text style={styles.text}>Prop data unavailable.</Text></View>;
  }

  // DetailItem component (from web, adapted for native)
  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode | string | number | undefined | null }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <View style={styles.detailItemContainer}>
        <Text style={styles.detailItemLabel}>{label}</Text>
        <Text style={styles.detailItemValue}>{String(value)}</Text>
      </View>
    );
  };

  // TabButton component (adapted for native)
  const TabButton = ({ label, active, onPress, icon: Icon }: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon: React.ElementType;
  }) => {
    return (
      <TouchableOpacity 
        style={[styles.tabButton, active && styles.activeTabButton]}
        onPress={onPress}
      >
        <View><Icon size={18} color={active ? '#3B82F6' : '#9CA3AF'} style={styles.tabIcon} /></View>
        <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: prop?.name || 'Prop Detail' }} />
      
      {renderImage()}

      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
            <Text style={styles.propName}>{prop.name}</Text>
            {(prop.act || prop.scene) && (
                <Text style={styles.actSceneText}>
                    {prop.act ? `Act ${prop.act}` : ''}{prop.act && prop.scene ? ', ' : ''}{prop.scene ? `Scene ${prop.scene}` : ''}
                </Text>
            )}
        </View>
        <View style={styles.headerActionsContainer}>
            <TouchableOpacity 
              onPress={() => router.push(`/props/${id}/edit`)} // Assuming edit route exists or will be created for mobile
              style={styles.actionButton}
            >
                <View><Pencil size={20} color="#60A5FA" /></View>{/* blue-400 */}
                {/* <Text>Edit</Text> */}{/* Placeholder for debugging */}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                <View><Trash2 size={20} color="#F87171" /></View>{/* red-400 */}
                {/* <Text>Del</Text> */}{/* Placeholder for debugging */}
            </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton 
          label="Details" 
          active={activeTab === 'Details'} 
          onPress={() => setActiveTab('Details')} 
          icon={ClipboardList}
        />
        <TabButton 
          label="Status" 
          active={activeTab === 'Status Updates'} 
          onPress={() => setActiveTab('Status Updates')} 
          icon={History} 
        />
        <TabButton 
          label="Maintenance" 
          active={activeTab === 'Maintenance Records'} 
          onPress={() => setActiveTab('Maintenance Records')} 
          icon={Wrench}
        />
      </View>

      {/* Tab Content */}
      {activeTab === 'Details' && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <View style={styles.detailsSection}>
            <DetailItem label="Description" value={prop.description} />
            <DetailItem label="Category" value={prop.category} />
            <DetailItem label="Subcategory" value={prop.subcategory} />
            <DetailItem label="Quantity" value={prop.quantity} />
            <DetailItem label="Condition" value={prop.condition} />
            <DetailItem label="Materials" value={prop.materials?.join(', ')} />
            <DetailItem label="Period" value={prop.period} />
            <DetailItem label="Style" value={prop.style} />
            <DetailItem label="Color" value={prop.color} />
            <DetailItem label="Tags" value={prop.tags?.join(', ')} />
            <DetailItem label="Barcode" value={prop.barcode} />
          </View>

          <Text style={styles.sectionTitle}>Source & Financials</Text>
          <View style={styles.detailsSection}>
            <DetailItem label="Source" value={prop.source} />
            {prop.source === 'rented' && <DetailItem label="Rental Source" value={prop.rentalSource} />}
            {prop.source === 'rented' && <DetailItem label="Rental Reference No." value={prop.rentalReferenceNumber} />}
            {prop.source === 'rented' && <DetailItem label="Rental Due Date" value={formatDate(prop.rentalDueDate)} />}
            <DetailItem label="Source Details" value={prop.sourceDetails} />
            <DetailItem label="Purchase Price" value={prop.price ? `$${prop.price.toFixed(2)}` : undefined} />
            <DetailItem label="Purchase Date" value={formatDate(prop.purchaseDate)} />
            <DetailItem label="Purchase URL" value={prop.purchaseUrl} />
            <DetailItem label="Replacement Cost" value={prop.replacementCost ? `$${prop.replacementCost.toFixed(2)}` : undefined} />
            <DetailItem label="Replacement Lead Time (days)" value={prop.replacementLeadTime} />
            {prop.warranty && (
                <>
                    <DetailItem label="Warranty Provider" value={prop.warranty.provider} />
                    <DetailItem label="Warranty Expiration" value={formatDate(prop.warranty.expirationDate)} />
                    <DetailItem label="Warranty Details" value={prop.warranty.details} />
                </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Physical Attributes</Text>
          <View style={styles.detailsSection}>
            <DetailItem label="Dimensions (L x W x H x D)" value={
              (prop.length || prop.width || prop.height || prop.depth) ? 
              `${prop.length || 'N/A'}${prop.unit || ''} L x ${prop.width || 'N/A'}${prop.unit || ''} W x ${prop.height || 'N/A'}${prop.unit || ''} H ${prop.depth ? `x ${prop.depth}${prop.unit || ''} D` : ''}`.trim() :
              undefined
            } />
            <DetailItem label="Weight" value={prop.weight ? `${prop.weight} ${prop.weightUnit || ''}`.trim() : undefined} />
            <DetailItem label="Travel Weight" value={prop.travelWeight ? `${prop.travelWeight} ${prop.weightUnit || ''}`.trim() : undefined} />
          </View>
          
          <Text style={styles.sectionTitle}>Usage & Handling</Text>
          <View style={styles.detailsSection}>
            <DetailItem label="Consumable" value={prop.isConsumable ? 'Yes' : 'No'} />
            <DetailItem label="Handedness" value={prop.handedness} />
            <DetailItem label="Breakable" value={prop.isBreakable ? 'Yes' : 'No'} />
            <DetailItem label="Hazardous" value={prop.isHazardous ? 'Yes' : 'No'} />
            <DetailItem label="Usage Instructions" value={prop.usageInstructions} />
            <DetailItem label="Maintenance Notes" value={prop.maintenanceNotes} />
            <DetailItem label="Safety Notes" value={prop.safetyNotes} />
            <DetailItem label="Handling Instructions" value={prop.handlingInstructions} />
            <DetailItem label="Storage Requirements" value={prop.storageRequirements} />
            <DetailItem label="General Notes" value={prop.notes} />
            <DetailItem label="Scene Notes" value={prop.sceneNotes} />
            <DetailItem label="Usage Notes" value={prop.usageNotes} />
            <DetailItem label="Public Notes" value={prop.publicNotes} />
            <DetailItem label="Current Location" value={prop.currentLocation} />
            <DetailItem label="Storage Location (Primary)" value={prop.location} />
          </View>

          {(prop.hasBeenModified || prop.modificationDetails || prop.lastModifiedAt) && (
            <>
              <Text style={styles.sectionTitle}>Modification Information</Text>
              <View style={styles.detailsSection}>
                <DetailItem label="Modified" value={prop.hasBeenModified ? 'Yes' : 'No'} />
                <DetailItem label="Modification Details" value={prop.modificationDetails} />
                <DetailItem label="Last Modified Date" value={formatDate(prop.lastModifiedAt)} />
              </View>
            </>
          )}
          
          {(prop.requiresPreShowSetup || prop.preShowSetupNotes || prop.preShowSetupDuration) && (
            <>
              <Text style={styles.sectionTitle}>Pre-Show Setup</Text>
              <View style={styles.detailsSection}>
                <DetailItem label="Requires Pre-Show Setup" value={prop.requiresPreShowSetup ? 'Yes' : 'No'} />
                <DetailItem label="Setup Duration (minutes)" value={prop.preShowSetupDuration} />
                <DetailItem label="Setup Notes" value={prop.preShowSetupNotes} />
                <DetailItem label="Setup Video URL" value={prop.preShowSetupVideo} />
              </View>
            </>
          )}

          {(prop.hasOwnShippingCrate || prop.shippingCrateDetails || prop.travelsUnboxed !== undefined || prop.requiresSpecialTransport || prop.transportMethod || prop.transportNotes) && (
            <>
              <Text style={styles.sectionTitle}>Shipping & Transport</Text>
              <View style={styles.detailsSection}>
                <DetailItem label="Travels Unboxed" value={prop.travelsUnboxed ? 'Yes' : 'No'} />
                <DetailItem label="Has Own Shipping Crate" value={prop.hasOwnShippingCrate ? 'Yes' : 'No'} />
                <DetailItem label="Shipping Crate Details" value={prop.shippingCrateDetails} />
                <DetailItem label="Requires Special Transport" value={prop.requiresSpecialTransport ? 'Yes' : 'No'} />
                <DetailItem label="Transport Method" value={prop.transportMethod} />
                <DetailItem label="Transport Notes" value={prop.transportNotes} />
              </View>
            </>
          )}
          
          {prop.statusNotes && ( // Current status notes are often part of the status itself or a specific field
            <>
              <Text style={styles.sectionTitle}>Status Notes</Text>
              <View style={styles.detailsSection}>
                <DetailItem label="Current Status Notes" value={prop.statusNotes} />
              </View>
            </>
          )}
          
          {/* TODO: Display Digital Assets (images, videos, documents) - potentially in a gallery or list */}
          {/* TODO: Display Custom Fields */}

        </View>
      )}

      {activeTab === 'Status Updates' && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.sectionTitle}>Update Prop Status</Text>
          <MobilePropStatusUpdateForm 
            currentStatus={prop.status as PropLifecycleStatus} 
            onSubmit={async (newStatus, notes, notifyTeam, damageImageUris) => {
              await handleStatusUpdate(newStatus, notes, notifyTeam, damageImageUris);
            }}
            disabled={loading}
          />
          <Text style={styles.sectionTitle}>Status History</Text>
          <MobileStatusHistoryList history={prop.statusHistory || []} userProfiles={userProfiles} />
        </View>
      )}

      {activeTab === 'Maintenance Records' && (
        <View style={styles.tabContentContainer}>
          <Text style={styles.sectionTitle}>Add Maintenance Record</Text>
          <MobileMaintenanceRecordForm 
            onSubmit={async (recordData) => {
              await handleAddMaintenanceRecord(recordData);
            }}
            disabled={loading} 
          />
          <Text style={styles.sectionTitle}>Maintenance History</Text>
          <MobileMaintenanceHistoryList records={prop.maintenanceHistory || []} userProfiles={userProfiles} />
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // gray-900 from web
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  errorText: {
    color: '#EF4444', // red-500
    fontSize: 18,
    textAlign: 'center',
  },
  text: {
    color: '#F9FAFB', // gray-50
    fontSize: 16,
    marginBottom: 8,
  },
  propImage: {
    width: '100%',
    height: 250, // Adjust as needed
    borderRadius: 8,
    backgroundColor: '#374151', // gray-700 for background while loading
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250, // Adjust as needed
    backgroundColor: '#4B5563', // gray-600
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
  },
  imagePlaceholderText: {
    color: '#D1D5DB', // gray-300
    fontSize: 50,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  propName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB', // gray-50
    marginBottom: 4,
  },
  actSceneText: {
    fontSize: 14,
    color: '#9CA3AF', // gray-400
  },
  headerActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    // backgroundColor: '#374151', // gray-700 - optional background
    // borderRadius: 20, 
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // gray-700
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6', // blue-500
  },
  tabIcon: {
    marginRight: 6,
  },
  tabButtonText: {
    fontSize: 14, // Smaller for mobile tabs
    color: '#9CA3AF', // gray-400
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#3B82F6', // blue-500
  },
  tabContentContainer: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E5E7EB', // gray-200
    marginTop: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563', // gray-600
    paddingBottom: 6,
  },
  detailsSection: {
    backgroundColor: '#1F2937', // gray-800 from web
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailItemContainer: {
    marginBottom: 12,
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#9CA3AF', // gray-400
    marginBottom: 2,
    textTransform: 'uppercase', 
    fontWeight: '600',
  },
  detailItemValue: {
    fontSize: 16,
    color: '#F3F4F6', // gray-100
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF', // gray-400
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Styles for MobilePropStatusUpdateForm
  formContainer: {
    padding: 16,
    backgroundColor: '#1F2937', // gray-800
    borderRadius: 8,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    color: '#E5E7EB', // gray-200
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: '#374151', // gray-700
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#F9FAFB', // gray-50
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1F2937', // gray-800
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB', // gray-50
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // gray-700
  },
  modalItemText: {
    color: '#F3F4F6', // gray-100
    fontSize: 16,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#374151', // gray-700
    color: '#F9FAFB', // gray-50
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80, 
    textAlignVertical: 'top', // for Android
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#2563EB', // blue-600
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#4B5563', // gray-600
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Styles for MobileStatusHistoryList
  historyListContainer: {
    marginTop: 10,
  },
  historyItemContainer: {
    backgroundColor: '#1F2937', // gray-800
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#9CA3AF', // gray-400
  },
  notifiedBadge: {
    fontSize: 10,
    color: '#10B981', // emerald-500
    backgroundColor: '#047857', // emerald-700 (darker for contrast)
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusCritical: { color: '#EF4444' }, // red-500
  statusHigh: { color: '#F97316' }, // orange-500
  statusMedium: { color: '#EAB308' }, // yellow-500
  statusLow: { color: '#3B82F6' }, // blue-500
  statusInfo: { color: '#6B7280' }, // gray-500
  historyItemNotes: {
    fontSize: 14,
    color: '#D1D5DB', // gray-300
    marginTop: 4,
    marginBottom: 4,
  },
  updatedByText: {
    fontSize: 10,
    color: '#6B7280', // gray-500
    marginTop: 4,
    textAlign: 'right'
  },
  // Styles for MobileMaintenanceRecordForm
  recordTypeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E5E7EB', // gray-200
    marginBottom: 2,
  },
  costText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A5B4FC', // indigo-300
  },
  performedByText: {
    fontSize: 14,
    color: '#D1D5DB', // gray-300
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionTextTitle: {
    fontSize: 12,
    color: '#9CA3AF', // gray-400
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase'
  },
  repairDatesContainer: {
    marginTop: 8,
    marginBottom: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#4B5563', // gray-600
  },
  repairDateText: {
    fontSize: 13,
    color: '#D1D5DB', // gray-300
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerButton: {
    backgroundColor: '#374151', // gray-700
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#F9FAFB', // gray-50
    fontSize: 16,
  },
  iosDatePickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  iosDatePickerHeader: {
    backgroundColor: '#27272a', // zinc-800 or similar dark theme color
    padding: 10,
    alignItems: 'flex-end',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  notesHtmlContainer: { 
    marginTop: 4,
    marginBottom: 4,
  },
  imagePickerButton: {
    flexDirection: 'row',
    backgroundColor: '#4B5563',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 4,
    zIndex: 1,
  },
  damageImagesSectionContainer: { // Container for the title and image scrollview
    marginTop: 8,
  },
  damageImagesTitle: { // Title for the damage images section
    fontSize: 13,
    color: '#9CA3AF', // gray-400
    marginBottom: 4,
    fontWeight: '500',
  },
  damageImagesScrollContainer: { // Horizontal scroll view for images
    flexDirection: 'row',
  },
  damageImageThumbnail: { // Style for each image thumbnail
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: '#374151', // gray-700 as placeholder background
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  imageViewerMainImage: {
    width: '90%',
    height: '80%',
  },
}); 