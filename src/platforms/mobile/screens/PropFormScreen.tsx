import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { QRScannerScreen } from '../features/qr/QRScannerScreen.tsx';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import LinearGradient from 'react-native-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { propCategories as defaultPropCategories } from '../../../shared/types/props.ts';
import { useShows } from '../../../contexts/ShowsContext';
import { globalStyles } from '../../../styles/globalStyles';

interface PropFormData {
  name: string;
  description: string;
  category: string;
  location: string;
  images: string[];
  qrCode?: string;
  quantity: string;
  condition: string;
  materials: string;
  length: string;
  width: string;
  height: string;
  depth: string;
  unit: string;
  weight: string;
  weightUnit: string;
  source: string;
  sourceDetails: string;
  rentalSource: string;
  rentalDueDate: string;
  price: string;
  isConsumable: boolean;
  isBreakable: boolean;
  hasUsageInstructions: boolean;
  hasMaintenanceNotes: boolean;
  hasSafetyNotes: boolean;
  isHazardous: boolean;
  hasBeenModified: boolean;
  usageInstructions: string;
  maintenanceNotes: string;
  safetyNotes: string;
  modificationDetails: string;
  requiresPreShowSetup: boolean;
  preShowSetupDuration: string;
  preShowSetupNotes: string;
  preShowSetupVideo: string;
  hasOwnShippingCrate: boolean;
  requiresSpecialTransport: boolean;
  travelsUnboxed: boolean;
  travelWeight: string;
  status: string;
  statusNotes: string;
  currentLocation: string;
  tags: string;
  handedness: string;
  purchaseUrl: string;
  rentalReferenceNumber: string;
  usageImages: string[];
  usageVideo: string;
  dueBackDate?: string;
  makerName?: string;
  notifyPropsDept?: boolean;
  damagePhoto?: string[];
  deliveryDate?: string;
  deliveryVenue?: string;
  whoHasBackup?: string;
  disposed?: boolean;
  handleWithCare?: boolean;
  isFragile?: boolean;
  hasBattery?: boolean;
  act?: number;
  scene?: number;
  isMultiScene?: boolean;
}

const defaultForm: PropFormData = {
  name: '',
  description: '',
  category: '',
  location: '',
  images: [],
  quantity: '1',
  condition: '',
  materials: '',
  length: '',
  width: '',
  height: '',
  depth: '',
  unit: 'cm',
  weight: '',
  weightUnit: 'kg',
  source: '',
  sourceDetails: '',
  rentalSource: '',
  rentalDueDate: '',
  price: '',
  isConsumable: false,
  isBreakable: false,
  hasUsageInstructions: false,
  hasMaintenanceNotes: false,
  hasSafetyNotes: false,
  isHazardous: false,
  hasBeenModified: false,
  usageInstructions: '',
  maintenanceNotes: '',
  safetyNotes: '',
  modificationDetails: '',
  requiresPreShowSetup: false,
  preShowSetupDuration: '',
  preShowSetupNotes: '',
  preShowSetupVideo: '',
  hasOwnShippingCrate: false,
  requiresSpecialTransport: false,
  travelsUnboxed: false,
  travelWeight: '',
  status: '',
  statusNotes: '',
  currentLocation: '',
  tags: '',
  handedness: '',
  purchaseUrl: '',
  rentalReferenceNumber: '',
  usageImages: [],
  usageVideo: '',
  dueBackDate: '',
  makerName: '',
  notifyPropsDept: false,
  damagePhoto: [],
  deliveryDate: '',
  deliveryVenue: '',
  whoHasBackup: '',
  disposed: false,
  handleWithCare: false,
  isFragile: false,
  hasBattery: false,
  act: 1,
  scene: 1,
  isMultiScene: false,
};

const locationOptions = [
  { label: 'Rehearsal Room', value: 'rehearsal_room' },
  { label: 'Stage', value: 'stage' },
  { label: 'Props Department', value: 'props_department' },
  { label: 'With a Maker', value: 'with_maker' },
  { label: 'Not Delivered from Supplier', value: 'not_delivered' },
  { label: 'Storage', value: 'storage' },
  { label: 'Add Custom...', value: 'custom' },
];

