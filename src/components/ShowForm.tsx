import React, { useState } from 'react';
import { PlusCircle, Save } from 'lucide-react';
import { VenueForm } from './VenueForm';
import type { ShowFormData } from '../types';

interface ShowFormProps {
  onSubmit: (show: ShowFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: ShowFormData;
  mode?: 'create' | 'edit';
}

const initialFormState: ShowFormData = {
  name: '',
  acts: 1,
  scenes: 1,
  description: '',
  venues: [],
  stageManager: '',
  propsSupervisor: '',
  productionCompany: '',
  isTouringShow: false,
  contacts: []
};

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-sm font-medium text-gray-300 mb-2">
      {children} <span className="text-primary">*</span>
    </span>
  );
}

export function ShowForm({ onSubmit, onCancel, initialData, mode = 'create' }: ShowFormProps) {
  const [formData, setFormData] = useState<ShowFormData>(initialData || initialFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If not a touring show, ensure only one venue is set
    const submitData = {
      ...formData,
      venues: formData.isTouringShow ? formData.venues : formData.venues.slice(0, 1)
    };
    await onSubmit(submitData);
    if (mode === 'create') {
      setFormData(initialFormState);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="gradient-border p-6">
      <div className="grid gap-6">
        <div>
          <RequiredLabel>Show Name</RequiredLabel>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter show name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <RequiredLabel>Number of Acts</RequiredLabel>
            <input
              type="number"
              id="acts"
              required
              min="1"
              value={formData.acts}
              onChange={(e) => setFormData({ ...formData, acts: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <RequiredLabel>Total Number of Scenes</RequiredLabel>
            <input
              type="number"
              id="scenes"
              required
              min="1"
              value={formData.scenes}
              onChange={(e) => setFormData({ ...formData, scenes: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
            placeholder="Enter show description"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isTouringShow}
              onChange={(e) => {
                const isTouringShow = e.target.checked;
                setFormData({ 
                  ...formData, 
                  isTouringShow,
                  // Reset venues when toggling touring status
                  venues: isTouringShow ? [] : formData.venues.slice(0, 1)
                });
              }}
              className="form-checkbox h-4 w-4 text-primary bg-[#1A1A1A] border-gray-800 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-300">This is a touring show</span>
          </label>
        </div>

        {formData.isTouringShow ? (
          <VenueForm
            venues={formData.venues}
            onChange={(venues) => setFormData({ ...formData, venues })}
          />
        ) : (
          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-300 mb-2">
              Venue
            </label>
            <input
              type="text"
              id="venue"
              value={formData.venues[0]?.name || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                venues: [{ ...formData.venues[0], name: e.target.value }]
              })}
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter venue name"
            />
          </div>
        )}

        <div>
          <label htmlFor="stageManager" className="block text-sm font-medium text-gray-300 mb-2">
            Stage Manager
          </label>
          <input
            type="text"
            id="stageManager"
            value={formData.stageManager}
            onChange={(e) => setFormData({ ...formData, stageManager: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter stage manager's name"
          />
        </div>

        <div>
          <label htmlFor="propsSupervisor" className="block text-sm font-medium text-gray-300 mb-2">
            Props Supervisor
          </label>
          <input
            type="text"
            id="propsSupervisor"
            value={formData.propsSupervisor}
            onChange={(e) => setFormData({ ...formData, propsSupervisor: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter props supervisor's name"
          />
        </div>

        <div>
          <label htmlFor="productionCompany" className="block text-sm font-medium text-gray-300 mb-2">
            Production Company
          </label>
          <input
            type="text"
            id="productionCompany"
            value={formData.productionCompany}
            onChange={(e) => setFormData({ ...formData, productionCompany: e.target.value })}
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter production company name"
          />
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
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
            className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0A0A0A] transition-colors"
          >
            {mode === 'edit' ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Show
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}