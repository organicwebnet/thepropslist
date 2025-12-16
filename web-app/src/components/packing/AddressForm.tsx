import React, { useState, useEffect } from 'react';
import { Address, AddressService, formatAddressLines } from '../../../shared/services/addressService';
import { FirebaseService } from '../../../shared/services/firebase/types';
import { ChevronDown, X } from 'lucide-react';

interface AddressFormData {
  company?: string;
  recipient?: string;
  contactName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  phone?: string;
}

interface AddressFormProps {
  label: string;
  value: string; // The stored address string (for backward compatibility)
  onChange: (addressString: string) => void;
  disabled?: boolean;
  showId?: string; // Optional showId for filtering saved addresses
  service: FirebaseService;
}

const AddressForm: React.FC<AddressFormProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  showId,
  service,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>({});

  // Initialize form data from value string if it exists
  useEffect(() => {
    if (value && !isExpanded) {
      // Try to parse the address string - if it's a formatted address, we'll keep it as is
      // Otherwise, populate form fields if we can detect structure
      const lines = value.split('\n');
      if (lines.length > 2) {
        // Likely a formatted address, keep as is
        setFormData({});
      }
    }
  }, [value, isExpanded]);

  // Load saved addresses
  useEffect(() => {
    const loadAddresses = async () => {
      if (!showId) return;
      setLoadingAddresses(true);
      try {
        const addressService = new AddressService(service);
        const addresses = await addressService.listAddresses({ showId });
        setSavedAddresses(addresses);
      } catch (error) {
        console.error('Failed to load addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };
    loadAddresses();
  }, [showId, service]);

  // Handle saved address selection
  useEffect(() => {
    if (selectedAddressId && useSavedAddress) {
      const selected = savedAddresses.find(a => a.id === selectedAddressId);
      if (selected) {
        const formatted = formatAddressLines(selected);
        onChange(formatted);
        setFormData({
          company: selected.company,
          recipient: selected.recipient,
          contactName: selected.contactName,
          line1: selected.line1,
          line2: selected.line2,
          city: selected.city,
          region: selected.region,
          postcode: selected.postcode,
          country: selected.country,
          phone: selected.phone,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, useSavedAddress, savedAddresses]);

  const handleFormChange = (field: keyof AddressFormData, fieldValue: string) => {
    const updated = { ...formData, [field]: fieldValue };
    setFormData(updated);
    
    // Format address string from form data
    const formatted = formatAddressLines(updated);
    onChange(formatted);
  };

  const handleClear = () => {
    setFormData({});
    onChange('');
    setSelectedAddressId(null);
    setUseSavedAddress(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-white">{label}</label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-pb-gray/70 hover:text-white transition-colors disabled:opacity-50"
            title="Clear address"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Saved Address Selector */}
      {showId && savedAddresses.length > 0 && (
        <div className="mb-3">
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={useSavedAddress}
              onChange={(e) => {
                setUseSavedAddress(e.target.checked);
                if (!e.target.checked) {
                  setSelectedAddressId(null);
                  setFormData({});
                  onChange('');
                }
              }}
              disabled={disabled}
              className="w-4 h-4 text-pb-primary focus:ring-pb-primary disabled:opacity-50"
            />
            <span className="text-sm text-pb-gray/70">Use saved address</span>
          </label>
          {useSavedAddress && (
            <select
              value={selectedAddressId || ''}
              onChange={(e) => setSelectedAddressId(e.target.value || null)}
              disabled={disabled || loadingAddresses}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select saved address...</option>
              {savedAddresses.map((addr) => (
                <option key={addr.id} value={addr.id} className="bg-pb-darker text-white">
                  {addr.name || addr.company || formatAddressLines(addr).split('\n')[0] || 'Unnamed Address'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Expand/Collapse Button */}
      {!useSavedAddress && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white hover:bg-pb-darker/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
        >
          <span className="text-sm">
            {isExpanded ? 'Hide address form' : value ? 'Edit address' : 'Enter address'}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Address Preview (when collapsed and has value) */}
      {!isExpanded && value && !useSavedAddress && (
        <div className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/40 text-pb-gray/70 text-sm whitespace-pre-line">
          {value}
        </div>
      )}

      {/* Address Form Fields */}
      {isExpanded && !useSavedAddress && (
        <div className="space-y-3 p-4 rounded-lg border border-white/10 bg-pb-darker/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">Company/Organization</label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => handleFormChange('company', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">Recipient Name</label>
              <input
                type="text"
                value={formData.recipient || ''}
                onChange={(e) => handleFormChange('recipient', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="Recipient name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-pb-gray/70 mb-1">Contact Name</label>
            <input
              type="text"
              value={formData.contactName || ''}
              onChange={(e) => handleFormChange('contactName', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              placeholder="Contact person name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-pb-gray/70 mb-1">Address Line 1</label>
            <input
              type="text"
              value={formData.line1 || ''}
              onChange={(e) => handleFormChange('line1', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              placeholder="Street address"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-pb-gray/70 mb-1">Address Line 2</label>
            <input
              type="text"
              value={formData.line2 || ''}
              onChange={(e) => handleFormChange('line2', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleFormChange('city', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">Region/State</label>
              <input
                type="text"
                value={formData.region || ''}
                onChange={(e) => handleFormChange('region', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="State/Region"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">Postcode</label>
              <input
                type="text"
                value={formData.postcode || ''}
                onChange={(e) => handleFormChange('postcode', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="Postcode"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">Country</label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => handleFormChange('country', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="Country"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pb-gray/70 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressForm;

