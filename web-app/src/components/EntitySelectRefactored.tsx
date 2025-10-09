import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useAddresses, Address } from '../hooks/useAddresses';
import { useAddressSelection } from '../hooks/useAddressSelection';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { AddressSelectionErrorBoundary } from './AddressSelectionErrorBoundary';
import { AddressSearch } from './AddressSearch';
import { AddressList } from './AddressList';
import { AddressModal } from './AddressModal';

interface EntitySelectProps {
  label: string;
  type: 'venue' | 'rehearsal' | 'storage';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowMultiple?: boolean;
  onBeforeAddNew?: () => void;
}

const EntitySelectRefactored: React.FC<EntitySelectProps> = ({
  label,
  type,
  selectedIds,
  onChange,
  allowMultiple = false,
  onBeforeAddNew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 300);
  const { addresses, loading, error, addAddress, updateAddress } = useAddresses(type);
  const { selectedIds: cleanSelectedIds, toggleSelection, clearSelection, hasSelection } = useAddressSelection(
    selectedIds,
    allowMultiple,
    onChange
  );

  const handleAddNew = useCallback(() => {
    if (onBeforeAddNew) {
      onBeforeAddNew();
    }
    setShowAddModal(true);
  }, [onBeforeAddNew]);

  const handleEditAddress = useCallback((address: Address) => {
    setEditingAddress(address);
    setShowEditModal(true);
  }, []);

  const handleAddAddress = useCallback(async (addressData: Omit<Address, 'id'>) => {
    await addAddress(addressData);
    setShowAddModal(false);
  }, [addAddress]);

  const handleUpdateAddress = useCallback(async (addressData: Omit<Address, 'id'>) => {
    if (editingAddress) {
      await updateAddress(editingAddress.id, addressData);
      setShowEditModal(false);
      setEditingAddress(null);
    }
  }, [editingAddress, updateAddress]);

  const handleCloseModals = useCallback(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingAddress(null);
  }, []);

  const searchId = `address-search-${type}`;
  const helpId = `${type}-help`;

  return (
    <AddressSelectionErrorBoundary>
      <div className="space-y-4" role="group" aria-labelledby={`${type}-label`}>
        <h3 id={`${type}-label`} className="text-pb-gray font-medium">
          {label}
        </h3>

        <AddressSearch
          id={searchId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder={`Search ${label.toLowerCase()}...`}
          aria-describedby={helpId}
        />

        <div id={helpId} className="text-xs text-pb-gray">
          Select {allowMultiple ? 'one or more' : 'one'} {label.toLowerCase()} by clicking on them.
          {allowMultiple && ' Use Ctrl+Click to select multiple items.'}
        </div>

        <AddressList
          addresses={addresses}
          selectedIds={cleanSelectedIds}
          onSelect={toggleSelection}
          onEdit={handleEditAddress}
          allowMultiple={allowMultiple}
          loading={loading}
          error={error?.message || null}
          searchTerm={debouncedSearchTerm}
        />

        {hasSelection && (
          <button
            type="button"
            onClick={clearSelection}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-pb-primary text-white rounded-lg hover:bg-pb-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
          >
            <Plus className="w-4 h-4" />
            Add New {label.slice(0, -1)}
          </button>
        </div>

        <AddressModal
          isOpen={showAddModal}
          onClose={handleCloseModals}
          onSubmit={handleAddAddress}
          type={type}
          title={`Add New ${label.slice(0, -1)}`}
        />

        <AddressModal
          isOpen={showEditModal}
          onClose={handleCloseModals}
          onSubmit={handleUpdateAddress}
          editingAddress={editingAddress}
          type={type}
          title={`Edit ${label.slice(0, -1)}`}
        />
      </div>
    </AddressSelectionErrorBoundary>
  );
};

export default EntitySelectRefactored;
