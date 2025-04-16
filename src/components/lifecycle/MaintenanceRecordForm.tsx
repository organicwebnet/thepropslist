import React, { useState } from 'react';
import { MaintenanceRecord } from '../../types/lifecycle';
import { WysiwygEditor } from '../WysiwygEditor';
import { Wrench, RefreshCcw } from 'lucide-react';

interface MaintenanceRecordFormProps {
  onSubmit: (record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  disabled?: boolean;
}

export function MaintenanceRecordForm({ onSubmit, disabled = false }: MaintenanceRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'maintenance',
    description: '',
    performedBy: '',
    cost: undefined,
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'maintenance',
        description: '',
        performedBy: '',
        cost: undefined,
        notes: ''
      });
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      alert('Failed to add maintenance record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2"
            disabled={disabled || isSubmitting}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as MaintenanceRecord['type'] })}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2"
            disabled={disabled || isSubmitting}
            required
          >
            <option value="maintenance">Maintenance</option>
            <option value="repair">Repair</option>
            <option value="modification">Modification</option>
            <option value="inspection">Inspection</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Description
        </label>
        <WysiwygEditor
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="Describe the maintenance/repair work..."
          minHeight={100}
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Performed By
          </label>
          <input
            type="text"
            value={formData.performedBy}
            onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2"
            placeholder="Name of person/company"
            disabled={disabled || isSubmitting}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Cost (optional)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">£</span>
            <input
              type="number"
              value={formData.cost || ''}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg pl-8 pr-4 py-2"
              placeholder="Enter cost"
              disabled={disabled || isSubmitting}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Notes (optional)
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 min-h-[80px]"
          placeholder="Add any additional notes"
          disabled={disabled || isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={disabled || isSubmitting || !formData.description || !formData.performedBy}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <span>Adding Record...</span>
          </>
        ) : (
          <>
            <Wrench className="h-4 w-4" />
            <span>Add Maintenance Record</span>
          </>
        )}
      </button>
    </form>
  );
} 