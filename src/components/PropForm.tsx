import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ViewStyle, ImageSourcePropType, ScrollView, TextInput, Switch, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { HelpCircle, Upload, Trash2, AlertTriangle, CheckCircle, Video } from 'lucide-react';
import { PlusCircle, Save, Loader2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload.tsx';
import { DigitalAssetForm } from './DigitalAssetForm.tsx';
import { VideoAssetForm } from './VideoAssetForm.tsx';
import { propCategories, PropCategory, DimensionUnit, PropSource } from '../shared/types/props.ts';
import type { Prop, PropFormData, DigitalAsset, PropImage, PropLifecycleStatus, Act, Scene } from '../shared/types/props.ts';
import type { Show } from '../shared/services/firebase/types.ts';
import { WysiwygEditor } from './WysiwygEditor.tsx';
import { HelpTooltip } from './HelpTooltip.tsx';
import { v4 as uuidv4 } from 'uuid';
import { lifecycleStatusLabels } from '../types/lifecycle.ts';

export interface PropFormProps {
  onSubmit: (prop: PropFormData) => Promise<void>;
  disabled?: boolean;
  initialData?: PropFormData;
  mode?: 'create' | 'edit';
  onCancel?: () => void;
  show?: Show;
}

export const dimensionUnits: ReadonlyArray<{ value: DimensionUnit; label: string }> = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
  { value: 'm', label: 'm' },
  { value: 'ft', label: 'ft' },
];

export const weightUnits: ReadonlyArray<{ value: 'kg' | 'lb' | 'g'; label: string }> = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
];

// Define the lifecycle statuses array based on the imported type and labels
const propLifecycleStatuses = Object.keys(lifecycleStatusLabels) as PropLifecycleStatus[];

const initialFormState: PropFormData = {
  name: '',
  price: 0,
  description: '',
  category: 'Other' as PropCategory,
  quantity: 1,
  status: 'confirmed' as PropLifecycleStatus,
  location: '',
  currentLocation: '', // Current location (e.g., on stage, rehearsal room)
  condition: '',
  source: 'bought',
  sourceDetails: '', // Add sourceDetails
  images: [],
  digitalAssets: [],
  videos: [], // Ensure this is typed correctly, implicitly DigitalAsset[] via PropFormData
  weightUnit: 'kg',
  unit: 'cm',
  act: 1,
  scene: 1,
  isMultiScene: false,
  isConsumable: false,
  hasUsageInstructions: false,
  hasMaintenanceNotes: false,
  hasSafetyNotes: false,
  requiresPreShowSetup: false,
  hasOwnShippingCrate: false,
  requiresSpecialTransport: false,
  hasBeenModified: false,
  modificationDetails: '',
  isRented: false,
  travelsUnboxed: false,
  statusHistory: [],
  maintenanceHistory: [],
  tags: [],
  materials: [],
  customFields: {},
  handedness: 'either',
  isBreakable: false,
  isHazardous: false,
  preShowSetupDuration: undefined,
  preShowSetupNotes: '',
  preShowSetupVideo: '',
  travelWeight: undefined,
  statusNotes: '',
};

// Helper for Required Label
function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
      {children} <Text className="text-red-500">*</Text>
    </Text>
  );
}

