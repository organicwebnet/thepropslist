import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Address } from '../hooks/useAddresses';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: Omit<Address, 'id'>) => Promise<void>;
  editingAddress?: Address | null;
  type: 'venue' | 'rehearsal' | 'storage';
  title: string;
}

const defaultAddress: Omit<Address, 'id'> = {
  name: '',
  type: 'venue',
  companyName: '',
  street1: '',
  street2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'United Kingdom',
  nickname: '',
};

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAddress,
  type,
  title
}) => {
  const [formData, setFormData] = useState<Omit<Address, 'id'>>(defaultAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAddress) {
      setFormData(editingAddress);
    } else {
      setFormData({ ...defaultAddress, type });
    }
    setError(null);
  }, [editingAddress, type, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate required fields
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.street1?.trim()) {
      setError('Street address is required');
      return;
    }
    if (!formData.city?.trim()) {
      setError('City is required');
      return;
    }
    if (!formData.region?.trim()) {
      setError('Region/State is required');
      return;
    }
    if (!formData.postalCode?.trim()) {
      setError('Postal code is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Omit<Address, 'id'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-pb-darker rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-pb-gray hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="address-name" className="block text-pb-gray mb-1 font-medium text-sm">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="address-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                required
                aria-describedby={error ? "address-error" : undefined}
              />
            </div>

            <div>
              <label htmlFor="address-type" className="block text-pb-gray mb-1 font-medium text-sm">
                Type <span className="text-red-400">*</span>
              </label>
              <select
                id="address-type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value as 'venue' | 'rehearsal' | 'storage')}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                required
              >
                <option value="venue">Venue</option>
                <option value="rehearsal">Rehearsal Space</option>
                <option value="storage">Storage Space</option>
              </select>
            </div>

            <div>
              <label htmlFor="address-company" className="block text-pb-gray mb-1 font-medium text-sm">
                Company Name
              </label>
              <input
                id="address-company"
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              />
            </div>

            <div>
              <label htmlFor="address-street1" className="block text-pb-gray mb-1 font-medium text-sm">
                Street Address <span className="text-red-400">*</span>
              </label>
              <input
                id="address-street1"
                type="text"
                value={formData.street1}
                onChange={(e) => handleChange('street1', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                required
              />
            </div>

            <div>
              <label htmlFor="address-street2" className="block text-pb-gray mb-1 font-medium text-sm">
                Street Address 2
              </label>
              <input
                id="address-street2"
                type="text"
                value={formData.street2 || ''}
                onChange={(e) => handleChange('street2', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              />
            </div>

            <div>
              <label htmlFor="address-city" className="block text-pb-gray mb-1 font-medium text-sm">
                City <span className="text-red-400">*</span>
              </label>
              <input
                id="address-city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                required
              />
            </div>

            <div>
              <label htmlFor="address-region" className="block text-pb-gray mb-1 font-medium text-sm">
                Region/State <span className="text-red-400">*</span>
              </label>
              <input
                id="address-region"
                type="text"
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                required
              />
            </div>

            <div>
              <label htmlFor="address-postal" className="block text-pb-gray mb-1 font-medium text-sm">
                Postal Code <span className="text-red-400">*</span>
              </label>
              <input
                id="address-postal"
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                required
              />
            </div>

            <div>
              <label htmlFor="address-country" className="block text-pb-gray mb-1 font-medium text-sm">
                Country
              </label>
              <input
                id="address-country"
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-pb-primary text-white rounded hover:bg-pb-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Saving...' : (editingAddress ? 'Update' : 'Add')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
