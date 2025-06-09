import React, { useState, useEffect } from 'react';
import { MaintenanceRecord } from '../../types/lifecycle.ts';
import { WysiwygEditor } from '../WysiwygEditor.tsx';
import { Wrench, RefreshCcw, Calendar, Clock, AlertTriangle, HelpCircle, Edit2 } from 'lucide-react';

interface MaintenanceRecordFormProps {
  onSubmit: (record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  disabled?: boolean;
}

export function MaintenanceRecordForm({ onSubmit, disabled = false }: MaintenanceRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeHelp, setShowTypeHelp] = useState(false);
  const [formData, setFormData] = useState<Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>>({
    date: new Date().toISOString().split('T')[0], // This will be auto-set to current date on submission
    type: 'maintenance',
    description: '',
    performedBy: '',
    notes: '',
    estimatedReturnDate: undefined,
    repairDeadline: undefined
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Set the date to current date automatically
      const currentDate = new Date().toISOString().split('T')[0];
      
      await onSubmit({
        ...formData,
        date: currentDate // Automatically timestamp when submitted
      });
      
      // Reset form
      setFormData({
        date: currentDate,
        type: 'maintenance',
        description: '',
        performedBy: '',
        notes: '',
        estimatedReturnDate: undefined,
        repairDeadline: undefined
      });
    } catch (error) {
      alert('Failed to add maintenance record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if the selected type is repair to show repair-specific fields
  const isRepairType = formData.type === 'repair';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            Type
            <div className="relative">
              <HelpCircle 
                className="h-4 w-4 text-[var(--text-secondary)] cursor-help hover:text-[var(--highlight-color)]"
                onMouseEnter={() => setShowTypeHelp(true)}
                onMouseLeave={() => setShowTypeHelp(false)}
              />
              {showTypeHelp && (
                <div className="absolute z-50 w-64 p-3 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg -right-2 top-6">
                  <h5 className="font-medium mb-2 text-[var(--text-primary)]">Maintenance Types:</h5>
                  <ul className="space-y-2">
                    <li><span className="font-medium">Maintenance:</span> Routine upkeep and preventive care</li>
                    <li><span className="font-medium">Repair:</span> Fixing damage or malfunction</li>
                    <li><span className="font-medium">Modification:</span> Altering or customizing the prop</li>
                    <li><span className="font-medium">Inspection:</span> Regular safety and condition checks</li>
                  </ul>
                </div>
              )}
            </div>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Description
        </label>
        <WysiwygEditor
          value={formData.description}
          onChange={(value: string) => setFormData({ ...formData, description: value })}
          placeholder="Describe the maintenance or repair performed..."
          minHeight={100}
          disabled={disabled || isSubmitting}
        />
      </div>

      {isRepairType && (
        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg space-y-4 border border-[var(--border-color)]">
          <h4 className="font-medium text-[var(--text-primary)]">Repair Timeline</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                Repair Deadline
                <span className="text-xs text-[var(--text-secondary)]/70 ml-1">(Must be fixed by)</span>
              </label>
              <input
                type="date"
                value={formData.repairDeadline || ''}
                onChange={(e) => setFormData({ ...formData, repairDeadline: e.target.value || undefined })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2"
                min={new Date().toISOString().split('T')[0]}
                disabled={disabled || isSubmitting}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Estimated Return Date
                <span className="text-xs text-[var(--text-secondary)]/70 ml-1">(Expected back)</span>
              </label>
              <input
                type="date"
                value={formData.estimatedReturnDate || ''}
                onChange={(e) => setFormData({ ...formData, estimatedReturnDate: e.target.value || undefined })}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2"
                min={new Date().toISOString().split('T')[0]}
                disabled={disabled || isSubmitting}
                required={isRepairType}
              />
            </div>
          </div>
          
          <p className="text-xs text-[var(--text-secondary)]">
            <strong>Note:</strong> The repair deadline indicates when the prop must be fixed by for production needs. 
            The estimated return date is when you expect the repaired prop to be returned to the production.
          </p>
        </div>
      )}

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
        disabled={disabled || isSubmitting || !formData.description || !formData.performedBy || (isRepairType && !formData.estimatedReturnDate)}
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
      
      <p className="text-xs text-center text-[var(--text-secondary)]">
        The submission will be automatically timestamped with today's date.
      </p>
    </form>
  );
} 