import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';

interface Address {
  id: string;
  name: string;
  type: 'venue' | 'rehearsal' | 'storage';
  companyName?: string;
  street1: string;
  street2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  nickname?: string;
}

interface EntitySelectProps {
  label: string;
  type: 'venue' | 'rehearsal' | 'storage'; // Address type to filter/add
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowMultiple?: boolean;
  onBeforeAddNew?: () => void; // Callback to cache form state before opening modal
}

const defaultAddress: Address = {
  id: '',
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

const EntitySelect: React.FC<EntitySelectProps> = ({ label, type, selectedIds, onChange, allowMultiple, onBeforeAddNew }) => {
  const { service: firebaseService } = useFirebase();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({ ...defaultAddress, type });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    firebaseService.getDocuments('addresses', { where: [['type', '==', type]] })
      .then((docs: any[]) => {
        setAddresses(docs.map(doc => ({ id: doc.id, ...doc.data })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [type, firebaseService]);

  const handleSelect = (id: string) => {
    console.log('EntitySelect: handleSelect called', { id, selectedIds, allowMultiple });
    if (allowMultiple) {
      if (selectedIds.includes(id)) {
        const newIds = selectedIds.filter(i => i !== id);
        console.log('EntitySelect: Removing venue', { newIds });
        onChange(newIds);
      } else {
        const newIds = [...selectedIds, id];
        console.log('EntitySelect: Adding venue', { newIds });
        onChange(newIds);
      }
    } else {
      console.log('EntitySelect: Setting single venue', { id });
      onChange([id]);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent form submission from bubbling up to parent form
    console.log('EntitySelect: handleAddAddress called', { newAddress, type });
    
    // Validate required fields
    if (!newAddress.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!newAddress.street1?.trim()) {
      setError('Street address is required');
      return;
    }
    if (!newAddress.city?.trim()) {
      setError('City is required');
      return;
    }
    if (!newAddress.region?.trim()) {
      setError('Region/State is required');
      return;
    }
    if (!newAddress.postalCode?.trim()) {
      setError('Postal code is required');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      console.log('EntitySelect: Adding address to database...');
      const result = await firebaseService.addDocument('addresses', {
        ...newAddress,
        name: newAddress.name.trim(),
        street1: newAddress.street1.trim(),
        city: newAddress.city.trim(),
        region: newAddress.region.trim(),
        postalCode: newAddress.postalCode.trim(),
        street2: newAddress.street2?.trim() || '',
        companyName: newAddress.companyName?.trim() || '',
        nickname: newAddress.nickname?.trim() || '',
      });
      console.log('EntitySelect: Address added successfully', { result });
      
      setShowAddModal(false);
      setNewAddress({ ...defaultAddress, type });
      setSaving(false);
      
      // Refresh the addresses list after adding a new one
      console.log('EntitySelect: Refreshing addresses list...');
      setLoading(true);
      firebaseService.getDocuments('addresses', { where: [['type', '==', type]] })
        .then((docs: any[]) => {
          console.log('EntitySelect: Addresses refreshed', { count: docs.length, type });
          setAddresses(docs.map(doc => ({ id: doc.id, ...doc.data })));
          setLoading(false);
        })
        .catch((err) => {
          console.error('EntitySelect: Error refreshing addresses', err);
          setLoading(false);
        });
    } catch (err: any) {
      console.error('EntitySelect: Error adding address', err);
      setError(err.message || 'Failed to add address. Please try again.');
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewAddress({ ...defaultAddress, type });
    setError(null);
  };

  const filteredAddresses = addresses.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.street1?.toLowerCase().includes(search.toLowerCase()) ||
      a.city?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mb-4">
      <label className="block text-pb-gray mb-1 font-medium">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder={`Search ${label}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
        />
        <button type="button" onClick={() => {
          console.log('EntitySelect: Add New button clicked, caching form state...');
          // Cache form state before opening modal
          if (onBeforeAddNew) {
            onBeforeAddNew();
          }
          setShowAddModal(true);
        }} className="flex items-center gap-1 text-pb-primary hover:text-pb-accent px-3 py-2 rounded bg-pb-primary/10">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {loading ? (
          <div className="text-pb-primary">Loading...</div>
        ) : filteredAddresses.length === 0 ? (
          <div className="text-pb-gray">No {label.toLowerCase()} found.</div>
        ) : filteredAddresses.map(address => (
          <div key={address.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${selectedIds.includes(address.id) ? 'bg-pb-primary/20 text-pb-primary' : 'hover:bg-pb-primary/10'}`} onClick={() => handleSelect(address.id)}>
            <span className="font-medium">{address.name}</span>
            <span className="text-xs text-pb-gray ml-2">{address.street1}, {address.city}</span>
            {selectedIds.includes(address.id) && <span className="ml-auto text-pb-primary">Selected</span>}
          </div>
        ))}
      </div>
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-pb-darker rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button className="absolute top-3 right-3 text-pb-gray hover:text-pb-primary" onClick={handleCancelAdd}><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold mb-4 text-white">Add New {label}</h2>
              {error && <div id="address-error" className="text-red-500 mb-2" role="alert" aria-live="polite">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="address-name" className="block text-pb-gray mb-1 font-medium">Name *</label>
                  <input 
                    id="address-name"
                    type="text" 
                    value={newAddress.name} 
                    onChange={e => setNewAddress(v => ({ ...v, name: e.target.value }))} 
                    required 
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" 
                    aria-describedby={error ? "address-error" : undefined}
                  />
                </div>
                <div>
                  <label htmlFor="address-type" className="block text-pb-gray mb-1 font-medium">Type *</label>
                  <select 
                    id="address-type"
                    value={newAddress.type} 
                    onChange={e => setNewAddress(v => ({ ...v, type: e.target.value as Address['type'] }))} 
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
                    aria-describedby={error ? "address-error" : undefined}
                  >
                    <option value="venue">Venue</option>
                    <option value="rehearsal">Rehearsal Space</option>
                    <option value="storage">Storage Space</option>
                  </select>
                </div>
                <fieldset className="p-3 rounded bg-pb-darker/40 border border-pb-primary/20">
                  <legend className="px-2 text-pb-primary font-semibold">Postal Address</legend>
                  {(Object.keys(defaultAddress) as Array<keyof Address>).filter(k => k !== 'id' && k !== 'nickname' && k !== 'name' && k !== 'companyName' && k !== 'type').map(key => {
                    const fieldId = `address-${key}`;
                    const isRequired = ['street1', 'city', 'region', 'postalCode'].includes(key);
                    return (
                      <div key={key} className="mb-2">
                        <label htmlFor={fieldId} className="block text-xs font-medium text-pb-gray mb-1">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          {isRequired && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input 
                          id={fieldId}
                          type="text" 
                          value={newAddress[key] || ''} 
                          onChange={e => setNewAddress(v => ({ ...v, [key]: e.target.value }))} 
                          className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" 
                          required={isRequired}
                          aria-describedby={error ? "address-error" : undefined}
                        />
                      </div>
                    );
                  })}
                </fieldset>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={handleCancelAdd} disabled={saving} className="flex-1 py-2 rounded-lg bg-pb-darker hover:bg-pb-darker/80 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed">
                    Cancel
                  </button>
                  <button type="button" onClick={handleAddAddress} disabled={saving} className="flex-1 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EntitySelect; 