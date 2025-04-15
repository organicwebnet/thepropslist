import React, { useState, useEffect } from 'react';
import { PlusCircle, Save, Loader2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { DigitalAssetForm } from './DigitalAssetForm';
import { PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, PropFormProps } from '../types';
import { dimensionUnits, weightUnits } from '../types';

// Define prop categories
const categories = [
  'Furniture',
  'Decoration',
  'Costume',
  'Weapon',
  'Food/Drink',
  'Book/Paper',
  'Electronics',
  'Musical Instrument',
  'Hand Prop',
  'Set Dressing',
  'Special Effects',
  'Lighting',
  'Other'
] as const;

export type Category = typeof categories[number];

const initialFormState: PropFormData = {
  name: '',
  price: 0,
  description: '',
  category: 'Other' as PropCategory,
  length: undefined,
  width: undefined,
  height: undefined,
  depth: undefined,
  weight: undefined,
  weightUnit: 'kg',
  unit: 'cm',
  source: 'bought',
  sourceDetails: '',
  purchaseUrl: '',
  act: 1,
  scene: 1,
  isMultiScene: false,
  isConsumable: false,
  quantity: 1,
  imageUrl: undefined,
  images: [],
  hasUsageInstructions: false,
  usageInstructions: '',
  hasMaintenanceNotes: false,
  maintenanceNotes: '',
  hasSafetyNotes: false,
  safetyNotes: '',
  handlingInstructions: '',
  requiresPreShowSetup: false,
  preShowSetupNotes: '',
  preShowSetupVideo: '',
  preShowSetupDuration: undefined,
  hasOwnShippingCrate: false,
  shippingCrateDetails: '',
  transportNotes: '',
  requiresSpecialTransport: false,
  travelWeight: undefined,
  hasBeenModified: false,
  modificationDetails: '',
  lastModifiedAt: undefined,
  isRented: false,
  rentalSource: '',
  rentalDueDate: '',
  rentalReferenceNumber: '',
  digitalAssets: []
};

export function PropForm({ onSubmit, initialData, mode = 'create', onCancel, show, disabled = false }: PropFormProps): JSX.Element {
  // Initialize form data with proper defaults for any missing fields
  const defaultFormData = {
    ...initialFormState,
    ...initialData,
    digitalAssets: initialData?.digitalAssets || []
  };
  
  const [formData, setFormData] = useState<PropFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePriceChange = (value: string) => {
    const cleanValue = value.replace(/[^\d.]/g, '');
    const parts = cleanValue.split('.');
    const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
    setFormData({ ...formData, price: parseFloat(formattedValue) || 0 });
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseInt(value) || 1;
    setFormData({ ...formData, quantity: Math.max(1, quantity) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.source === 'rented') {
      if (!formData.rentalSource?.trim()) {
        alert('Please enter the rental source');
        setIsSubmitting(false);
        return;
      }
      if (!formData.rentalDueDate) {
        alert('Please enter the return due date');
        setIsSubmitting(false);
        return;
      }
    }

    await onSubmit(formData);
    if (mode === 'create') {
      setFormData(initialFormState);
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="gradient-border section-spacing">
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Add New Prop</h2>
          {isSubmitting && (
            <div className="flex items-center gap-2 text-primary/80">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)]">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Enter prop name"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-secondary)]">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as PropCategory })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              required
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
            <label htmlFor="price" className="block text-sm font-medium text-[var(--text-secondary)]">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">£</span>
              <input
                type="number"
                id="price"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg pl-8 pr-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-[var(--text-secondary)]">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors"
              placeholder="Enter quantity"
              min="1"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)]">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-colors min-h-[100px] resize-y"
            placeholder="Enter prop description"
          />
        </div>

        <div className="space-y-4">
          <ImageUpload
            onImagesChange={(images) => setFormData({ ...formData, images })}
            currentImages={formData.images}
          />
        </div>

        <div className="space-y-4">
          <DigitalAssetForm
            assets={formData.digitalAssets}
            onChange={(assets) => setFormData({ ...formData, digitalAssets: assets })}
          />
        </div>

        {/* Source Information */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Source Information</div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Source Type <span className="text-primary">*</span>
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as 'bought' | 'made' | 'rented' | 'borrowed' })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  value={formData.rentalDueDate}
                  onChange={(e) => setFormData({ ...formData, rentalDueDate: e.target.value })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  value={formData.act}
                  onChange={(e) => {
                    const actId = parseInt(e.target.value);
                    const act = show?.acts.find(a => a.id === actId);
                    setFormData({ 
                      ...formData, 
                      act: actId,
                      scene: act?.scenes[0]?.id || 1,
                      sceneName: act?.scenes[0]?.name || ''
                    });
                  }}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                >
                  {show?.acts.map((act) => (
                    <option key={act.id} value={act.id}>
                      Act {act.id}{act.name ? ` - ${act.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Scene <span className="text-primary">*</span>
                </label>
                <select
                  required
                  value={formData.scene}
                  onChange={(e) => {
                    const sceneId = parseInt(e.target.value);
                    const scene = show?.acts.find(a => a.id === formData.act)?.scenes.find(s => s.id === sceneId);
                    setFormData({ 
                      ...formData, 
                      scene: sceneId,
                      sceneName: scene?.name || ''
                    });
                  }}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                >
                  {show?.acts.find(a => a.id === formData.act)?.scenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      Scene {scene.id}{scene.name ? ` - ${scene.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Physical Properties */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Physical Properties</div>
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            />
            <span className="text-[var(--text-secondary)]">Add usage instructions</span>
          </label>

          {formData.hasUsageInstructions && (
            <textarea
              value={formData.usageInstructions}
              onChange={(e) => setFormData({ ...formData, usageInstructions: e.target.value })}
              placeholder="Enter detailed usage instructions"
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
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
            />
            <span className="text-[var(--text-secondary)]">Add maintenance notes</span>
          </label>

          {formData.hasMaintenanceNotes && (
            <textarea
              value={formData.maintenanceNotes}
              onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
              placeholder="Enter maintenance requirements and schedule"
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
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
            />
            <span className="text-[var(--text-secondary)]">Add safety notes</span>
          </label>

          {formData.hasSafetyNotes && (
            <textarea
              value={formData.safetyNotes}
              onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })}
              placeholder="Enter safety requirements and precautions"
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Setup Instructions
                </label>
                <textarea
                  value={formData.preShowSetupNotes}
                  onChange={(e) => setFormData({ ...formData, preShowSetupNotes: e.target.value })}
                  placeholder="Enter detailed setup instructions"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
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
              />
              <span className="text-[var(--text-secondary)]">Has dedicated shipping crate</span>
            </label>

            {formData.hasOwnShippingCrate && (
              <textarea
                value={formData.shippingCrateDetails}
                onChange={(e) => setFormData({ ...formData, shippingCrateDetails: e.target.value })}
                placeholder="Enter shipping crate details and dimensions"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
              />
            )}

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.requiresSpecialTransport}
                onChange={(e) => setFormData({ ...formData, requiresSpecialTransport: e.target.checked })}
                className="form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
              />
              <span className="text-[var(--text-secondary)]">Requires special transport</span>
            </label>

            {formData.requiresSpecialTransport && (
              <div className="space-y-4">
                <textarea
                  value={formData.transportNotes}
                  onChange={(e) => setFormData({ ...formData, transportNotes: e.target.value })}
                  placeholder="Enter special transport requirements"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={2}
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
            />
            <span className="text-[var(--text-secondary)]">Prop has been modified</span>
          </label>

          {formData.hasBeenModified && (
            <div className="space-y-4">
              <textarea
                value={formData.modificationDetails}
                onChange={(e) => setFormData({ ...formData, modificationDetails: e.target.value })}
                placeholder="Enter modification details"
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
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
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4">
          <div className="flex gap-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Adding Prop...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-5 w-5" />
                  <span>Add Prop</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}