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
  onChange: (ids: string[], addresses: Address[]) => void;
  allowMultiple?: boolean;
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

const EntitySelect: React.FC<EntitySelectProps> = ({ label, type, selectedIds, onChange, allowMultiple }) => {
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
  }, [type, showAddModal, firebaseService]);

  const handleSelect = (id: string) => {
    if (allowMultiple) {
      if (selectedIds.includes(id)) {
        const newIds = selectedIds.filter(i => i !== id);
        onChange(newIds, addresses.filter(a => newIds.includes(a.id)));
      } else {
        const newIds = [...selectedIds, id];
        onChange(newIds, addresses.filter(a => newIds.includes(a.id)));
      }
    } else {
      onChange([id], addresses.filter(a => a.id === id));
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await firebaseService.addDocument('addresses', {
        ...newAddress,
      });
      setShowAddModal(false);
      setNewAddress({ ...defaultAddress, type });
      setSaving(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add.');
      setSaving(false);
    }
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
        <button type="button" onClick={() => setShowAddModal(true)} className="flex items-center gap-1 text-pb-primary hover:text-pb-accent px-3 py-2 rounded bg-pb-primary/10">
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
              <button className="absolute top-3 right-3 text-pb-gray hover:text-pb-primary" onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold mb-4 text-white">Add New {label}</h2>
              {error && <div className="text-red-500 mb-2">{error}</div>}
              <form onSubmit={handleAddAddress} className="space-y-4">
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Name *</label>
                  <input type="text" value={newAddress.name} onChange={e => setNewAddress(v => ({ ...v, name: e.target.value }))} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Type *</label>
                  <select value={newAddress.type} onChange={e => setNewAddress(v => ({ ...v, type: e.target.value as Address['type'] }))} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                    <option value="venue">Venue</option>
                    <option value="rehearsal">Rehearsal Space</option>
                    <option value="storage">Storage Space</option>
                  </select>
                </div>
                <fieldset className="p-3 rounded bg-pb-darker/40 border border-pb-primary/20">
                  <legend className="px-2 text-pb-primary font-semibold">Postal Address</legend>
                  {(Object.keys(defaultAddress) as Array<keyof Address>).filter(k => k !== 'id' && k !== 'nickname' && k !== 'name' && k !== 'companyName' && k !== 'type').map(key => (
                    <div key={key} className="mb-2">
                      <label className="block text-xs font-medium text-pb-gray mb-1">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</label>
                      <input type="text" value={newAddress[key] || ''} onChange={e => setNewAddress(v => ({ ...v, [key]: e.target.value }))} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" required />
                    </div>
                  ))}
                </fieldset>
                <button type="submit" disabled={saving} className="w-full py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold text-lg shadow transition disabled:opacity-60 disabled:cursor-not-allowed mt-2">{saving ? 'Saving...' : 'Add'}</button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EntitySelect; 