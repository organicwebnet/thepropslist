import React, { useState, useEffect } from 'react';
import { PlusCircle, Save, Loader2, Upload } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { DigitalAssetForm } from './DigitalAssetForm';
import { PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, DimensionUnit } from '@shared/types/props';
import { Show, Act, Scene } from 'src/types';
import { WysiwygEditor } from './WysiwygEditor';
import { HelpTooltip } from './HelpTooltip';
import { PropLifecycleStatus, lifecycleStatusLabels } from 'src/types/lifecycle';

export interface PropFormProps {
  onSubmit: (prop: PropFormData) => Promise<void>;
  disabled?: boolean;
  initialData?: PropFormData;
  mode?: 'create' | 'edit';
  onCancel?: () => void;
  show?: Show;
}

export const dimensionUnits = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
  { value: 'mm', label: 'mm' }
] as const;

export const weightUnits = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' }
] as const;

const initialFormState: PropFormData = {
  name: '',
  price: 0,
  description: '',
  category: 'Other' as PropCategory,
  quantity: 1,
  status: 'confirmed',
  source: 'bought',
  images: [],
  digitalAssets: [],
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
  customFields: {},
  videos: [],
  materials: [],
  handedness: 'either',
  isBreakable: false,
  isHazardous: false,
};

export function PropForm({ onSubmit, initialData, mode = 'create', onCancel, show, disabled = false }: PropFormProps): JSX.Element {
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

  return (
    <form onSubmit={handleSubmit} className="gradient-border section-spacing">
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Add New Prop</h2>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Name
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Prop Name Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Be specific and descriptive</li>
                    <li>Include key identifying features</li>
                    <li>Use standard terminology</li>
                  </ul>
                </div>
              } />
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Enter prop name"
              required
              disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Category
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Categories help organize props by:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Type of prop</li>
                    <li>Usage context</li>
                    <li>Storage requirements</li>
                  </ul>
                </div>
              } />
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as PropCategory })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              required
              disabled={disabled}
            >
              <option value="">Select a category</option>
              {propCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Price
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Price Information:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Enter the total cost per unit</li>
                    <li>Include any additional fees</li>
                    <li>For rentals, enter the rental cost</li>
                  </ul>
                </div>
              } />
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">£</span>
              <input
                type="number"
                id="price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg pl-8 pr-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Quantity
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Quantity Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Enter total number of identical items</li>
                    <li>Minimum value is 1</li>
                    <li>For sets, count individual pieces</li>
                  </ul>
                </div>
              } />
            </label>
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Enter quantity"
              min="1"
              required
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)]">
            Description
          </label>
          <WysiwygEditor
            value={formData.description || ''}
            onChange={handleDescriptionChange}
            placeholder="Enter prop description"
            minHeight={100}
            disabled={disabled}
          />
        </div>

        <div className="space-y-4">
          <ImageUpload
            onImagesChange={(newImages) => setFormData({ ...formData, images: newImages })}
            currentImages={formData.images || []}
          />
        </div>

        <div className="space-y-4">
          <DigitalAssetForm
            assets={formData.digitalAssets || []}
            onChange={(newAssets) => setFormData({ ...formData, digitalAssets: newAssets })}
          />
        </div>

        {/* Source Information */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
            Source Information
            <HelpTooltip content={
              <div>
                <p className="font-medium mb-1">Source Types:</p>
                <ul className="space-y-2">
                  <li><span className="font-medium">Bought:</span> Purchased from a store/seller</li>
                  <li><span className="font-medium">Made:</span> Created in-house</li>
                  <li><span className="font-medium">Rented:</span> Temporary use with return date</li>
                  <li><span className="font-medium">Borrowed:</span> Borrowed from another production</li>
                </ul>
              </div>
            } />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Source Type <span className="text-primary">*</span>
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as 'bought' | 'made' | 'rented' | 'borrowed' })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={disabled}
              >
                <option value="bought">Bought</option>
                <option value="made">Made</option>
                <option value="rented">Rented</option>
                <option value="borrowed">Borrowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Source Details <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sourceDetails}
                onChange={(e) => setFormData({ ...formData, sourceDetails: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={formData.source === 'bought' ? 'Store/Seller name' : formData.source === 'made' ? 'Maker details' : 'Source details'}
                disabled={disabled}
              />
            </div>
          </div>

          {formData.source === 'bought' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Purchase URL
              </label>
              <input
                type="url"
                value={formData.purchaseUrl}
                onChange={(e) => setFormData({ ...formData, purchaseUrl: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://example.com/product"
                disabled={disabled}
              />
            </div>
          )}

          {(formData.source === 'rented' || formData.source === 'borrowed') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Return Due Date {formData.source === 'rented' && <span className="text-primary">*</span>}
                </label>
                <input
                  type="date"
                  required={formData.source === 'rented'}
                  value={formData.rentalDueDate || ''}
                  onChange={(e) => setFormData({ ...formData, rentalDueDate: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={disabled}
                />
              </div>
              {formData.source === 'rented' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.rentalReferenceNumber}
                    onChange={(e) => setFormData({ ...formData, rentalReferenceNumber: e.target.value })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter reference number"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scene Information */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Scene Information</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isMultiScene}
              onChange={(e) => setFormData({ ...formData, isMultiScene: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              disabled={disabled}
            />
            <span className="text-[var(--text-secondary)]">Used in multiple scenes</span>
          </label>

          {!formData.isMultiScene && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Act <span className="text-primary">*</span>
                </label>
                <select
                  required
                  value={formData.act || ''}
                  onChange={(e) => {
                    const actId = parseInt(e.target.value);
                    setFormData({ 
                      ...formData, 
                      act: isNaN(actId) ? undefined : actId, 
                      scene: undefined
                    });
                  }}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                  disabled={disabled}
                >
                  <option value="">Select Act</option>
                  {Array.isArray(show?.acts) && show.acts.map((act: any) => (
                    <option key={act.id} value={act.id}>{act.name || `Act ${act.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Scene <span className="text-primary">*</span>
                </label>
                <select
                  required
                  value={formData.scene || ''}
                  onChange={(e) => setFormData({ ...formData, scene: parseInt(e.target.value) || undefined })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                  disabled={disabled || formData.isMultiScene}
                >
                  <option value="">Select Scene</option>
                  {Array.isArray(show?.acts) && show.acts.find((act: any) => act.id === formData.act)?.scenes.map((scene: any) => (
                    <option key={scene.id} value={scene.id}>{scene.name || `Scene ${scene.id}`}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Physical Properties */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
            Physical Properties
            <HelpTooltip content={
              <div>
                <p className="font-medium mb-1">Measurements:</p>
                <ul className="space-y-2">
                  <li><span className="font-medium">Length/Width/Height:</span> Main dimensions</li>
                  <li><span className="font-medium">Weight:</span> Important for transport</li>
                  <li><span className="font-medium">Units:</span> Choose appropriate units</li>
                </ul>
              </div>
            } />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Length
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.length || ''}
                onChange={(e) => setFormData({ ...formData, length: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter length in ${formData.unit}`}
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Width
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.width || ''}
                onChange={(e) => setFormData({ ...formData, width: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter width in ${formData.unit}`}
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Height
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter height in ${formData.unit}`}
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Unit
              </label>
              <select
                value={formData.unit || 'cm'}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as DimensionUnit })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={disabled}
              >
                {dimensionUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Weight
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter weight in ${formData.weightUnit}`}
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Weight Unit
              </label>
              <select
                value={formData.weightUnit}
                onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value as 'kg' | 'lb' })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={disabled}
              >
                {weightUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Usage Instructions</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasUsageInstructions}
              onChange={(e) => setFormData({ ...formData, hasUsageInstructions: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              disabled={disabled}
            />
            <span className="text-[var(--text-secondary)]">Add usage instructions</span>
          </label>

          {formData.hasUsageInstructions && (
            <WysiwygEditor
              value={formData.usageInstructions || ''}
              onChange={handleUsageInstructionsChange}
              placeholder="Enter detailed usage instructions"
              minHeight={100}
              disabled={disabled}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Maintenance</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasMaintenanceNotes}
              onChange={(e) => setFormData({ ...formData, hasMaintenanceNotes: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              disabled={disabled}
            />
            <span className="text-[var(--text-secondary)]">Add maintenance notes</span>
          </label>

          {formData.hasMaintenanceNotes && (
            <WysiwygEditor
              value={formData.maintenanceNotes || ''}
              onChange={handleMaintenanceNotesChange}
              placeholder="Enter maintenance requirements and schedule"
              minHeight={100}
              disabled={disabled}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Safety</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasSafetyNotes}
              onChange={(e) => setFormData({ ...formData, hasSafetyNotes: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              disabled={disabled}
            />
            <span className="text-[var(--text-secondary)]">Add safety notes</span>
          </label>

          {formData.hasSafetyNotes && (
            <WysiwygEditor
              value={formData.safetyNotes || ''}
              onChange={handleSafetyNotesChange}
              placeholder="Enter safety requirements and precautions"
              minHeight={100}
              disabled={disabled}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Pre-show Setup</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.requiresPreShowSetup}
              onChange={(e) => setFormData({ ...formData, requiresPreShowSetup: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              disabled={disabled}
            />
            <span className="text-[var(--text-secondary)]">Requires pre-show setup</span>
          </label>

          {formData.requiresPreShowSetup && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Setup Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.preShowSetupDuration || ''}
                  onChange={(e) => setFormData({ ...formData, preShowSetupDuration: parseInt(e.target.value) || undefined })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter setup time in minutes"
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Setup Instructions
                </label>
                <WysiwygEditor
                  value={formData.preShowSetupNotes || ''}
                  onChange={(value) => setFormData({ ...formData, preShowSetupNotes: value })}
                  placeholder="Enter detailed setup instructions"
                  minHeight={100}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Setup Video URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.preShowSetupVideo}
                  onChange={(e) => setFormData({ ...formData, preShowSetupVideo: e.target.value })}
                  placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Transport Information</div>
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasOwnShippingCrate}
                onChange={(e) => setFormData({ ...formData, hasOwnShippingCrate: e.target.checked })}
                className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
                disabled={disabled}
              />
              <span className="text-[var(--text-secondary)]">Has dedicated shipping crate</span>
            </label>

            {formData.hasOwnShippingCrate && (
              <WysiwygEditor
                value={formData.shippingCrateDetails || ''}
                onChange={(value) => setFormData({ ...formData, shippingCrateDetails: value })}
                placeholder="Enter shipping crate details and dimensions"
                minHeight={80}
                disabled={disabled}
              />
            )}

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.requiresSpecialTransport}
                onChange={(e) => setFormData({ ...formData, requiresSpecialTransport: e.target.checked })}
                className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
                disabled={disabled}
              />
              <span className="text-[var(--text-secondary)]">Requires special transport</span>
            </label>

            {formData.requiresSpecialTransport && (
              <div className="space-y-4">
                <WysiwygEditor
                  value={formData.transportNotes || ''}
                  onChange={(value) => setFormData({ ...formData, transportNotes: value })}
                  placeholder="Enter special transport requirements"
                  minHeight={80}
                  disabled={disabled}
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Travel Weight ({formData.weightUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.travelWeight || ''}
                    onChange={(e) => setFormData({ ...formData, travelWeight: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={`Enter weight in ${formData.weightUnit}`}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Modifications</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasBeenModified}
              onChange={(e) => setFormData({ ...formData, hasBeenModified: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              disabled={disabled}
            />
            <span className="text-[var(--text-secondary)]">Prop has been modified</span>
          </label>

          {formData.hasBeenModified && (
            <div className="space-y-4">
              <WysiwygEditor
                value={formData.modificationDetails || ''}
                onChange={(value) => setFormData({ ...formData, modificationDetails: value })}
                placeholder="Enter modification details"
                minHeight={100}
                disabled={disabled}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Modification Date
                </label>
                <input
                  type="date"
                  value={formData.lastModifiedAt || ''}
                  onChange={(e) => setFormData({ ...formData, lastModifiedAt: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lifecycle Status */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Lifecycle Status</div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PropLifecycleStatus })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              disabled={disabled}
            >
              {Object.entries(lifecycleStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {typeof label === 'string' ? label : String(label)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Status Notes
            </label>
            <textarea
              value={formData.statusNotes || ''}
              onChange={(e) => setFormData({ ...formData, statusNotes: e.target.value })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Notes about the current status"
              rows={3}
              disabled={disabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Current Location
            </label>
            <input
              type="text"
              value={formData.currentLocation || ''}
              onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Where is this prop currently located?"
              disabled={disabled}
            />
          </div>

          {formData.status === 'loaned_out' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Expected Return Date
              </label>
              <input
                type="date"
                value={formData.expectedReturnDate || ''}
                onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                disabled={disabled}
              />
            </div>
          )}

          {(formData.status === 'damaged_awaiting_repair' || formData.status === 'out_for_repair') && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Repair Priority
              </label>
              <select
                value={formData.repairPriority || 'medium'}
                onChange={(e) => setFormData({ ...formData, repairPriority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                disabled={disabled}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}