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
  
  // Debug modal state changes
  useEffect(() => {
    console.log('EntitySelect: showAddModal state changed to:', showAddModal);
  }, [showAddModal]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [newAddress, setNewAddress] = useState<Address>({ ...defaultAddress, type });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out empty strings and invalid IDs from selectedIds
  const cleanSelectedIds = selectedIds.filter(id => id && id.trim() !== '' && typeof id === 'string');
  
  console.log('EntitySelect: Selection state', {
    rawSelectedIds: selectedIds,
    cleanSelectedIds,
    selectedIdsType: typeof selectedIds,
    selectedIdsLength: selectedIds?.length,
    cleanSelectedIdsLength: cleanSelectedIds.length
  });

  useEffect(() => {
    console.log('EntitySelect: Loading addresses for type:', type);
    console.log('EntitySelect: Firebase service available:', !!firebaseService);
    setLoading(true);
    
    // Load addresses with proper type filtering
    firebaseService.getDocuments('addresses', { where: [['type', '==', type]] })
        .then((docs: any[]) => {
          console.log('EntitySelect: Loaded addresses from database:', {
            type,
            count: docs.length,
            docs: docs.map(doc => ({ 
              id: doc.id, 
              name: doc.data?.name, 
              type: doc.data?.type,
              idLength: doc.id?.length,
              idType: typeof doc.id,
              hasId: !!doc.id
            }))
          });
          
          // Filter out any docs with invalid IDs
          const validDocs = docs.filter(doc => doc.id && doc.id.trim() !== '');
          console.log('EntitySelect: Valid docs after filtering:', validDocs.length);
          
          setAddresses(validDocs.map(doc => ({ id: doc.id, ...doc.data })));
          setLoading(false);
        })
      .catch((error) => {
        console.error('EntitySelect: Error loading addresses:', error);
        console.error('EntitySelect: Error details:', error.message, error.code);
        setLoading(false);
      });
  }, [type, firebaseService]);

  const handleSelect = (id: string) => {
    console.log('EntitySelect: handleSelect called', { 
      id, 
      selectedIds, 
      cleanSelectedIds,
      selectedIdsLength: selectedIds.length,
      cleanSelectedIdsLength: cleanSelectedIds.length,
      selectedIdsString: JSON.stringify(selectedIds),
      cleanSelectedIdsString: JSON.stringify(cleanSelectedIds),
      allowMultiple,
      addressesCount: addresses.length,
      allAddressIds: addresses.map(a => a.id),
      currentAddress: addresses.find(a => a.id === id)
    });
    
    // Validate the ID
    if (!id || id.trim() === '') {
      console.error('EntitySelect: Invalid ID provided to handleSelect', { id });
      return;
    }
    
    if (allowMultiple) {
      if (cleanSelectedIds.includes(id)) {
        const newIds = cleanSelectedIds.filter(i => i !== id);
        console.log('EntitySelect: Removing venue (multiple mode)', { 
          id, 
          oldIds: cleanSelectedIds, 
          newIds,
          newIdsLength: newIds.length 
        });
        onChange(newIds);
      } else {
        const newIds = [...cleanSelectedIds, id];
        console.log('EntitySelect: Adding venue (multiple mode)', { 
          id, 
          oldIds: cleanSelectedIds, 
          newIds,
          newIdsLength: newIds.length 
        });
        onChange(newIds);
      }
    } else {
      // Single selection mode - allow deselection
      if (cleanSelectedIds.includes(id)) {
        console.log('EntitySelect: Deselecting single venue', { 
          id, 
          oldIds: cleanSelectedIds,
          newIds: []
        });
        onChange([]);
      } else {
        console.log('EntitySelect: Setting single venue', { 
          id, 
          oldIds: cleanSelectedIds,
          newIds: [id]
        });
        onChange([id]);
      }
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

  const handleEditAddress = (address: Address) => {
    console.log('EntitySelect: handleEditAddress called', {
      address,
      addressId: address.id,
      addressIdType: typeof address.id,
      addressIdLength: address.id?.length,
      hasValidId: !!(address.id && address.id.trim() !== '')
    });
    
    if (!address.id || address.id.trim() === '') {
      console.error('EntitySelect: Cannot edit address with invalid ID', { address });
      setError('Cannot edit address: Invalid address ID');
      return;
    }
    
    setEditingAddress(address);
    setShowEditModal(true);
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editingAddress) return;
    
    console.log('EntitySelect: Updating address', {
      editingAddress,
      id: editingAddress.id,
      idType: typeof editingAddress.id,
      idLength: editingAddress.id?.length
    });
    
    // Validate document ID
    if (!editingAddress.id || editingAddress.id.trim() === '') {
      setError('Invalid address ID. Cannot update address.');
      setSaving(false);
      return;
    }
    
    // Validate required fields
    if (!editingAddress.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!editingAddress.street1?.trim()) {
      setError('Street address is required');
      return;
    }
    if (!editingAddress.city?.trim()) {
      setError('City is required');
      return;
    }
    if (!editingAddress.region?.trim()) {
      setError('Region/State is required');
      return;
    }
    if (!editingAddress.postalCode?.trim()) {
      setError('Postal code is required');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      await firebaseService.updateDocument('addresses', editingAddress.id, {
        ...editingAddress,
        name: editingAddress.name.trim(),
        street1: editingAddress.street1.trim(),
        city: editingAddress.city.trim(),
        region: editingAddress.region.trim(),
        postalCode: editingAddress.postalCode.trim(),
        street2: editingAddress.street2?.trim() || '',
        companyName: editingAddress.companyName?.trim() || '',
        nickname: editingAddress.nickname?.trim() || '',
      });
      
      setShowEditModal(false);
      setEditingAddress(null);
      setSaving(false);
      
      // Refresh the addresses list
      setLoading(true);
      firebaseService.getDocuments('addresses', { where: [['type', '==', type]] })
        .then((docs: any[]) => {
          setAddresses(docs.map(doc => ({ id: doc.id, ...doc.data })));
          setLoading(false);
        })
        .catch((err) => {
          console.error('EntitySelect: Error refreshing addresses after edit', err);
          setLoading(false);
        });
    } catch (err: any) {
      console.error('EntitySelect: Error updating address', err);
      setError(err.message || 'Failed to update address. Please try again.');
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingAddress(null);
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
          try {
            // Cache form state before opening modal
            if (onBeforeAddNew) {
              console.log('EntitySelect: Calling onBeforeAddNew callback');
              onBeforeAddNew();
            }
            console.log('EntitySelect: Setting showAddModal to true');
            setShowAddModal(true);
            console.log('EntitySelect: Modal should now be open');
          } catch (error) {
            console.error('EntitySelect: Error in Add New button click:', error);
          }
        }} className="flex items-center gap-1 text-pb-primary hover:text-pb-accent px-3 py-2 rounded bg-pb-primary/10">
          <Plus className="w-4 h-4" /> Add New
        </button>
        {cleanSelectedIds.length > 0 && (
          <button type="button" onClick={() => {
            console.log('EntitySelect: Clear all selected');
            onChange([]);
          }} className="flex items-center gap-1 text-red-400 hover:text-red-300 px-3 py-2 rounded bg-red-500/10">
            <X className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {loading ? (
          <div className="text-pb-primary">Loading...</div>
        ) : filteredAddresses.length === 0 ? (
          <div className="text-pb-gray">No {label.toLowerCase()} found.</div>
        ) : (
          <>
            <div className="text-xs text-pb-gray mb-2">
              Click anywhere on a {label.toLowerCase()} to select it:
            </div>
            <div className="text-xs text-pb-accent mb-2 p-2 bg-pb-darker rounded">
              Debug: {addresses.length} addresses loaded, {cleanSelectedIds.length} selected, allowMultiple={String(allowMultiple)}
              <br />Selected IDs: {JSON.stringify(cleanSelectedIds)}
              <br />All IDs: {JSON.stringify(addresses.map(a => a.id))}
            </div>
            {filteredAddresses.filter(address => address.id && address.id.trim() !== '').map(address => (
          <div 
            key={address.id} 
            className={`flex items-center gap-3 p-3 rounded transition cursor-pointer ${cleanSelectedIds.includes(address.id) ? 'bg-pb-primary/20 text-pb-primary' : 'hover:bg-pb-primary/10'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('EntitySelect: Venue row clicked', { 
                addressId: address.id, 
                addressName: address.name,
                addressIdType: typeof address.id,
                addressIdLength: address.id?.length,
                hasValidId: !!(address.id && address.id.trim() !== ''),
                currentSelectedIds: cleanSelectedIds,
                allowMultiple
              });
              handleSelect(address.id);
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={cleanSelectedIds.includes(address.id)}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('EntitySelect: Checkbox clicked', { 
                    addressId: address.id, 
                    addressName: address.name, 
                    checked: e.target.checked,
                    addressIdType: typeof address.id,
                    addressIdLength: address.id?.length,
                    hasValidId: !!(address.id && address.id.trim() !== ''),
                    currentSelectedIds: cleanSelectedIds,
                    allowMultiple
                  });
                  handleSelect(address.id);
                }}
                className="w-4 h-4 text-pb-primary bg-pb-darker border-pb-primary/30 rounded focus:ring-pb-primary focus:ring-2 accent-pb-primary"
                aria-label={`Select ${address.name}`}
              />
              <div className="flex-1">
                <div className="font-medium">{address.name}</div>
                <div className="text-xs text-pb-gray">{address.street1}, {address.city}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('EntitySelect: Edit button clicked for address', { addressId: address.id, addressName: address.name });
                handleEditAddress(address);
              }}
              className="text-pb-gray hover:text-pb-primary text-sm px-3 py-1 rounded hover:bg-pb-primary/10 transition-colors"
              title="Edit address"
              disabled={!address.id || address.id.trim() === ''}
            >
              Edit
            </button>
          </div>
            ))}
          </>
        )}
      </div>
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 40 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            style={{ zIndex: 9999 }}
          >
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
        {showEditModal && editingAddress && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-pb-darker rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button className="absolute top-3 right-3 text-pb-gray hover:text-pb-primary" onClick={handleCancelEdit}><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold mb-4 text-white">Edit {label}</h2>
              {error && <div id="address-error" className="text-red-500 mb-2" role="alert" aria-live="polite">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-address-name" className="block text-pb-gray mb-1 font-medium">Name *</label>
                  <input 
                    id="edit-address-name"
                    type="text" 
                    value={editingAddress.name} 
                    onChange={e => setEditingAddress(v => v ? ({ ...v, name: e.target.value }) : null)} 
                    required 
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" 
                    aria-describedby={error ? "address-error" : undefined}
                  />
                </div>
                <div>
                  <label htmlFor="edit-address-type" className="block text-pb-gray mb-1 font-medium">Type *</label>
                  <select 
                    id="edit-address-type"
                    value={editingAddress.type} 
                    onChange={e => setEditingAddress(v => v ? ({ ...v, type: e.target.value as Address['type'] }) : null)} 
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
                    const fieldId = `edit-address-${key}`;
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
                          value={editingAddress[key] || ''} 
                          onChange={e => setEditingAddress(v => v ? ({ ...v, [key]: e.target.value }) : null)} 
                          className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" 
                          required={isRequired}
                          aria-describedby={error ? "address-error" : undefined}
                        />
                      </div>
                    );
                  })}
                </fieldset>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={handleCancelEdit} disabled={saving} className="flex-1 py-2 rounded-lg bg-pb-darker hover:bg-pb-darker/80 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed">
                    Cancel
                  </button>
                  <button type="button" onClick={handleUpdateAddress} disabled={saving} className="flex-1 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : 'Update'}
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