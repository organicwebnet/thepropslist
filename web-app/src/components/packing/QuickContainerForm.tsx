import React, { useState } from 'react';
import { Plus, Box } from 'lucide-react';
import { DEFAULT_DIMENSIONS, TEMPLATE_TYPES } from '../../constants/containerConstants';

interface ContainerForm {
  description?: string;
  type?: string;
  length?: string;
  width?: string;
  height?: string;
  unit?: 'cm' | 'in';
  location?: string;
}

interface QuickContainerFormProps {
  onSubmit: (form: ContainerForm) => void;
  onTemplateClick: (type: string) => void;
  containerCount: number;
  isCreating?: boolean;
}

const QuickContainerForm: React.FC<QuickContainerFormProps> = ({
  onSubmit,
  onTemplateClick,
  containerCount,
  isCreating = false,
}) => {
  const [form, setForm] = useState<ContainerForm>({
    description: '',
    type: '',
    length: '',
    width: '',
    height: '',
    unit: 'cm',
    location: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'type') {
      const defaults = DEFAULT_DIMENSIONS[value as keyof typeof DEFAULT_DIMENSIONS];
      if (defaults) {
        setForm({
          ...form,
          type: value,
          length: String(defaults.length),
          width: String(defaults.width),
          height: String(defaults.height),
          unit: defaults.unit,
        });
        return;
      }
    }
    setForm({ ...form, [name]: value });
  };

  const validateForm = (): string | null => {
    if (!form.type) {
      return 'Container type is required';
    }
    
    // Validate dimensions if provided
    if (form.length || form.width || form.height) {
      const length = form.length ? parseFloat(form.length) : null;
      const width = form.width ? parseFloat(form.width) : null;
      const height = form.height ? parseFloat(form.height) : null;
      
      if (length !== null && (isNaN(length) || length <= 0)) {
        return 'Length must be a positive number';
      }
      if (width !== null && (isNaN(width) || width <= 0)) {
        return 'Width must be a positive number';
      }
      if (height !== null && (isNaN(height) || height <= 0)) {
        return 'Height must be a positive number';
      }
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      // Show error - could use a toast or error state
      alert(validationError);
      return;
    }
    
    onSubmit(form);
    
    // Reset form
    setForm({
      description: '',
      type: '',
      length: '',
      width: '',
      height: '',
      unit: 'cm',
      location: '',
    });
  };

  const handleAddAndCreateAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const validationError = validateForm();
    if (validationError) {
      // Show error - could use a toast or error state
      alert(validationError);
      return;
    }
    
    onSubmit(form);
    
    // Reset form but keep it open for another entry
    setForm({
      description: '',
      type: form.type, // Keep the type for convenience
      length: '',
      width: '',
      height: '',
      unit: form.unit, // Keep the unit
      location: '',
    });
  };

  const handleTemplateClick = (type: string) => {
    onTemplateClick(type);
  };

  return (
    <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Quick Container Creation</h2>
        </div>
        <div className="text-sm text-pb-gray/70">
          <span className="px-2 py-1 rounded-full bg-pb-primary/20 text-pb-primary border border-pb-primary/30">
            {containerCount} container{containerCount !== 1 ? 's' : ''} created
          </span>
        </div>
      </div>

      {/* Template Buttons */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-white mb-2">Quick Create Templates</label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_TYPES.map((type) => {
            const defaults = DEFAULT_DIMENSIONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTemplateClick(type)}
                disabled={isCreating}
                className="px-3 py-2 text-sm bg-pb-primary/20 text-pb-primary rounded-lg border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={`Create ${type} (${defaults.width}×${defaults.height}×${defaults.length} ${defaults.unit})`}
              >
                <Box className="w-4 h-4" />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Container Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
            >
              <option value="">Select type...</option>
              <option value="Cardboard Box">Cardboard Box</option>
              <option value="Pallet">Pallet</option>
              <option value="Flight Case">Flight Case</option>
              <option value="Custom Case">Custom Case</option>
              <option value="Crate">Crate</option>
              <option value="Tote">Tote</option>
              <option value="Trunk">Trunk</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Unit</label>
            <select
              name="unit"
              value={form.unit || 'cm'}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Dimensions</label>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="length"
              value={form.length || ''}
              onChange={handleChange}
              placeholder="Length"
              className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              aria-label="Container length"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="width"
              value={form.width || ''}
              onChange={handleChange}
              placeholder="Width"
              className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              aria-label="Container width"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="height"
              value={form.height || ''}
              onChange={handleChange}
              placeholder="Height"
              className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              aria-label="Container height"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Description (optional)</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Enter container description..."
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 min-h-[60px] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Location (optional)</label>
          <input
            type="text"
            name="location"
            value={form.location || ''}
            onChange={handleChange}
            placeholder="e.g., Warehouse A, Room 101"
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isCreating || !form.type}
            className="flex-1 px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Add Container'}
          </button>
          <button
            type="button"
            disabled={isCreating || !form.type}
            onClick={handleAddAndCreateAnother}
            className="px-4 py-2 rounded-lg bg-pb-primary/70 hover:bg-pb-primary text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Create container and keep form open for another"
          >
            Add & Create Another
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickContainerForm;

