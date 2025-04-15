import React, { useState } from 'react';
import { PlusCircle, Save } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { DigitalAssetForm } from './DigitalAssetForm';
import type { PropFormData, PropFormProps } from '../types';
import { dimensionUnits, weightUnits } from '../types';

const initialFormState: PropFormData = {
  name: '',
  price: 0,
  description: '',
  category: '',
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

export function PropForm({ onSubmit, disabled = false, initialData, mode = 'create', onCancel }: PropFormProps) {
  const [formData, setFormData] = useState<PropFormData>(initialData || initialFormState);

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

    if (formData.source === 'rented') {
      if (!formData.rentalSource?.trim()) {
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
      setFormData(initialFormState);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="gradient-border p-6">
      <div className="grid gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Name <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter prop name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description <span className="text-primary">*</span>
          </label>
          <textarea
            id="description"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
            placeholder="Enter prop description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
              Price (per unit) <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              id="price"
              required
              value={formData.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter price"
            />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">
              Quantity <span className="text-primary">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              required
              min="1"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
            Category <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            id="category"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter category"
          />
        </div>

        <ImageUpload
          onImagesChange={(images) => setFormData({ ...formData, images })}
          currentImages={formData.images}
        />

        <div className="space-y-4">
          <DigitalAssetForm
            assets={formData.digitalAssets}
            onChange={(assets) => setFormData({ ...formData, digitalAssets: assets })}
          />
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Source Information</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Type <span className="text-primary">*</span>
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as 'bought' | 'made' | 'rented' | 'borrowed' })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="bought">Bought</option>
                <option value="made">Made</option>
                <option value="rented">Rented</option>
                <option value="borrowed">Borrowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Details <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sourceDetails}
                onChange={(e) => setFormData({ ...formData, sourceDetails: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={formData.source === 'bought' ? 'Store/Seller name' : formData.source === 'made' ? 'Maker details' : 'Source details'}
              />
            </div>
          </div>

          {formData.source === 'bought' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Purchase URL
              </label>
              <input
                type="url"
                value={formData.purchaseUrl}
                onChange={(e) => setFormData({ ...formData, purchaseUrl: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://example.com/product"
              />
            </div>
          )}

          {(formData.source === 'rented' || formData.source === 'borrowed') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Return Due Date {formData.source === 'rented' && <span className="text-primary">*</span>}
                </label>
                <input
                  type="date"
                  required={formData.source === 'rented'}
                  value={formData.rentalDueDate}
                  onChange={(e) => setFormData({ ...formData, rentalDueDate: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              {formData.source === 'rented' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.rentalReferenceNumber}
                    onChange={(e) => setFormData({ ...formData, rentalReferenceNumber: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter reference number"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Scene Information</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isMultiScene}
              onChange={(e) => setFormData({ ...formData, isMultiScene: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-gray-300">Used in multiple scenes</span>
          </label>

          {!formData.isMultiScene && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Used in Act <span className="text-primary">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.act}
                  onChange={(e) => setFormData({ ...formData, act: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Used in Scene <span className="text-primary">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.scene}
                  onChange={(e) => setFormData({ ...formData, scene: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Physical Properties</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Length
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.length || ''}
                onChange={(e) => setFormData({ ...formData, length: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter length in ${formData.unit}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Width
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.width || ''}
                onChange={(e) => setFormData({ ...formData, width: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter width in ${formData.unit}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Height
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.height || ''}
                onChange={(e) => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter height in ${formData.unit}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {dimensionUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Weight
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={`Enter weight in ${formData.weightUnit}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Weight Unit
              </label>
              <select
                value={formData.weightUnit}
                onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value as 'kg' | 'lb' })}
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Usage Instructions</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasUsageInstructions}
              onChange={(e) => setFormData({ ...formData, hasUsageInstructions: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-gray-300">Add usage instructions</span>
          </label>

          {formData.hasUsageInstructions && (
            <textarea
              value={formData.usageInstructions}
              onChange={(e) => setFormData({ ...formData, usageInstructions: e.target.value })}
              placeholder="Enter detailed usage instructions"
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Maintenance</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasMaintenanceNotes}
              onChange={(e) => setFormData({ ...formData, hasMaintenanceNotes: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-gray-300">Add maintenance notes</span>
          </label>

          {formData.hasMaintenanceNotes && (
            <textarea
              value={formData.maintenanceNotes}
              onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
              placeholder="Enter maintenance requirements and schedule"
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Safety</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasSafetyNotes}
              onChange={(e) => setFormData({ ...formData, hasSafetyNotes: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-gray-300">Add safety notes</span>
          </label>

          {formData.hasSafetyNotes && (
            <textarea
              value={formData.safetyNotes}
              onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })}
              placeholder="Enter safety requirements and precautions"
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Pre-show Setup</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.requiresPreShowSetup}
              onChange={(e) => setFormData({ ...formData, requiresPreShowSetup: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-gray-300">Requires pre-show setup</span>
          </label>

          {formData.requiresPreShowSetup && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Setup Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.preShowSetupDuration || ''}
                  onChange={(e) => setFormData({ ...formData, preShowSetupDuration: parseInt(e.target.value) || undefined })}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter setup time in minutes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Setup Instructions
                </label>
                <textarea
                  value={formData.preShowSetupNotes}
                  onChange={(e) => setFormData({ ...formData, preShowSetupNotes: e.target.value })}
                  placeholder="Enter detailed setup instructions"
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Setup Video URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.preShowSetupVideo}
                  onChange={(e) => setFormData({ ...formData, preShowSetupVideo: e.target.value })}
                  placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Transport Information</div>
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hasOwnShippingCrate}
                onChange={(e) => setFormData({ ...formData, hasOwnShippingCrate: e.target.checked })}
                className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
              />
              <span className="text-gray-300">Has dedicated shipping crate</span>
            </label>

            {formData.hasOwnShippingCrate && (
              <textarea
                value={formData.shippingCrateDetails}
                onChange={(e) => setFormData({ ...formData, shippingCrateDetails: e.target.value })}
                placeholder="Enter shipping crate details and dimensions"
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
              />
            )}

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.requiresSpecialTransport}
                onChange={(e) => setFormData({ ...formData, requiresSpecialTransport: e.target.checked })}
                className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
              />
              <span className="text-gray-300">Requires special transport</span>
            </label>

            {formData.requiresSpecialTransport && (
              <div className="space-y-4">
                <textarea
                  value={formData.transportNotes}
                  onChange={(e) => setFormData({ ...formData, transportNotes: e.target.value })}
                  placeholder="Enter special transport requirements"
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={2}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Travel Weight ({formData.weightUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.travelWeight || ''}
                    onChange={(e) => setFormData({ ...formData, travelWeight: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={`Enter weight in ${formData.weightUnit}`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300 uppercase tracking-wider">Modifications</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.hasBeenModified}
              onChange={(e) => setFormData({ ...formData, hasBeenModified: e.target.checked })}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-gray-300">Prop has been modified</span>
          </label>

          {formData.hasBeenModified && (
            <div className="space-y-4">
              <textarea
                value={formData.modificationDetails}
                onChange={(e) => setFormData({ ...formData, modificationDetails: e.target.value })}
                placeholder="Enter modification details"
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Modification Date
                </label>
                <input
                  type="date"
                  value={formData.lastModifiedAt || ''}
                  onChange={(e) => setFormData({ ...formData, lastModifiedAt: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          {mode === 'edit' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0A0A0A] transition-colors disabled:opacity-50"
          >
            {mode === 'edit' ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Prop
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}