export default function PropFormScreen({ initialValues, onSave, onSaveAndAddAnother }: {
  initialValues?: Partial<PropFormData>,
  onSave?: (data: PropFormData) => void,
  onSaveAndAddAnother?: (data: PropFormData) => void
} = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string }>();

  const { selectedShow } = useShows();

  const [form, setForm] = useState<PropFormData>({ ...defaultForm, ...initialValues });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([...defaultPropCategories]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const conditionOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'];
  const [customLocation, setCustomLocation] = useState('');

  // Act/Scene options from show details or fallback
  const actOptions = Array.isArray((selectedShow as any)?.acts) && (selectedShow as any)?.acts.length > 0
    ? (selectedShow as any).acts.map((act: any, idx: number) => ({
        label: act.name || `Act ${idx + 1}`,
        value: act.id?.toString() || (idx + 1).toString(),
      }))
    : Array.from({ length: 10 }, (_, i) => ({
        label: `Act ${i + 1}`,
        value: (i + 1).toString(),
      }));

  const sceneOptions = Array.isArray((selectedShow as any)?.scenes) && (selectedShow as any)?.scenes.length > 0
    ? (selectedShow as any).scenes.map((scene: any, idx: number) => ({
        label: scene.name || `Scene ${idx + 1}`,
        value: scene.id?.toString() || (idx + 1).toString(),
      }))
    : Array.from({ length: 20 }, (_, i) => ({
        label: `Scene ${i + 1}`,
        value: (i + 1).toString(),
      }));

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          nextStep();
        } else if (gestureState.dx > 50) {
          prevStep();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (params.photoUri) {
      handlePhotoTaken(params.photoUri);
    }
  }, [params.photoUri]);

  const handleSave = async (addAnother = false) => {
    let error = '';
    if (!form.status) error = 'Status is required.';
    if (form.status === 'with_props') {
      if (!form.statusNotes) error = 'Notes are required for "with props dept".';
      if (!form.dueBackDate) error = 'Due back date/time is required for "with props dept".';
    }
    if (form.status === 'with_maker') {
      if (!form.makerName) error = 'Maker name is required for "with a maker".';
      if (!form.dueBackDate) error = 'Due date is required for "with a maker".';
    }
    if (form.status === 'damaged_awaiting_repair' || form.status === 'damaged_awaiting_replacement') {
      if (!form.statusNotes) error = 'Damage note is required.';
      if (!form.damagePhoto || form.damagePhoto.length === 0) error = 'At least one damage photo is required.';
    }
    if (form.status === 'on_delivery') {
      if (!form.deliveryDate) error = 'Delivery date/time is required.';
      if (!form.deliveryVenue) error = 'Delivery venue is required.';
    }
    if (form.status === 'under_review') {
      if (!form.statusNotes) error = 'Notes are required for "Under Review".';
    }
    if (form.status === 'backup') {
      if (!form.whoHasBackup) error = 'Please specify who has this backup/alternate prop.';
    }
    if (form.status === 'cut') {
      if (!form.statusNotes) error = 'Please provide a note for why it was cut.';
    }
    if (!form.currentLocation || (form.currentLocation === 'custom' && !customLocation)) {
      Alert.alert('Missing Information', 'Please select or enter a location.');
      setSaving(false);
      return;
    }
    if (error) {
      Alert.alert('Missing Information', error);
      setSaving(false);
      return;
    }
    setSaving(true);
    try {
      if (onSave && !addAnother) onSave(form);
      if (onSaveAndAddAnother && addAnother) onSaveAndAddAnother(form);
      Alert.alert('Success', addAnother ? 'Prop saved! Ready for next.' : 'Prop saved!');
      if (addAnother) {
        setForm(defaultForm);
        setStep(0);
      } else {
        router.replace('/props');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save prop.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoTaken = (uri: string) => {
    setForm(prev => ({
      ...prev,
      images: [...prev.images, uri],
    }));
  };

  const handleQRScanned = (data: Record<string, any>) => {
    setForm(prev => ({
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
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handlePhotoTaken(result.assets[0].uri);
    }
  };

  const handlePickUsageVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleChange('usageVideo', result.assets[0].uri);
    }
  };

  const handlePickDamagePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleChange('damagePhoto', [...(form.damagePhoto || []), result.assets[0].uri]);
    }
  };

  // --- Stepper logic ---
  const steps = [
    'Images', 'Basic Info', 'Dimensions & Weight', 'Sourced From', 'Usage & Handling', 'Status', 'Location'
  ];

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  // --- Handlers ---
  const handleChange = (field: keyof PropFormData, value: any) => setForm(f => ({ ...f, [field]: value }));
  const handleToggle = (field: keyof PropFormData) => setForm(f => ({ ...f, [field]: !f[field] }));

  // --- Renderers for each step ---
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Add Images</Text>
            {/* Camera button */}
            <TouchableOpacity style={globalStyles.addButton}>
              <MaterialIcons name="camera-alt" size={24} color="white" />
              <Text style={globalStyles.buttonText}>Add Photo</Text>
            </TouchableOpacity>
            {/* Gallery button */}
            <TouchableOpacity style={globalStyles.addButton} onPress={handlePickImage}>
              <MaterialIcons name="photo-library" size={24} color="white" />
              <Text style={globalStyles.buttonText}>Add from Gallery</Text>
            </TouchableOpacity>
            <View style={globalStyles.imageGrid}>
              {form.images.map((uri, idx) => (
                <View key={idx} style={globalStyles.imageContainer}>
                  <Image source={{ uri }} style={globalStyles.image} />
                  <TouchableOpacity style={globalStyles.removeButton}>
                    <MaterialIcons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={nextStep} style={globalStyles.nextButton}>
              <Text style={globalStyles.nextButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );
      case 1:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Basic Info</Text>
            <TextInput style={globalStyles.input} placeholder="Name*" placeholderTextColor="#e0e0e0" value={form.name} onChangeText={v => handleChange('name', v)} />
            {/* Category Dropdown */}
            <View style={globalStyles.marginBottom16}>
              <View style={globalStyles.input}>
                <Picker
                  selectedValue={form.category}
                  onValueChange={v => {
                    if (v === '__add_new__') {
                      setShowAddCategory(true);
                    } else {
                      handleChange('category', v);
                    }
                  }}
                  dropdownIconColor="#c084fc"
                  style={globalStyles.picker}
                >
                  <Picker.Item label="Select Category*" value="" />
                  {categories.map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                  <Picker.Item label="+ Add New Category" value="__add_new__" />
                </Picker>
              </View>
              {showAddCategory && (
                <View style={[globalStyles.flexRow, globalStyles.alignCenter, globalStyles.marginTop8]}>
                  <TextInput
                    style={[globalStyles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="New Category"
                    placeholderTextColor="#e0e0e0"
                    value={newCategory}
                    onChangeText={setNewCategory}
                  />
                  <TouchableOpacity
                    style={[globalStyles.margin8, globalStyles.bgPrimary, globalStyles.padding8, globalStyles.borderRadius8]}
                    onPress={() => {
                      if (newCategory.trim() && !categories.includes(newCategory.trim())) {
                        setCategories([...categories, newCategory.trim()]);
                        handleChange('category', newCategory.trim());
                      }
                      setShowAddCategory(false);
                      setNewCategory('');
                    }}
                  >
                    <Text style={[globalStyles.colorWhite, globalStyles.fontBold]}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[globalStyles.margin8, { backgroundColor: '#404040' }, globalStyles.padding8, globalStyles.borderRadius8]}
                    onPress={() => {
                      setShowAddCategory(false);
                      setNewCategory('');
                    }}
                  >
                    <Text style={globalStyles.colorWhite}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {/* Quantity */}
            <TextInput style={globalStyles.input} placeholder="Quantity*" placeholderTextColor="#e0e0e0" value={form.quantity} onChangeText={v => handleChange('quantity', v)} keyboardType="numeric" />
            {/* Condition Dropdown */}
            <View style={globalStyles.marginBottom16}>
              <View style={globalStyles.input}>
                <Picker
                  selectedValue={form.condition}
                  onValueChange={v => handleChange('condition', v)}
                  dropdownIconColor="#c084fc"
                  style={globalStyles.picker}
                >
                  <Picker.Item label="Select Condition" value="" />
                  {conditionOptions.map(opt => (
                    <Picker.Item key={opt} label={opt} value={opt} />
                  ))}
                </Picker>
              </View>
            </View>
            <TextInput style={globalStyles.input} placeholder="Materials (comma separated)" placeholderTextColor="#e0e0e0" value={form.materials} onChangeText={v => handleChange('materials', v)} />
            {/* Act and Scene Dropdowns */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={[globalStyles.input, { flex: 1 }]}> 
                <Picker
                  selectedValue={form.act?.toString() || actOptions[0].value}
                  onValueChange={v => handleChange('act', v)}
                  dropdownIconColor="#c084fc"
                  style={globalStyles.picker}
                >
                  {actOptions.map((opt: {label: string, value: string}) => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
              <View style={[globalStyles.input, { flex: 1 }]}> 
                <Picker
                  selectedValue={form.scene?.toString() || sceneOptions[0].value}
                  onValueChange={v => handleChange('scene', v)}
                  dropdownIconColor="#c084fc"
                  style={globalStyles.picker}
                >
                  {sceneOptions.map((opt: {label: string, value: string}) => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
            </View>
            {/* Used in multiple scenes checkbox */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Switch value={!!form.isMultiScene} onValueChange={v => handleChange('isMultiScene', v)} />
              <Text style={{ color: '#fff', marginLeft: 12 }}>Used in multiple scenes</Text>
            </View>
            <View style={globalStyles.stepperNav}>
              <TouchableOpacity onPress={prevStep} disabled={Number(step) === 0}><Text style={globalStyles.stepperNavText}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextStep}><Text style={globalStyles.stepperNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Dimensions & Weight</Text>
            <TextInput style={globalStyles.input} placeholder="Length" placeholderTextColor="#e0e0e0" value={form.length} onChangeText={v => handleChange('length', v)} keyboardType="numeric" />
            <TextInput style={globalStyles.input} placeholder="Width" placeholderTextColor="#e0e0e0" value={form.width} onChangeText={v => handleChange('width', v)} keyboardType="numeric" />
            <TextInput style={globalStyles.input} placeholder="Height" placeholderTextColor="#e0e0e0" value={form.height} onChangeText={v => handleChange('height', v)} keyboardType="numeric" />
            <TextInput style={globalStyles.input} placeholder="Depth" placeholderTextColor="#e0e0e0" value={form.depth} onChangeText={v => handleChange('depth', v)} keyboardType="numeric" />
            {/* Unit Picker with border */}
            <View style={globalStyles.input}>
              <Picker
                selectedValue={form.unit}
                onValueChange={v => handleChange('unit', v)}
                dropdownIconColor="#c084fc"
                style={globalStyles.picker}
              >
                <Picker.Item label="cm" value="cm" />
                <Picker.Item label="m" value="m" />
                <Picker.Item label="in" value="in" />
                <Picker.Item label="ft" value="ft" />
              </Picker>
            </View>
            <TextInput style={globalStyles.input} placeholder="Weight" placeholderTextColor="#e0e0e0" value={form.weight} onChangeText={v => handleChange('weight', v)} keyboardType="numeric" />
            {/* Weight Unit Picker with border */}
            <View style={globalStyles.input}>
              <Picker
                selectedValue={form.weightUnit}
                onValueChange={v => handleChange('weightUnit', v)}
                dropdownIconColor="#c084fc"
                style={globalStyles.picker}
              >
                <Picker.Item label="kg" value="kg" />
                <Picker.Item label="g" value="g" />
                <Picker.Item label="lb" value="lb" />
                <Picker.Item label="oz" value="oz" />
              </Picker>
            </View>
            <View style={globalStyles.stepperNav}>
              <TouchableOpacity onPress={prevStep}><Text style={globalStyles.stepperNavText}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextStep}><Text style={globalStyles.stepperNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Sourced From</Text>
            {/* Source Type Dropdown */}
            <View style={globalStyles.input}>
              <Picker
                selectedValue={form.source}
                onValueChange={v => {
                  handleChange('source', v);
                  // Reset conditional fields when source changes
                  handleChange('sourceDetails', '');
                  handleChange('purchaseUrl', '');
                  handleChange('price', '');
                  handleChange('rentalSource', '');
                  handleChange('rentalReferenceNumber', '');
                  handleChange('rentalDueDate', '');
                }}
                dropdownIconColor="#c084fc"
                style={globalStyles.picker}
              >
                <Picker.Item label="Select Source Type*" value="" />
                <Picker.Item label="Bought" value="bought" />
                <Picker.Item label="Rented/Hired" value="rented" />
                <Picker.Item label="Made" value="made" />
                <Picker.Item label="Borrowed" value="borrowed" />
                <Picker.Item label="From Storage" value="from_storage" />
              </Picker>
            </View>
            {/* Conditional fields based on source */}
            {form.source === 'bought' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Supplier" placeholderTextColor="#e0e0e0" value={form.sourceDetails} onChangeText={v => handleChange('sourceDetails', v)} />
                <TextInput style={globalStyles.input} placeholder="Purchase URL" placeholderTextColor="#e0e0e0" value={form.purchaseUrl} onChangeText={v => handleChange('purchaseUrl', v)} />
                <TextInput style={globalStyles.input} placeholder="Unit Price" placeholderTextColor="#e0e0e0" value={form.price} onChangeText={v => handleChange('price', v)} keyboardType="numeric" />
              </>
            )}
            {form.source === 'rented' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Rental Company Name" placeholderTextColor="#e0e0e0" value={form.rentalSource} onChangeText={v => handleChange('rentalSource', v)} />
                <TextInput style={globalStyles.input} placeholder="Order Reference Number" placeholderTextColor="#e0e0e0" value={form.rentalReferenceNumber} onChangeText={v => handleChange('rentalReferenceNumber', v)} />
                {/* Date Picker for Return Date */}
                <TouchableOpacity onPress={() => { /* Placeholder for future date picker */ }}>
                  <TextInput
                    style={globalStyles.input}
                    placeholder="Return Date (YYYY-MM-DD)"
                    placeholderTextColor="#e0e0e0"
                    value={form.rentalDueDate}
                    onChangeText={v => handleChange('rentalDueDate', v)}
                  />
                </TouchableOpacity>
              </>
            )}
            {form.source === 'made' && (
              <TextInput style={globalStyles.input} placeholder="Maker Name" placeholderTextColor="#e0e0e0" value={form.sourceDetails} onChangeText={v => handleChange('sourceDetails', v)} />
            )}
            {form.source === 'borrowed' && (
              <TextInput style={globalStyles.input} placeholder="Borrowed From" placeholderTextColor="#e0e0e0" value={form.sourceDetails} onChangeText={v => handleChange('sourceDetails', v)} />
            )}
            {form.source === 'from_storage' && (
              <Text style={{ color: '#fff', marginBottom: 16 }}>Source set as "From Storage".</Text>
            )}
            <View style={globalStyles.stepperNav}>
              <TouchableOpacity onPress={prevStep}><Text style={globalStyles.stepperNavText}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextStep}><Text style={globalStyles.stepperNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Usage & Handling</Text>
            {/* Usage Instructions Text Area */}
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              placeholder="Usage Instructions"
              placeholderTextColor="#e0e0e0"
              value={form.usageInstructions}
              onChangeText={v => handleChange('usageInstructions', v)}
              multiline
              numberOfLines={4}
            />
            {/* Media Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TouchableOpacity style={[globalStyles.addButton, { flex: 1 }]} onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  handleChange('usageImages', [...(form.usageImages || []), result.assets[0].uri]);
                }
              }}>
                <MaterialIcons name="photo-library" size={24} color="white" />
                <Text style={globalStyles.buttonText}>Add Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[globalStyles.addButton, { flex: 1 }]} onPress={handlePickUsageVideo}>
                <MaterialIcons name="videocam" size={24} color="white" />
                <Text style={globalStyles.buttonText}>Add Usage Video</Text>
              </TouchableOpacity>
            </View>
            {/* Show usage images */}
            {form.usageImages && form.usageImages.length > 0 && (
              <View style={globalStyles.imageGrid}>
                {form.usageImages.map((uri, idx) => (
                  <View key={idx} style={globalStyles.imageContainer}>
                    <Image source={{ uri }} style={globalStyles.image} />
                    <TouchableOpacity style={globalStyles.removeButton} onPress={() => handleChange('usageImages', form.usageImages.filter((_, i) => i !== idx))}>
                      <MaterialIcons name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {/* Show usage video thumbnail */}
            {form.usageVideo && (
              <View style={globalStyles.imagePreviewContainer}>
                <View style={globalStyles.imageContainer}>
                  <Text style={{ color: '#fff', marginBottom: 4 }}>Video selected: {form.usageVideo}</Text>
                  <TouchableOpacity style={globalStyles.removeButton} onPress={() => handleChange('usageVideo', '')}>
                    <MaterialIcons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              placeholder="Maintenance Notes"
              placeholderTextColor="#e0e0e0"
              value={form.maintenanceNotes}
              onChangeText={v => handleChange('maintenanceNotes', v)}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[globalStyles.input, globalStyles.textArea]}
              placeholder="Safety Notes"
              placeholderTextColor="#e0e0e0"
              value={form.safetyNotes}
              onChangeText={v => handleChange('safetyNotes', v)}
              multiline
              numberOfLines={4}
            />
            {/* Packing/Handling Checkboxes */}
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Switch value={!!form.hasOwnShippingCrate} onValueChange={v => handleChange('hasOwnShippingCrate', v)} />
                <Text style={{ color: '#fff', marginLeft: 12 }}>Has its own travel crate</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Switch value={!!form.handleWithCare} onValueChange={v => handleChange('handleWithCare', v)} />
                <Text style={{ color: '#fff', marginLeft: 12 }}>Handle with care</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Switch value={!!form.isFragile} onValueChange={v => handleChange('isFragile', v)} />
                <Text style={{ color: '#fff', marginLeft: 12 }}>Glass/Fragile</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Switch value={!!form.hasBattery} onValueChange={v => handleChange('hasBattery', v)} />
                <Text style={{ color: '#fff', marginLeft: 12 }}>Has battery</Text>
              </View>
            </View>
            <View style={globalStyles.stepperNav}>
              <TouchableOpacity onPress={prevStep}><Text style={globalStyles.stepperNavText}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextStep}><Text style={globalStyles.stepperNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 5:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Status</Text>
            {/* Status Dropdown with label and help */}
            <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4, fontWeight: '500' }}>
              Status <MaterialIcons name="help-outline" size={16} color="#c084fc" onPress={() => Alert.alert('Status', 'Select the current status of the prop.')} />
            </Text>
            <View style={globalStyles.input}>
              <Picker
                selectedValue={form.status}
                onValueChange={v => handleChange('status', v)}
                dropdownIconColor="#c084fc"
                style={globalStyles.picker}
              >
                <Picker.Item label="Select Status*" value="" />
                <Picker.Item label="Part of the Show" value="confirmed" />
                <Picker.Item label="with props dept" value="with_props" />
                <Picker.Item label="with a maker" value="with_maker" />
                <Picker.Item label="Damaged - Awaiting Repair/Replacement" value="damaged_awaiting_repair" />
                <Picker.Item label="Missing - Awaiting Replacement" value="missing" />
                <Picker.Item label="Consumable" value="consumable" />
                <Picker.Item label="On Delivery" value="on_delivery" />
                <Picker.Item label="Under Review" value="under_review" />
                <Picker.Item label="Backup/Alternate" value="backup" />
                <Picker.Item label="Cut from Show" value="cut" />
              </Picker>
            </View>
            {/* Dynamic fields based on status */}
            {form.status === 'with_props' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Notes (required)" value={form.statusNotes} onChangeText={v => handleChange('statusNotes', v)} />
                <TextInput style={globalStyles.input} placeholder="Due back date/time (required)" value={form.dueBackDate} onChangeText={v => handleChange('dueBackDate', v)} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: '#fff', marginRight: 8 }}>Notify Props Dept</Text>
                  <Switch value={!!form.notifyPropsDept} onValueChange={v => handleChange('notifyPropsDept', v)} />
                </View>
              </>
            )}
            {form.status === 'with_maker' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Maker Name (required)" value={form.makerName} onChangeText={v => handleChange('makerName', v)} />
                <TextInput style={globalStyles.input} placeholder="Due date (required)" value={form.dueBackDate} onChangeText={v => handleChange('dueBackDate', v)} />
              </>
            )}
            {(form.status === 'damaged_awaiting_repair' || form.status === 'damaged_awaiting_replacement') && (
              <>
                <TextInput style={globalStyles.input} placeholder="Note of damage (required)" value={form.statusNotes} onChangeText={v => handleChange('statusNotes', v)} />
                <TouchableOpacity style={globalStyles.addButton} onPress={handlePickDamagePhoto}>
                  <MaterialIcons name="photo-library" size={24} color="white" />
                  <Text style={globalStyles.buttonText}>Add Damage Photo</Text>
                </TouchableOpacity>
                <View style={globalStyles.imageGrid}>
                  {(() => {
                    const damagePhotos = form.damagePhoto ?? [];
                    return damagePhotos.map((uri, idx) => (
                      <View key={idx} style={globalStyles.imageContainer}>
                        <Image source={{ uri }} style={globalStyles.image} />
                        <TouchableOpacity style={globalStyles.removeButton} onPress={() => handleChange('damagePhoto', damagePhotos.filter((_, i) => i !== idx))}>
                          <MaterialIcons name="close" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    ));
                  })()}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: '#fff', marginRight: 8 }}>Notify Props Dept</Text>
                  <Switch value={!!form.notifyPropsDept} onValueChange={v => handleChange('notifyPropsDept', v)} />
                </View>
              </>
            )}
            {form.status === 'missing' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#fff', marginRight: 8 }}>Notify Props Dept</Text>
                <Switch value={!!form.notifyPropsDept} onValueChange={v => handleChange('notifyPropsDept', v)} />
              </View>
            )}
            {form.status === 'on_delivery' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Delivery date/time (required)" value={form.deliveryDate} onChangeText={v => handleChange('deliveryDate', v)} />
                <TextInput style={globalStyles.input} placeholder="Venue (required)" value={form.deliveryVenue} onChangeText={v => handleChange('deliveryVenue', v)} />
              </>
            )}
            {form.status === 'under_review' && (
              <TextInput style={globalStyles.input} placeholder="Notes (required)" value={form.statusNotes} onChangeText={v => handleChange('statusNotes', v)} />
            )}
            {form.status === 'backup' && (
              <TextInput style={globalStyles.input} placeholder="Who has this? (required)" value={form.whoHasBackup} onChangeText={v => handleChange('whoHasBackup', v)} />
            )}
            {form.status === 'cut' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Note why it was cut (required)" value={form.statusNotes} onChangeText={v => handleChange('statusNotes', v)} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: '#fff', marginRight: 8 }}>Has been disposed of</Text>
                  <Switch value={!!form.disposed} onValueChange={v => handleChange('disposed', v)} />
                </View>
              </>
            )}
            {/* Status Notes with label and help (fallback for other statuses) */}
            {!(
              form.status === 'with_props' ||
              form.status === 'with_maker' ||
              form.status === 'damaged_awaiting_repair' ||
              form.status === 'damaged_awaiting_replacement' ||
              form.status === 'missing' ||
              form.status === 'on_delivery' ||
              form.status === 'under_review' ||
              form.status === 'backup' ||
              form.status === 'cut'
            ) && (
              <>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4, fontWeight: '500' }}>
                  Status Notes <MaterialIcons name="help-outline" size={16} color="#c084fc" onPress={() => Alert.alert('Status Notes', 'Enter any notes related to the current status of the prop.')} />
                </Text>
            <TextInput style={globalStyles.input} placeholder="Status Notes" placeholderTextColor="#e0e0e0" value={form.statusNotes} onChangeText={v => handleChange('statusNotes', v)} />
              </>
            )}
            <View style={globalStyles.stepperNav}>
              <TouchableOpacity onPress={prevStep}><Text style={globalStyles.stepperNavText}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextStep}><Text style={globalStyles.stepperNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 6:
        return (
          <View style={globalStyles.section}>
            <Text style={globalStyles.sectionTitle}>Location</Text>
            {/* Current Location with label and help */}
            <Text style={{ color: '#fff', fontSize: 14, marginBottom: 4, fontWeight: '500' }}>
              Current Location <MaterialIcons name="help-outline" size={16} color="#c084fc" onPress={() => Alert.alert('Current Location', 'Select the current location of the prop (e.g., Backstage Left, On Stage).')} />
            </Text>
            <View style={globalStyles.input}>
              <Picker
                selectedValue={form.currentLocation && !locationOptions.find(opt => opt.value === form.currentLocation) ? 'custom' : form.currentLocation}
                onValueChange={v => {
                  if (v === 'custom') {
                    handleChange('currentLocation', 'custom');
                  } else {
                    handleChange('currentLocation', v);
                    setCustomLocation('');
                  }
                }}
                dropdownIconColor="#c084fc"
                style={globalStyles.picker}
              >
                <Picker.Item label="Select Location*" value="" />
                {locationOptions.map(opt => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                ))}
              </Picker>
            </View>
            {form.currentLocation === 'custom' && (
              <TextInput
                style={globalStyles.input}
                placeholder="Enter custom location"
                placeholderTextColor="#e0e0e0"
                value={customLocation}
                onChangeText={v => {
                  setCustomLocation(v);
                  handleChange('currentLocation', v);
                }}
              />
            )}
            <View style={globalStyles.stepperNav}>
              <TouchableOpacity onPress={prevStep}><Text style={globalStyles.stepperNavText}>Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextStep}><Text style={globalStyles.stepperNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      default:
        return (
          <View style={globalStyles.section}><Text>Step not implemented yet.</Text></View>
        );
    }
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
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={globalStyles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Stack.Screen options={{ title: initialValues?.name ? 'Edit Prop' : 'Create Prop' }} />
          <ScrollView contentContainerStyle={globalStyles.scrollContent}>
            {/* Stepper header */}
            <View style={globalStyles.stepperHeader}>
              {steps.map((label, idx) => (
                <View key={label} style={[globalStyles.stepperDot, step === idx && globalStyles.stepperDotActive]} />
              ))}
            </View>
            <View {...panResponder.panHandlers}>
              {renderStep()}
            </View>
          </ScrollView>
          {/* Sticky Save Bar */}
          <View style={globalStyles.saveBar}>
            <TouchableOpacity style={globalStyles.saveButton} onPress={() => handleSave(false)} disabled={saving}>
              <Text style={globalStyles.saveButtonText}>Save & Finish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={globalStyles.saveButton} onPress={() => handleSave(true)} disabled={saving}>
              <Text style={globalStyles.saveButtonText}>Save & Add Another</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2d2d44',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#c084fc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  picker: {
    color: '#fff',
    backgroundColor: 'transparent',
    height: 48,
    justifyContent: 'center',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: '#22272b',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
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
    backgroundColor: '#1d2125',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    color: '#fff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: '#c084fc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: { backgroundColor: 'transparent' },
  overlay: { backgroundColor: 'transparent' },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepperDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#404040',
    marginHorizontal: 4,
  },
  stepperDotActive: {
    backgroundColor: '#c084fc',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'rgba(45,45,68,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  stepperNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepperNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c084fc',
  },
  saveBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#404040',
    backgroundColor: 'rgba(30,30,30,0.7)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextButton: { alignSelf: 'flex-end', marginTop: 8 },
  nextButtonText: { color: '#c084fc', fontWeight: 'bold' },
  imagePreviewContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
}); 
