import React, { useState, useEffect, FormEvent } from 'react';
import type { Prop, PropFormData, PropSource, PropCategory, DimensionUnit, PropImage } from '@/shared/types/props'; // Adjust path if needed
import { propCategories } from '@/shared/types/props';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle'; // Adjust path if needed

interface WebPropFormProps {
  initialData?: Prop;
  onSubmit: (formData: PropFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting: boolean;
  imageFiles: FileList | null;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  imagePreviews: string[];
  mode?: 'add' | 'edit';
}

const statusOptions = Object.keys(lifecycleStatusLabels) as PropLifecycleStatus[];
const dimensionUnitOptions: DimensionUnit[] = ['cm', 'in', 'm', 'ft'];
const sourceTypesWithOptions: Array<{ value: PropSource; label: string; hasDetails: boolean; detailsLabel: string; detailsRequired: boolean; hasReturnDate?: boolean; returnDateRequired?: boolean; hasReference?: boolean; hasPurchaseUrl?: boolean; }> = [
  { value: 'owned', label: 'Owned', hasDetails: false, detailsLabel: 'N/A', detailsRequired: false },
  { value: 'bought', label: 'Bought', hasDetails: true, detailsLabel: 'Store/Seller Name', detailsRequired: true, hasPurchaseUrl: true },
  { value: 'made', label: 'Made', hasDetails: true, detailsLabel: 'Maker Details', detailsRequired: true },
  { value: 'created', label: 'Created', hasDetails: true, detailsLabel: 'Creator Details', detailsRequired: true }, // Assuming 'created' is similar to 'made'
  { value: 'rented', label: 'Rented', hasDetails: true, detailsLabel: 'Source Details', detailsRequired: true, hasReturnDate: true, returnDateRequired: true, hasReference: true },
  { value: 'borrowed', label: 'Borrowed', hasDetails: true, detailsLabel: 'Source Details', detailsRequired: true, hasReturnDate: true, returnDateRequired: false },
];

export function WebPropForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  imageFiles,
  onImageChange,
  imagePreviews,
  mode = 'add'
}: WebPropFormProps) {
  const [formData, setFormData] = useState<Partial<PropFormData>>(() => {
    if (initialData) {
      return { ...initialData };
    } else {
      return { 
        name: '', 
        quantity: 1, 
        category: propCategories[0],
        source: sourceTypesWithOptions[0].value,
        status: statusOptions[0],
        price: 0,
        unit: dimensionUnitOptions[0],
        images: []
      }; 
    }
  });

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({ ...initialData });
    } else {
      setFormData({ 
        name: '', 
        quantity: 1, 
        category: propCategories[0],
        source: sourceTypesWithOptions[0].value,
        status: statusOptions[0],
        price: 0,
        unit: dimensionUnitOptions[0],
        images: []
      });
    }
  }, [initialData, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      processedValue = e.target.checked;
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));

    // Clear conditional source fields if source type changes
    if (name === 'source') {
      setFormData(prev => ({
        ...prev,
        sourceDetails: undefined,
        returnDueDate: undefined,
        rentalReferenceNumber: undefined,
        purchaseUrl: undefined,
      }));
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setFormData(prev => ({ ...prev, tags: tagsArray }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name || !formData.category || !formData.source || !formData.status) {
        alert('Please fill in all required fields (Name, Category, Source, Status).');
        return;
    }
    const submissionData: PropFormData = {
        name: formData.name || '',
        category: formData.category || propCategories[0],
        source: formData.source || sourceTypesWithOptions[0].value,
        status: formData.status || statusOptions[0],
        quantity: Number(formData.quantity) || 1,
        price: Number(formData.price) || 0,
        description: formData.description || '',
        location: formData.location || '',
        unit: formData.unit || dimensionUnitOptions[0],
        length: Number(formData.length) || undefined,
        width: Number(formData.width) || undefined,
        height: Number(formData.height) || undefined,
        notes: formData.notes || '',
        tags: formData.tags || [],
        images: formData.images || [],
        // Add conditional source fields
        sourceDetails: formData.sourceDetails,
        returnDueDate: formData.returnDueDate ? new Date(formData.returnDueDate) : undefined, // Ensure Date object or undefined
        rentalReferenceNumber: formData.rentalReferenceNumber,
        purchaseUrl: formData.purchaseUrl,
        ...(formData as Omit<PropFormData, 'name' | 'category' | 'source' | 'status' | 'quantity' | 'price' | 'description' | 'location' | 'unit' | 'length' | 'width' | 'height' | 'notes' | 'tags' | 'images' | 'sourceDetails' | 'returnDueDate' | 'rentalReferenceNumber' | 'purchaseUrl'>)
    };
    try {
      await onSubmit(submissionData);
    } catch (err) {
      console.error("Error submitting form:", err);
      alert('An unexpected error occurred. Please try again later.');
    }
  };

  // Adjusted input/select classes: removed w-full, changed background
  const inputClasses = "px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectClasses = "px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClasses = "block text-sm font-medium text-gray-300 mb-1";

  // Get current source type configuration
  const currentSourceConfig = sourceTypesWithOptions.find(opt => opt.value === formData.source) || sourceTypesWithOptions[0];

  // Format returnDueDate for the input field
  const formattedReturnDueDate = formData.returnDueDate instanceof Date 
    ? formData.returnDueDate.toISOString().split('T')[0] 
    : (typeof formData.returnDueDate === 'string' ? formData.returnDueDate : '');

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
      {/* --- Image Upload & Previews --- */}
      <div>
        <label htmlFor="images" className={labelClasses}>Images</label>
        <input 
          type="file" 
          id="images" 
          name="images" 
          accept="image/*" 
          multiple 
          onChange={onImageChange}
          className={`block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 ${inputClasses} p-0`}
        />
        {imagePreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {imagePreviews.map((previewUrl, index) => (
              <img 
                key={index} 
                src={previewUrl} 
                alt={`Preview ${index + 1}`} 
                className="w-full h-24 object-cover rounded-md border border-gray-600"
              />
            ))}
          </div>
        )}
      </div>

       {/* --- Basic Info --- */}
       <fieldset className="border border-gray-700 p-4 rounded-md">
          <legend className="text-base font-semibold text-gray-200 px-2">Basic Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
             <div>
                <label htmlFor="name" className={labelClasses}>Name <span className="text-red-500">*</span></label>
                <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required className={`${inputClasses} w-full`}/>
              </div>
              <div>
                <label htmlFor="category" className={labelClasses}>Category <span className="text-red-500">*</span></label>
                <select id="category" name="category" value={formData.category || ''} onChange={handleChange} required className={`${selectClasses} w-full`}>
                  {propCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
          </div>
           <div className="mt-4">
              <label htmlFor="description" className={labelClasses}>Description</label>
              <textarea id="description" name="description" rows={3} value={formData.description || ''} onChange={handleChange} className={`${inputClasses} w-full`}/>
           </div>
       </fieldset>

        {/* --- Details & Status --- */}
       <fieldset className="border border-gray-700 p-4 rounded-md">
          <legend className="text-base font-semibold text-gray-200 px-2">Details & Status</legend>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
             <div>
                <label htmlFor="quantity" className={labelClasses}>Quantity <span className="text-red-500">*</span></label>
                <input type="number" id="quantity" name="quantity" value={formData.quantity ?? 1} onChange={handleChange} min="0" required className={`${inputClasses} max-w-xs`}/>
              </div>
              <div>
                <label htmlFor="status" className={labelClasses}>Status <span className="text-red-500">*</span></label>
                <select id="status" name="status" value={formData.status || ''} onChange={handleChange} required className={`${selectClasses} w-full md:w-auto`}>
                  {statusOptions.map(stat => <option key={stat} value={stat}>{lifecycleStatusLabels[stat] || stat}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="source" className={labelClasses}>Source <span className="text-red-500">*</span></label>
                <select id="source" name="source" value={formData.source || ''} onChange={handleChange} required className={`${selectClasses} w-full md:w-auto`}>
                  {sourceTypesWithOptions.map(src => <option key={src.value} value={src.value}>{src.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="location" className={labelClasses}>Location</label>
                <input type="text" id="location" name="location" value={formData.location || ''} onChange={handleChange} className={inputClasses}/>
              </div>
          </div>
           <div className="mt-4">
              <label htmlFor="price" className={labelClasses}>Price (per item)</label>
              <input type="number" id="price" name="price" value={formData.price ?? 0} onChange={handleChange} min="0" step="0.01" className={`${inputClasses} max-w-xs`}/>
            </div>
        </fieldset>

      {/* --- NEW: Source Information --- */}
      <fieldset className="border border-gray-700 p-4 rounded-md">
        <legend className="text-base font-semibold text-gray-200 px-2">Source Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Source Type Dropdown */}
          <div>
            <label htmlFor="source" className={labelClasses}>Source Type <span className="text-red-500">*</span></label>
            <select 
              id="source" 
              name="source" 
              value={formData.source || ''} 
              onChange={handleChange} 
              required 
              className={`${selectClasses} w-full md:w-auto`}
            >
              {sourceTypesWithOptions.map(src => 
                <option key={src.value} value={src.value}>{src.label}</option>
              )}
            </select>
          </div>

          {/* Conditional Source Details */}
          {currentSourceConfig.hasDetails && (
            <div>
              <label htmlFor="sourceDetails" className={labelClasses}>{currentSourceConfig.detailsLabel} {currentSourceConfig.detailsRequired && <span className="text-red-500">*</span>}</label>
              <input 
                type="text" 
                id="sourceDetails" 
                name="sourceDetails" 
                value={formData.sourceDetails || ''} 
                onChange={handleChange} 
                required={currentSourceConfig.detailsRequired} 
                className={inputClasses}
                placeholder={currentSourceConfig.detailsLabel} 
              />
            </div>
          )}

          {/* Conditional Return Due Date */}
          {currentSourceConfig.hasReturnDate && (
             <div>
                <label htmlFor="returnDueDate" className={labelClasses}>Return Due Date {currentSourceConfig.returnDateRequired && <span className="text-red-500">*</span>}</label>
                <input 
                  type="date" 
                  id="returnDueDate" 
                  name="returnDueDate" 
                  value={formattedReturnDueDate}
                  onChange={handleChange} 
                  required={currentSourceConfig.returnDateRequired} 
                  className={inputClasses}
                />
             </div>
          )}

          {/* Conditional Reference Number (for Rented) */}
          {currentSourceConfig.hasReference && (
             <div>
                <label htmlFor="rentalReferenceNumber" className={labelClasses}>Reference Number</label>
                <input 
                  type="text" 
                  id="rentalReferenceNumber" 
                  name="rentalReferenceNumber" 
                  value={formData.rentalReferenceNumber || ''} 
                  onChange={handleChange} 
                  className={inputClasses}
                  placeholder="Enter reference number"
                />
             </div>
          )}

           {/* Conditional Purchase URL (for Bought) */}
          {currentSourceConfig.hasPurchaseUrl && (
             <div>
                <label htmlFor="purchaseUrl" className={labelClasses}>Purchase URL</label>
                <input 
                  type="url" 
                  id="purchaseUrl" 
                  name="purchaseUrl" 
                  value={formData.purchaseUrl || ''} 
                  onChange={handleChange} 
                  className={inputClasses}
                  placeholder="https://example.com/product"
                />
             </div>
          )}
        </div>
      </fieldset>

      {/* --- Dimensions --- */}
      <fieldset className="border border-gray-700 p-4 rounded-md">
        <legend className="text-base font-semibold text-gray-200 px-2">Dimensions & Weight</legend>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
           <div>
              <label htmlFor="length" className={labelClasses}>Length</label>
              <input type="number" id="length" name="length" value={formData.length ?? ''} onChange={handleChange} min="0" step="any" className={`${inputClasses} max-w-[100px]`} />
            </div>
            <div>
              <label htmlFor="width" className={labelClasses}>Width</label>
              <input type="number" id="width" name="width" value={formData.width ?? ''} onChange={handleChange} min="0" step="any" className={`${inputClasses} max-w-[100px]`} />
            </div>
            <div>
              <label htmlFor="height" className={labelClasses}>Height</label>
              <input type="number" id="height" name="height" value={formData.height ?? ''} onChange={handleChange} min="0" step="any" className={`${inputClasses} max-w-[100px]`} />
            </div>
            <div>
              <label htmlFor="unit" className={labelClasses}>Dimension Unit</label>
              <select id="unit" name="unit" value={formData.unit || dimensionUnitOptions[0]} onChange={handleChange} className={selectClasses}>
                {dimensionUnitOptions.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
             <div>
                <label htmlFor="weight" className={labelClasses}>Weight</label>
                <input type="number" id="weight" name="weight" value={formData.weight ?? ''} onChange={handleChange} min="0" step="any" className={`${inputClasses} max-w-[100px]`} />
              </div>
        </div>
      </fieldset>

       {/* --- Notes & Tags --- */}
       <fieldset className="border border-gray-700 p-4 rounded-md">
          <legend className="text-base font-semibold text-gray-200 px-2">Notes & Tags</legend>
            <div className="mt-2">
             <label htmlFor="notes" className={labelClasses}>General Notes</label>
             <textarea id="notes" name="notes" rows={3} value={formData.notes || ''} onChange={handleChange} className={`${inputClasses} w-full`}/>
           </div>
           <div className="mt-4">
             <label htmlFor="tags" className={labelClasses}>Tags (comma-separated)</label>
             <input 
                type="text" 
                id="tags" 
                name="tags" 
                value={formData.tags?.join(', ') || ''} 
                onChange={handleTagsChange}
                className={`${inputClasses} w-full`}
              />
           </div>
        </fieldset>

      {/* --- Submit Button --- */}
      <div className="flex justify-end gap-4 pt-4">
        {onCancel && (
           <button 
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
        )}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : (mode === 'edit' ? 'Update Prop' : 'Add Prop')}
        </button>
      </div>
    </form>
  );
} 