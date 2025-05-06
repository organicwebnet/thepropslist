import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { HelpCircle, Upload, Trash2, AlertTriangle, CheckCircle, Video } from 'lucide-react';
import { PlusCircle, Save, Loader2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { DigitalAssetForm } from './DigitalAssetForm';
import { VideoAssetForm } from './VideoAssetForm';
import { propCategories, PropCategory, DimensionUnit } from '@shared/types/props';
import type { Prop, PropFormData, DigitalAsset, PropImage, PropLifecycleStatus } from '@shared/types/props';
import type { Show, Act, Scene } from '@shared/types/props';
import { WysiwygEditor } from './WysiwygEditor';
import { HelpTooltip } from './HelpTooltip';
import { v4 as uuidv4 } from 'uuid';
import { lifecycleStatusLabels } from '@/types/lifecycle';

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
    <span className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
      {children} <span className="text-red-500">*</span>
    </span>
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
    console.log('=== PROP FORM EFFECT DEBUG ===');
    console.log('1. Effect triggered with initialData:', initialData);
    console.log('2. Current formData state:', formData);
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== PROP FORM SUBMIT DEBUG ===');
    console.log('1. Form submission started');
    console.log('2. Submitting formData:', formData);

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

  const handleImageUpload = (urls: string[]) => {
    const newImages: PropImage[] = urls.map((url, index) => ({ 
      id: `new-${Date.now()}-${index}`,
      url: url,
      caption: '' 
    }));
    setFormData({ ...formData, images: [...(formData.images || []), ...newImages] });
  };

  const handleDigitalAssetAdd = (asset: Omit<DigitalAsset, 'id'>) => {
    const newAsset: DigitalAsset = { ...asset, id: `new-${Date.now()}` };
    setFormData({ 
      ...formData, 
      digitalAssets: [...(formData.digitalAssets || []), newAsset]
    });
  };

  const handleVideoAssetAdd = (asset: Omit<DigitalAsset, 'id'>) => {
    const newAsset: DigitalAsset = { ...asset, id: `new-vid-${Date.now()}`, type: 'video' };
    setFormData((prevData) => ({
      ...prevData,
      videos: [...(prevData.videos || []), newAsset]
    }));
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
    <form onSubmit={handleSubmit} className="p-1 bg-[#111827]">
      
      {/* Fieldset: Basic Information */}
      <div className={fieldsetStyles}>
        <h3 className={legendStyles}>Basic Information</h3>
        <div className="space-y-4">
          <div>
            <RequiredLabel>Name</RequiredLabel>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`${inputStyles} w-full`}
              placeholder="Enter prop name"
              required
              disabled={disabled}
            />
          </div>

          <div>
            <RequiredLabel>Category</RequiredLabel>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as PropCategory })}
              className={`${selectStyles} w-full`}
              required
              disabled={disabled}
            >
              <option value="">Select a category</option>
              {propCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description
            </label>
            <WysiwygEditor
                value={formData.description ?? ''}
                onChange={handleDescriptionChange}
                disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
              className={`${inputStyles} max-w-xs`}
              required
              disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Condition
            </label>
            <input
              type="text"
              id="condition"
              value={formData.condition ?? ''}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className={`${inputStyles} w-full`}
              placeholder="e.g., New, Used, Needs Repair"
              disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="materials" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Materials <span className="text-xs text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              id="materials"
              value={(formData.materials || []).join(', ')}
              onChange={handleMaterialsChange}
              className={`${inputStyles} w-full`}
              placeholder="e.g., Wood, Metal, Plastic"
              disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="lastModifiedAt" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Last Modified Date
            </label>
            <input
              type="date"
              id="lastModifiedAt"
              value={formData.lastModifiedAt || ''}
              onChange={(e) => setFormData({ ...formData, lastModifiedAt: e.target.value })}
              className={inputStyles}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Fieldset: Show Context - MOVED */}
       {show && (
          <div className={fieldsetStyles}>
             <h3 className={legendStyles}>Show Context (for {show.name})</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="act" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Act</label>
                   <select
                     id="act"
                     value={formData.act !== undefined ? formData.act : ""}
                     onChange={(e) => setFormData({ ...formData, act: e.target.value === "" ? undefined : Number(e.target.value) })}
                     className={selectStyles}
                     disabled={disabled}
                   >
                      <option value="">Select Act</option>
                      {(() => {
                         console.log(`[PropForm] Attempting to map show.acts for Act dropdown. show object:`, show);
                         if (!show || !Array.isArray(show.acts)) {
                            console.warn('[PropForm] show.acts is not an array or show is missing!');
                            return null; // Don't render options if acts isn't an array
                         }
                         return show.acts.map(act => <option key={act.id} value={act.id}>{act.name || `Act ${act.id}`}</option>);
                      })()}
                   </select>
                </div>
                 <div>
                   <label htmlFor="scene" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Scene</label>
                    <select
                      id="scene"
                      value={formData.scene !== undefined ? formData.scene : ""}
                      onChange={(e) => setFormData({ ...formData, scene: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className={selectStyles}
                      disabled={disabled || !formData.act}
                    >
                       <option value="">Select Scene</option>
                       {(() => {
                         const currentAct = show?.acts && Array.isArray(show.acts) ? show.acts.find(a => a.id === formData.act) : undefined;
                         console.log(`[PropForm] Attempting to map scenes for selected Act (${formData.act}). Found Act object:`, currentAct);
                         if (!currentAct || !Array.isArray(currentAct.scenes)) {
                            console.warn('[PropForm] currentAct.scenes is not an array or currentAct is missing!');
                            return null; // Don't render options if scenes isn't an array
                         }
                         return currentAct.scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.name || `Scene ${scene.id}`}</option>);
                       })()}
                    </select>
                 </div>
                  <div className={checkboxContainerStyles + " md:col-span-2"}>
                     <input type="checkbox" id="isMultiScene" checked={!!formData.isMultiScene} onChange={(e) => setFormData({ ...formData, isMultiScene: e.target.checked })} className="rounded" disabled={disabled} />
                     <label htmlFor="isMultiScene" className={checkboxLabelStyles}>Used in multiple scenes?</label>
                  </div>
             </div>
          </div>
       )}

      {/* Fieldset: Images - MOVED */}
      <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Images</h3>
         <ImageUpload 
            onImagesChange={(newImages) => setFormData({ ...formData, images: newImages })}
            currentImages={formData.images || []}
            disabled={disabled}
         />
         {/* --- Image Previews --- */}
         {formData.images && formData.images.length > 0 && (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
             {formData.images.map((image, index) => (
               <div key={image.id || index} className="relative group flex flex-col space-y-2">
                 {/* Image Display */}
                 <div className="relative h-40 w-full bg-gray-800 rounded-md overflow-hidden border border-gray-700">
                   <img 
                     src={image.url} 
                     alt={`Prop Image ${index + 1}`}
                     className="h-full w-full object-contain" // Changed object-cover to object-contain
                   />
                   <button
                     type="button"
                     onClick={() => handleRemoveImage(image.id)}
                     className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                     aria-label="Remove image"
                     disabled={disabled}
                   >
                     <Trash2 size={14} />
                   </button>
                 </div>
                 {/* Caption Input */}
                 <input 
                   type="text"
                   value={image.caption || ''}
                   onChange={(e) => {
                     const newCaption = e.target.value;
                     setFormData(prev => ({
                       ...prev,
                       images: (prev.images || []).map((img, imgIndex) => 
                         img.id === image.id ? { ...img, caption: newCaption } : img
                       )
                     }));
                   }}
                   placeholder="Add a caption..."
                   className={`${inputStyles} w-full text-sm mt-1`} // Use inputStyles and make full width
                   disabled={disabled}
                 />
               </div>
             ))}
           </div>
         )}
      </div>

      {/* Fieldset: Dimensions & Weight */}
      <div className={fieldsetStyles}>
        <h3 className={legendStyles}>Dimensions & Weight</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dimensions */}
          <div className="md:col-span-1">
             <label htmlFor="length" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Length</label>
             <input type="number" id="length" value={formData.length ?? ''} onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })} className={`${inputStyles} max-w-[100px]`} placeholder="L" disabled={disabled} />
          </div>
           <div className="md:col-span-1">
             <label htmlFor="width" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Width</label>
             <input type="number" id="width" value={formData.width ?? ''} onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })} className={`${inputStyles} max-w-[100px]`} placeholder="W" disabled={disabled} />
           </div>
           <div className="md:col-span-1">
             <label htmlFor="height" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Height</label>
             <input type="number" id="height" value={formData.height ?? ''} onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })} className={`${inputStyles} max-w-[100px]`} placeholder="H" disabled={disabled} />
           </div>
           <div className="md:col-span-1">
             <label htmlFor="depth" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Depth</label>
             <input type="number" id="depth" value={formData.depth ?? ''} onChange={(e) => setFormData({ ...formData, depth: Number(e.target.value) })} className={`${inputStyles} max-w-[100px]`} placeholder="D" disabled={disabled} />
           </div>
           <div className="md:col-span-2">
             <label htmlFor="unit" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Dimension Unit</label>
             <select id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value as DimensionUnit })} className={selectStyles} disabled={disabled}>
               {dimensionUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
             </select>
           </div>
          {/* Weight */}
          <div className="md:col-span-1">
            <label htmlFor="weight" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Weight</label>
            <input type="number" id="weight" value={formData.weight ?? ''} onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })} className={`${inputStyles} max-w-[100px]`} placeholder="Weight" disabled={disabled} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="weightUnit" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Weight Unit</label>
            <select id="weightUnit" value={formData.weightUnit} onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value as 'kg' | 'lb' | 'g' })} className={selectStyles} disabled={disabled}>
               {weightUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      {/* Fieldset: Source & Acquisition - ADD sourceDetails */}
      <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Source & Acquisition</h3>
         <div className="space-y-4">
            {/* Source Select */}
            <div>
               <label htmlFor="source" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Source</label>
               <select
                 id="source"
                 value={formData.source}
                 onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                 className={`${selectStyles} w-full`}
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
            </div>
            
            {/* Source Details Input */}
            <div>
               <label htmlFor="sourceDetails" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                 Source Details <span className="text-xs text-gray-400">(Vendor, Builder, etc.)</span>
               </label>
               <input
                 type="text"
                 id="sourceDetails"
                 value={formData.sourceDetails || ''}
                 onChange={(e) => setFormData({ ...formData, sourceDetails: e.target.value })}
                 className={`${inputStyles} w-full`}
                 placeholder="Enter source details"
                 disabled={disabled}
               />
             </div>

            {/* Conditional Rental Fields */}
            {formData.source === 'rented' && (
              <>
                <div>
                  <RequiredLabel>Rental Source</RequiredLabel>
                  <input type="text" value={formData.rentalSource ?? ''} onChange={(e) => setFormData({ ...formData, rentalSource: e.target.value })} className={inputStyles} required disabled={disabled} />
                </div>
                 <div>
                   <RequiredLabel>Return Due Date</RequiredLabel>
                   <input type="date" id="rentalDueDate" value={formData.rentalDueDate ?? ''} onChange={(e) => setFormData({ ...formData, rentalDueDate: e.target.value })} className={`${inputStyles} text-white`} required disabled={disabled} />
                 </div>
              </>
            )}

            {/* Price */}
             <div>
               <label htmlFor="price" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Price/Value (€)</label>
               <input type="number" id="price" value={formData.price ?? ''} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className={inputStyles} placeholder="Enter price or estimated value" disabled={disabled} />
             </div>
         </div>
      </div>

       {/* Fieldset: Handling & Usage - MOVE transport/shipping checkboxes out */}
       <div className={fieldsetStyles}>
          <h3 className={legendStyles}>Handling & Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
             {/* Checkboxes - REMOVE transport/shipping related ones */}
             <div className={checkboxContainerStyles}><input type="checkbox" id="isConsumable" checked={!!formData.isConsumable} onChange={(e) => setFormData({ ...formData, isConsumable: e.target.checked })} disabled={disabled} /><label htmlFor="isConsumable" className={checkboxLabelStyles}>Consumable</label></div>
             <div className={checkboxContainerStyles}><input type="checkbox" id="isBreakable" checked={!!formData.isBreakable} onChange={(e) => setFormData({ ...formData, isBreakable: e.target.checked })} disabled={disabled} /><label htmlFor="isBreakable" className={checkboxLabelStyles}>Breakable/Fragile</label></div>
             <div className={checkboxContainerStyles}><input type="checkbox" id="hasUsageInstructions" checked={!!formData.hasUsageInstructions} onChange={(e) => setFormData({ ...formData, hasUsageInstructions: e.target.checked })} disabled={disabled} /><label htmlFor="hasUsageInstructions" className={checkboxLabelStyles}>Has Usage Instructions</label></div>
             <div className={checkboxContainerStyles}><input type="checkbox" id="hasMaintenanceNotes" checked={!!formData.hasMaintenanceNotes} onChange={(e) => setFormData({ ...formData, hasMaintenanceNotes: e.target.checked })} disabled={disabled} /><label htmlFor="hasMaintenanceNotes" className={checkboxLabelStyles}>Has Maintenance Notes</label></div>
             <div className={checkboxContainerStyles}><input type="checkbox" id="hasSafetyNotes" checked={!!formData.hasSafetyNotes} onChange={(e) => setFormData({ ...formData, hasSafetyNotes: e.target.checked })} disabled={disabled} /><label htmlFor="hasSafetyNotes" className={checkboxLabelStyles}>Has Safety Notes</label></div>
             <div className={checkboxContainerStyles}><input type="checkbox" id="isHazardous" checked={!!formData.isHazardous} onChange={(e) => setFormData({ ...formData, isHazardous: e.target.checked })} disabled={disabled} /><label htmlFor="isHazardous" className={checkboxLabelStyles}>Hazardous Material</label></div>
             {/* -- REMOVED requiresPreShowSetup, hasOwnShippingCrate, requiresSpecialTransport, travelsUnboxed -- */} 
             <div className={checkboxContainerStyles}><input type="checkbox" id="hasBeenModified" checked={!!formData.hasBeenModified} onChange={(e) => setFormData({ ...formData, hasBeenModified: e.target.checked })} disabled={disabled} /><label htmlFor="hasBeenModified" className={checkboxLabelStyles}>Has Been Modified</label></div>
          </div>

          {/* Conditional Rich Text Editors / Textareas */}
          {formData.hasUsageInstructions && (
            <div className={conditionalFieldStyles}>
              <label htmlFor="usageInstructions" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Usage Instructions</label>
              <textarea
                id="usageInstructions"
                value={formData.usageInstructions || ''}
                onChange={(e) => setFormData({ ...formData, usageInstructions: e.target.value })}
                className={`${inputStyles} w-full min-h-[100px]`}
                placeholder="Enter usage instructions..."
                disabled={disabled}
              />
            </div>
          )}
          {formData.hasMaintenanceNotes && (
            <div className={conditionalFieldStyles}>
              <label htmlFor="maintenanceNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Maintenance Notes</label>
              <textarea
                id="maintenanceNotes"
                value={formData.maintenanceNotes || ''}
                onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
                className={`${inputStyles} w-full min-h-[100px]`}
                placeholder="Enter maintenance notes..."
                disabled={disabled}
              />
            </div>
          )}
          {formData.hasSafetyNotes && (
            <div className={conditionalFieldStyles}>
              <label htmlFor="safetyNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Safety Notes</label>
              <textarea
                id="safetyNotes"
                value={formData.safetyNotes || ''}
                onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })}
                className={`${inputStyles} w-full min-h-[100px]`}
                placeholder="Enter safety notes..."
                disabled={disabled}
              />
            </div>
          )}
          {formData.hasBeenModified && (
            <div className={conditionalFieldStyles}>
              <label htmlFor="modificationDetails" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Modification Details</label>
              <textarea
                id="modificationDetails"
                value={formData.modificationDetails || ''}
                onChange={(e) => setFormData({ ...formData, modificationDetails: e.target.value })}
                className={`${inputStyles} w-full min-h-[100px]`}
                placeholder="Describe modifications made..."
                disabled={disabled}
              />
            </div>
          )}
       </div>

       {/* --- NEW Fieldset: Pre-show Setup --- */}
       <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Pre-show Setup</h3>
         <div className={checkboxContainerStyles}>
           <input type="checkbox" id="requiresPreShowSetup" checked={!!formData.requiresPreShowSetup} onChange={(e) => setFormData({ ...formData, requiresPreShowSetup: e.target.checked })} disabled={disabled} />
           <label htmlFor="requiresPreShowSetup" className={checkboxLabelStyles}>Requires Pre-Show Setup</label>
         </div>
         {formData.requiresPreShowSetup && (
           <div className="mt-4 space-y-4 pl-6">
             <div>
               <label htmlFor="preShowSetupDuration" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                 Setup Duration (minutes)
               </label>
               <input
                 type="number"
                 id="preShowSetupDuration"
                 value={formData.preShowSetupDuration ?? ''}
                 onChange={(e) => setFormData({ ...formData, preShowSetupDuration: Number(e.target.value) || undefined })}
                 className={inputStyles}
                 placeholder="Enter setup time in minutes"
                 min="0"
                 disabled={disabled}
               />
             </div>
             <div>
               <label htmlFor="preShowSetupNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                 Setup Instructions
               </label>
               {/* Consider using WysiwygEditor here too if needed */}
               <textarea
                 id="preShowSetupNotes"
                 value={formData.preShowSetupNotes || ''}
                 onChange={(e) => setFormData({ ...formData, preShowSetupNotes: e.target.value })}
                 className={`${inputStyles} w-full min-h-[100px]`}
                 placeholder="Enter setup instructions"
                 disabled={disabled}
               />
             </div>
             <div>
               <label htmlFor="preShowSetupVideo" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                 Setup Video URL (Optional)
               </label>
               <input
                 type="url"
                 id="preShowSetupVideo"
                 value={formData.preShowSetupVideo || ''}
                 onChange={(e) => setFormData({ ...formData, preShowSetupVideo: e.target.value })}
                 className={`${inputStyles} w-full`}
                 placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                 disabled={disabled}
               />
             </div>
           </div>
         )}
       </div>

       {/* --- NEW Fieldset: Transport Information --- */}
       <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Transport Information</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
           <div className={checkboxContainerStyles}><input type="checkbox" id="hasOwnShippingCrate" checked={!!formData.hasOwnShippingCrate} onChange={(e) => setFormData({ ...formData, hasOwnShippingCrate: e.target.checked })} disabled={disabled} /><label htmlFor="hasOwnShippingCrate" className={checkboxLabelStyles}>Has Own Shipping Crate</label></div>
           <div className={checkboxContainerStyles}><input type="checkbox" id="requiresSpecialTransport" checked={!!formData.requiresSpecialTransport} onChange={(e) => setFormData({ ...formData, requiresSpecialTransport: e.target.checked })} disabled={disabled} /><label htmlFor="requiresSpecialTransport" className={checkboxLabelStyles}>Requires Special Transport</label></div>
           <div className={checkboxContainerStyles}><input type="checkbox" id="travelsUnboxed" checked={!!formData.travelsUnboxed} onChange={(e) => setFormData({ ...formData, travelsUnboxed: e.target.checked })} disabled={disabled} /><label htmlFor="travelsUnboxed" className={checkboxLabelStyles}>Travels Unboxed</label></div>
         </div>
         <div className="mt-4">
             <label htmlFor="travelWeight" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
               Travel Weight ({formData.weightUnit || 'kg'}) {/* Use selected weight unit */}
             </label>
             <input
               type="number"
               id="travelWeight"
               value={formData.travelWeight ?? ''}
               onChange={(e) => setFormData({ ...formData, travelWeight: Number(e.target.value) || undefined })}
               className={inputStyles}
               placeholder={`Enter weight in ${formData.weightUnit || 'kg'}`}
               min="0"
               disabled={disabled}
             />
         </div>
       </div>

       {/* Fieldset: Digital Assets */}
       <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Digital Assets (Manuals, Schematics, etc.)</h3>
         <DigitalAssetForm 
            onChange={(newAssets) => setFormData({ ...formData, digitalAssets: newAssets })}
            assets={formData.digitalAssets || []}
            disabled={disabled}
         />
          <div className="mt-4 space-y-2">
            {(formData.digitalAssets || []).map((asset) => (
              <div key={asset.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate pr-2">{asset.name} ({asset.type})</a>
                <button type="button" onClick={() => handleRemoveDigitalAsset(asset.id)} className="text-red-500 hover:text-red-400 flex-shrink-0" aria-label="Remove Asset">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
       </div>

       {/* Fieldset: Videos */}
       <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Videos (Links)</h3>
         <VideoAssetForm
            onChange={(newVideos: DigitalAsset[]) => setFormData({ ...formData, videos: newVideos })}
            assets={(formData.videos as DigitalAsset[]) || []}
            disabled={disabled}
         />
          {/* Display Added Videos */} 
          <div className="mt-4 space-y-2">
            {((formData.videos as DigitalAsset[]) || []).map((video) => (
              <div key={video.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                 <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Video size={16} className="text-gray-400 flex-shrink-0"/>
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate pr-2">
                       {video.name || video.url}
                    </a>
                 </div>
                <button
                  type="button"
                  onClick={() => handleRemoveVideoAsset(video.id)}
                  className="text-red-500 hover:text-red-400 flex-shrink-0"
                  aria-label="Remove Video Link"
                  disabled={disabled}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
       </div>

       {/* --- NEW Fieldset: Lifecycle Status & Location --- */}
       <div className={fieldsetStyles}>
         <h3 className={legendStyles}>Lifecycle Status & Location</h3>
         <div className="space-y-4">
           {/* Status Select */}
           <div>
             <label htmlFor="status" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
             <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as PropLifecycleStatus })} className={selectStyles} required disabled={disabled}>
               {propLifecycleStatuses.map((status) => ( 
                 <option key={status} value={status}>
                   {lifecycleStatusLabels[status]} {/* Use label for display */}
                 </option> 
               ))} 
             </select>
           </div>
           {/* Status Notes Textarea */}
           <div>
             <label htmlFor="statusNotes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
               Status Notes
             </label>
             <textarea
               id="statusNotes"
               value={formData.statusNotes || ''}
               onChange={(e) => setFormData({ ...formData, statusNotes: e.target.value })}
               className={inputStyles + " min-h-[80px]"}
               placeholder="Add notes about the current status"
               disabled={disabled}
             />
           </div>
           {/* Storage Location Input - Moved and Relabeled */}
           <div>
             <label htmlFor="location" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
               Storage Location
             </label>
             <input
               type="text"
               id="location"
               value={formData.location || ''}
               onChange={(e) => setFormData({ ...formData, location: e.target.value })}
               className={inputStyles}
               placeholder="e.g., Shelf A-3, Warehouse B"
               disabled={disabled}
             />
           </div>
           {/* Current Location Input */}
           <div>
             <label htmlFor="currentLocation" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
               Current Location
             </label>
             <input
               type="text"
               id="currentLocation"
               value={formData.currentLocation || ''}
               onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
               className={`${inputStyles} w-full`}
               placeholder="e.g., Onstage SL, Rehearsal Room 1"
               disabled={disabled}
             />
           </div>
         </div>
       </div>

      {/* Submit/Cancel Buttons */}
      <div className="flex justify-end gap-4 mt-8">
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel} 
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            disabled={disabled}
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          disabled={disabled}
        >
          {disabled ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {mode === 'create' ? 'Create Prop' : 'Update Prop'}
        </button>
      </div>

    </form>
  );
}