export function PropForm({ onSubmit, initialData, mode = 'create', onCancel, show, disabled = false }: PropFormProps): JSX.Element {
  // Log received show prop at the start of the component execution
  console.log('[PropForm Execution] Received show prop:', JSON.stringify(show, null, 2));

  console.log('=== PROP FORM MOUNT DEBUG ===');
  console.log('1. PropForm mounted with mode:', mode);
  console.log('2. Initial data received:', initialData);
  console.log('3. Show data received:', show);

  const [formData, setFormData] = useState<PropFormData>(() => {
    if (initialData) {
      return { ...initialData };
    }
    return { ...initialFormState };
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (/* e: React.FormEvent */) => {
    if (formData.source === 'rented') {
      if (!(formData.rentalSource || '').trim()) {
        alert('Please enter the rental source');
        return;
      }
      if (!formData.rentalDueDate) {
        alert('Please enter the return due date');
        return;
      }
    }

    await onSubmit(formData);
    if (mode === 'create') {
      setFormData({ ...initialFormState });
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setFormData({ 
      ...formData, 
      images: (formData.images || []).filter(img => img.id !== imageId) 
    });
  };

  const handleRemoveDigitalAsset = (assetId: string) => {
    setFormData({ 
      ...formData, 
      digitalAssets: (formData.digitalAssets || []).filter(asset => asset.id !== assetId) 
    });
  };

  const handleRemoveVideoAsset = (assetId: string) => {
    setFormData((prevData) => ({
      ...prevData,
      videos: (prevData.videos || []).filter(asset => asset.id !== assetId)
    }));
  };

  const handleDescriptionChange = (content: string) => {
    setFormData({ ...formData, description: content });
  };

  const handleUsageInstructionsChange = (content: string) => {
    setFormData({ ...formData, usageInstructions: content });
  };

  const handleMaintenanceNotesChange = (content: string) => {
    setFormData({ ...formData, maintenanceNotes: content });
  };

  const handleSafetyNotesChange = (content: string) => {
    setFormData({ ...formData, safetyNotes: content });
  };

  const handleMaterialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const materialsArray = e.target.value.split(',').map(m => m.trim()).filter(Boolean);
    setFormData({ ...formData, materials: materialsArray });
  };

  const convertWeight = (value: number | string | undefined, unit: 'kg' | 'lb' | 'g'): number => {
    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue === 0) return 0;

    switch (unit) {
      case 'lb':
        return numericValue * 0.453592;
      case 'g':
        return numericValue / 1000;
      case 'kg':
      default:
        return numericValue;
    }
  };

  // Define base styles
  const fieldsetStyles = "border border-[var(--border-color)] p-4 rounded-md mb-6";
  const legendStyles = "text-base font-semibold text-blue-300 px-2 mb-3";
  // Adjusted input/select classes: removed w-full, changed background
  const inputStyles = "px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const selectStyles = "px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const checkboxContainerStyles = "flex items-center";
  const checkboxLabelStyles = "ml-2 text-sm font-medium text-[var(--text-secondary)]";
  const conditionalFieldStyles = "mt-4 space-y-1 pl-6"; // Removed border-l-2 border-gray-600

  return (
    // Match background of parent column: bg-[#111827]
    <View className="p-1 bg-[#111827]">
      
      {/* Fieldset: Basic Information */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Basic Information</Text>
        <View className="space-y-4">
          <View>
            <RequiredLabel>Name</RequiredLabel>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              className={inputStyles}
              placeholder="Enter prop name"
              editable={!disabled}
            />
          </View>

          <View>
            <RequiredLabel>Description</RequiredLabel>
            <WysiwygEditor
              value={formData.description ?? ''}
              onChange={handleDescriptionChange}
              disabled={disabled}
            />
          </View>

          <View>
            <RequiredLabel>Category</RequiredLabel>
            <View className="relative">
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as PropCategory })}
                className={selectStyles}
                required
                disabled={disabled}
              >
                <option value="">Select a category</option>
                {propCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </View>
          </View>

          <View>
            <RequiredLabel>Quantity</RequiredLabel>
            <TextInput
              value={formData.quantity?.toString() ?? '1'}
              onChangeText={(text) => setFormData({ ...formData, quantity: parseInt(text, 10) || 1 })}
              className={inputStyles}
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>

          <View>
            <RequiredLabel>Price</RequiredLabel>
            <TextInput
              value={formData.price?.toString() ?? '0'}
              onChangeText={(text) => setFormData({ ...formData, price: parseFloat(text) || 0 })}
              className={inputStyles}
              keyboardType="numeric"
              placeholder="Enter price or estimated value"
              editable={!disabled}
            />
          </View>

          <View>
            <RequiredLabel>Source</RequiredLabel>
            <View className="relative">
              <select
                id="source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as PropSource })}
                className={selectStyles}
                required
                disabled={disabled}
              >
                <option value="bought">Bought</option>
                <option value="rented">Rented</option>
                <option value="made">Made</option>
                <option value="borrowed">Borrowed</option>
                <option value="owned">Owned</option>
                {/* Add other sources as needed */} 
              </select>
            </View>
          </View>

          {formData.source === 'rented' && (
            <View className={conditionalFieldStyles}>
              <View>
                <RequiredLabel>Rental Source</RequiredLabel>
                <TextInput
                  value={formData.rentalSource ?? ''}
                  onChangeText={(text) => setFormData({ ...formData, rentalSource: text })}
                  className={inputStyles}
                  editable={!disabled}
                />
              </View>
              <View>
                <RequiredLabel>Return Due Date</RequiredLabel>
                <TextInput
                  value={formData.rentalDueDate ?? ''}
                  onChangeText={(text) => setFormData({ ...formData, rentalDueDate: text })}
                  className={`${inputStyles} text-white`}
                  placeholder="YYYY-MM-DD"
                  editable={!disabled}
                />
              </View>
              <View>
                <label htmlFor="rentalReferenceNumber" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Rental Reference #</label>
                <TextInput
                  value={formData.rentalReferenceNumber ?? ''}
                  onChangeText={(text) => setFormData({ ...formData, rentalReferenceNumber: text })}
                  className={inputStyles}
                  placeholder="Enter rental reference number"
                  editable={!disabled}
                />
              </View>
            </View>
          )}

          {formData.source !== 'rented' && (
            <View>
              <label htmlFor="sourceDetails" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Source Details</label>
              <TextInput
                value={formData.sourceDetails || ''}
                onChangeText={(text) => setFormData({ ...formData, sourceDetails: text })}
                className={`${inputStyles} w-full`}
                placeholder="Enter source details"
                editable={!disabled}
              />
            </View>
          )}
        </View>
      </View>

      {/* Fieldset: Images */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Images</Text>
        <ImageUpload 
          currentImages={formData.images || []}
          onImagesChange={(updatedImages) => setFormData({ ...formData, images: updatedImages })}
          disabled={disabled} 
        />
        {(formData.images || []).length > 0 && (
          <View className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(formData.images || []).map((image: PropImage) => (
              <View key={image.id} className="relative group">
                <img src={image.url} alt={image.caption || 'Prop Image'} className="w-full h-32 object-cover rounded-md" />
                <TouchableOpacity
                  onPress={() => handleRemoveImage(image.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  <Trash2 size={16} />
                </TouchableOpacity>
                <TextInput
                  value={image.caption || ''}
                  onChangeText={(text: string) => {
                    const updatedImages = (formData.images || []).map(img => 
                      img.id === image.id ? { ...img, caption: text } : img
                    );
                    setFormData({ ...formData, images: updatedImages });
                  }}
                  placeholder="Caption"
                  className={inputStyles + " mt-1 w-full text-xs"}
                  editable={!disabled}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Fieldset: Dimensions & Weight */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Dimensions & Weight</Text>
        <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Length</label>
            <TextInput
              value={formData.length?.toString() ?? ''}
              onChangeText={(text) => setFormData({ ...formData, length: parseFloat(text) || undefined })}
              className={`${inputStyles} max-w-[100px]`}
              placeholder="L"
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Width</label>
            <TextInput
              value={formData.width?.toString() ?? ''}
              onChangeText={(text) => setFormData({ ...formData, width: parseFloat(text) || undefined })}
              className={`${inputStyles} max-w-[100px]`}
              placeholder="W"
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Height</label>
            <TextInput
              value={formData.height?.toString() ?? ''}
              onChangeText={(text) => setFormData({ ...formData, height: parseFloat(text) || undefined })}
              className={`${inputStyles} max-w-[100px]`}
              placeholder="H"
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Depth</label>
            <TextInput
              value={formData.depth?.toString() ?? ''}
              onChangeText={(text) => setFormData({ ...formData, depth: parseFloat(text) || undefined })}
              className={`${inputStyles} max-w-[100px]`}
              placeholder="D"
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Unit</label>
            <View className="relative">
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as DimensionUnit })}
                className={selectStyles}
                disabled={disabled}
              >
                {dimensionUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </View>
          </View>
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Weight</label>
            <TextInput
              value={formData.weight?.toString() ?? ''}
              onChangeText={(text) => setFormData({ ...formData, weight: parseFloat(text) || undefined })}
              className={`${inputStyles} max-w-[100px]`}
              placeholder="Weight"
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>
          <View>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Weight Unit</label>
            <View className="relative">
              <select
                id="weightUnit"
                value={formData.weightUnit}
                onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value as 'kg' | 'lb' | 'g' })}
                className={selectStyles}
                disabled={disabled}
              >
                {weightUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </View>
          </View>
        </View>
      </View>
      
      {/* Fieldset: Scene Information - Conditionally render if show is provided */}
      {show && (
        <View className={fieldsetStyles}>
          <Text className={legendStyles}>Scene Information (for {show.name})</Text>
          <View className="space-y-4">
            <View>
              <label htmlFor="act" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Act</label>
              <View className="relative">
                <select
                  id="act"
                  value={formData.act || ''}
                  onChange={(e) => setFormData({ ...formData, act: parseInt(e.target.value), scene: undefined, sceneName: undefined })} // Reset scene on act change
                  className={selectStyles + " w-full"}
                  disabled={disabled}
                >
                  <option value="" disabled>Select Act</option>
                  {(show.acts || []).map((act: Act, index: number) => (
                    <option key={act.id || index} value={act.id || index + 1}>
                      {act.name || `Act ${index + 1}`}
                    </option>
                  ))}
                </select>
              </View>
            </View>

            {formData.act && (show.acts || []).find(a => (a.id || (show.acts?.indexOf(a) ?? -1) + 1) === formData.act) && (
              <View>
                <label htmlFor="scene" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Scene</label>
                <View className="relative">
                  <select
                    id="scene"
                    value={formData.scene || ''}
                    onChange={(e) => {
                      const selectedSceneObject = (show.acts || [])
                        .find(a => (a.id || (show.acts?.indexOf(a) ?? -1) + 1) === formData.act)
                        ?.scenes.find(s => (s.id || ((show.acts || []).find(a => (a.id || (show.acts?.indexOf(a) ?? -1) + 1) === formData.act)?.scenes.indexOf(s) ?? -1) + 1) === parseInt(e.target.value));
                      
                      setFormData({ 
                        ...formData, 
                        scene: parseInt(e.target.value),
                        sceneName: selectedSceneObject?.name || '' 
                      });
                    }}
                    className={selectStyles + " w-full"}
                    disabled={disabled}
                  >
                    <option value="" disabled>Select Scene</option>
                    {((show.acts || []).find(a => (a.id || (show.acts?.indexOf(a) ?? -1) + 1) === formData.act)?.scenes || []).map((scene: Scene, index: number) => (
                      <option key={scene.id || index} value={scene.id || index + 1}>
                        {scene.name || `Scene ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </View>
              </View>
            )}

            <View className={checkboxContainerStyles}>
              <Switch
                value={formData.isMultiScene || false}
                onValueChange={(value) => setFormData({ ...formData, isMultiScene: value })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={formData.isMultiScene ? "#f5dd4b" : "#f4f3f4"}
                disabled={disabled}
              />
              <label htmlFor="isMultiScene" className={checkboxLabelStyles}>Used in multiple scenes</label>
            </View>
          </View>
        </View>
      )}

      {/* Fieldset: Characteristics */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Characteristics</Text>
        <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.isConsumable || false}
              onValueChange={(value) => setFormData({ ...formData, isConsumable: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.isConsumable ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="isConsumable" className={checkboxLabelStyles}>Consumable</label>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.isBreakable || false}
              onValueChange={(value) => setFormData({ ...formData, isBreakable: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.isBreakable ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="isBreakable" className={checkboxLabelStyles}>Breakable/Fragile</label>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.isHazardous || false}
              onValueChange={(value) => setFormData({ ...formData, isHazardous: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.isHazardous ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="isHazardous" className={checkboxLabelStyles}>Hazardous Material</label>
          </View>
          <View>
            <label htmlFor="materials" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Materials (comma-separated)</label>
            <TextInput
              value={(formData.materials || []).join(', ')}
              onChangeText={(text) => {
                const materialsArray = text.split(',').map(m => m.trim()).filter(Boolean);
                setFormData({ ...formData, materials: materialsArray });
              }}
              className={`${inputStyles} w-full`}
              placeholder="e.g., Wood, Metal, Plastic"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="tags" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tags (comma-separated)</label>
            <TextInput
              value={(formData.tags || []).join(', ')}
              onChangeText={(text) => {
                const tagsArray = text.split(',').map(t => t.trim()).filter(Boolean);
                setFormData({ ...formData, tags: tagsArray });
              }}
              className={`${inputStyles} w-full`}
              placeholder="Enter tags"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="color" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Color</label>
            <TextInput
              value={formData.color || ''}
              onChangeText={(text) => setFormData({ ...formData, color: text })}
              className={`${inputStyles} w-full`}
              placeholder="Enter color"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="handedness" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Handedness</label>
            <View className="relative">
              <select
                id="handedness"
                value={formData.handedness}
                onChange={(e) => setFormData({ ...formData, handedness: e.target.value as 'left' | 'right' | 'either' })}
                className={selectStyles}
                disabled={disabled}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="either">Either</option>
              </select>
            </View>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.hasUsageInstructions || false}
              onValueChange={(value) => setFormData({ ...formData, hasUsageInstructions: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.hasUsageInstructions ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="hasUsageInstructions" className={checkboxLabelStyles}>Has Usage Instructions</label>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.hasMaintenanceNotes || false}
              onValueChange={(value) => setFormData({ ...formData, hasMaintenanceNotes: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.hasMaintenanceNotes ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="hasMaintenanceNotes" className={checkboxLabelStyles}>Has Maintenance Notes</label>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.hasSafetyNotes || false}
              onValueChange={(value) => setFormData({ ...formData, hasSafetyNotes: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.hasSafetyNotes ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="hasSafetyNotes" className={checkboxLabelStyles}>Has Safety Notes</label>
          </View>
        </View>
      </View>

      {/* Fieldset: Handling & Usage */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Handling & Usage</Text>
        <View className="space-y-4">
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.requiresPreShowSetup || false}
              onValueChange={(value) => setFormData({ ...formData, requiresPreShowSetup: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.requiresPreShowSetup ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="requiresPreShowSetup" className={checkboxLabelStyles}>Requires Pre-Show Setup</label>
          </View>
          {formData.requiresPreShowSetup && (
            <View className={conditionalFieldStyles}>
              <View>
                <label htmlFor="preShowSetupDuration" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Setup Duration (minutes)</label>
                <TextInput
                  value={formData.preShowSetupDuration?.toString() ?? ''}
                  onChangeText={(text) => setFormData({ ...formData, preShowSetupDuration: parseInt(text, 10) || undefined })}
                  className={`${inputStyles} max-w-xs`}
                  placeholder="e.g., 30"
                  keyboardType="numeric"
                  editable={!disabled}
                />
              </View>
              <View>
                <label htmlFor="preShowSetupNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Setup Notes</label>
                <WysiwygEditor
                  value={formData.preShowSetupNotes || ''}
                  onChange={(content) => setFormData({ ...formData, preShowSetupNotes: content })}
                  disabled={disabled}
                />
              </View>
              <View>
                <label htmlFor="preShowSetupVideo" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Setup Video URL</label>
                <TextInput
                  value={formData.preShowSetupVideo || ''}
                  onChangeText={(text) => setFormData({ ...formData, preShowSetupVideo: text })}
                  className={`${inputStyles} w-full`}
                  placeholder="https://youtu.be/..."
                  keyboardType="url"
                  editable={!disabled}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Fieldset: Transport Information */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Transport Information</Text>
        <View className="space-y-4">
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.hasOwnShippingCrate || false}
              onValueChange={(value) => setFormData({ ...formData, hasOwnShippingCrate: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.hasOwnShippingCrate ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="hasOwnShippingCrate" className={checkboxLabelStyles}>Has Own Shipping Crate</label>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.requiresSpecialTransport || false}
              onValueChange={(value) => setFormData({ ...formData, requiresSpecialTransport: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.requiresSpecialTransport ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="requiresSpecialTransport" className={checkboxLabelStyles}>Requires Special Transport</label>
          </View>
          <View className={checkboxContainerStyles}>
            <Switch
              value={formData.travelsUnboxed || false}
              onValueChange={(value) => setFormData({ ...formData, travelsUnboxed: value })}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={formData.travelsUnboxed ? "#f5dd4b" : "#f4f3f4"}
              disabled={disabled}
            />
            <label htmlFor="travelsUnboxed" className={checkboxLabelStyles}>Travels Unboxed</label>
          </View>
          <View>
            <label htmlFor="travelWeight" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Travel Weight (if different)</label>
            <TextInput
              value={formData.travelWeight?.toString() ?? ''}
              onChangeText={(text) => setFormData({ ...formData, travelWeight: parseFloat(text) || undefined })}
              className={inputStyles}
              placeholder={`Weight in ${formData.weightUnit || 'kg'}`}
              keyboardType="numeric"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="transportNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Transport Notes</label>
            <WysiwygEditor
              value={formData.transportNotes || ''}
              onChange={(content) => setFormData({ ...formData, transportNotes: content })}
              disabled={disabled}
            />
          </View>
        </View>
      </View>
      
      {/* Fieldset: Digital Assets */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Digital Assets (Manuals, Schematics, etc.)</Text>
        <DigitalAssetForm 
          assets={formData.digitalAssets || []}
          onChange={(updatedAssets) => setFormData({ ...formData, digitalAssets: updatedAssets })}
          disabled={disabled}
        />
        <View className="mt-4 space-y-2">
          {(formData.digitalAssets || []).map((asset: DigitalAsset) => (
            <View key={asset.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
              <View className="flex-1">
                <Text className="text-sm text-gray-100">{asset.name}</Text>
                <Text className="text-xs text-gray-400">{asset.type} - <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View</a></Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveDigitalAsset(asset.id)} disabled={disabled}>
                <Trash2 size={18} className="text-red-500 hover:text-red-400" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Fieldset: Videos */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Videos (Links)</Text>
        <VideoAssetForm 
          assets={formData.videos || []}
          onChange={(updatedVideos) => setFormData({ ...formData, videos: updatedVideos })}
          disabled={disabled}
        />
        <View className="mt-4 space-y-2">
          {(formData.videos || []).map((video: DigitalAsset) => (
            <View key={video.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
              <View className="flex-1">
                <Text className="text-sm text-gray-100">{video.name || 'Video Link'}</Text>
                <Text className="text-xs text-gray-400"><a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Watch Video</a></Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveVideoAsset(video.id)} disabled={disabled}>
                <Trash2 size={18} className="text-red-500 hover:text-red-400" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Fieldset: Lifecycle Status & Location */}
      <View className={fieldsetStyles}>
        <Text className={legendStyles}>Lifecycle Status & Location</Text>
        <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <View>
            <RequiredLabel>Status</RequiredLabel>
            <View className="relative">
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PropLifecycleStatus })}
                className={selectStyles}
                required
                disabled={disabled}
              >
                {propLifecycleStatuses.map((status) => ( 
                  <option key={status} value={status}>
                    {lifecycleStatusLabels[status]} {/* Use label for display */}
                  </option> 
                ))} 
              </select>
            </View>
          </View>
          <View>
            <label htmlFor="location" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Storage Location</label>
            <TextInput
              value={formData.location || ''}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              className={`${inputStyles} w-full`}
              placeholder="e.g., Prop Room Shelf A"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="currentLocation" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Current Location (if different)</label>
            <TextInput
              value={formData.currentLocation || ''}
              onChangeText={(text) => setFormData({ ...formData, currentLocation: text })}
              className={`${inputStyles} w-full`}
              placeholder="e.g., Backstage Left, On Stage"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="condition" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Condition</label>
            <TextInput
              value={formData.condition || ''}
              onChangeText={(text) => setFormData({ ...formData, condition: text })}
              className={`${inputStyles} w-full`}
              placeholder="e.g., New, Used, Needs Repair"
              editable={!disabled}
            />
          </View>
          <View>
            <label htmlFor="statusNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status Notes</label>
            <WysiwygEditor
              value={formData.statusNotes || ''}
              onChange={(content) => setFormData({ ...formData, statusNotes: content })}
              disabled={disabled}
            />
          </View>
        </View>
      </View>

      {/* Additional Fields Here (e.g., custom fields, history) */}
      <View className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 flex items-center justify-center"
            disabled={disabled}
          >
            Cancel
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 flex items-center justify-center"
          disabled={disabled}
        >
          <Save size={18} className="mr-2" />
          {mode === 'create' ? 'Create Prop' : 'Save Changes'}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... existing styles if any ... 
  // Note: NativeWind typically replaces the need for StyleSheet for styled components
});

export default PropForm;