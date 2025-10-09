import React, { useMemo } from 'react';
import { Address } from '../hooks/useAddresses';
import { AddressItem } from './AddressItem';

interface AddressListProps {
  addresses: Address[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onEdit: (address: Address) => void;
  allowMultiple: boolean;
  loading?: boolean;
  error?: string | null;
  searchTerm?: string;
}

export const AddressList: React.FC<AddressListProps> = ({
  addresses,
  selectedIds,
  onSelect,
  onEdit,
  allowMultiple,
  loading = false,
  error = null,
  searchTerm = ''
}) => {
  const filteredAddresses = useMemo(() => {
    if (!searchTerm.trim()) {
      return addresses;
    }

    const term = searchTerm.toLowerCase();
    return addresses.filter(address => 
      address.name.toLowerCase().includes(term) ||
      address.city.toLowerCase().includes(term) ||
      address.street1.toLowerCase().includes(term) ||
      (address.companyName && address.companyName.toLowerCase().includes(term))
    );
  }, [addresses, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-pb-primary">
          <div className="w-4 h-4 border-2 border-pb-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading addresses...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (filteredAddresses.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-pb-gray text-sm">
          {searchTerm ? 'No addresses found matching your search.' : 'No addresses available.'}
        </div>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-multiselectable={allowMultiple}
      className="space-y-2 max-h-64 overflow-y-auto"
    >
      {filteredAddresses.map(address => (
        <AddressItem
          key={address.id}
          address={address}
          isSelected={selectedIds.includes(address.id)}
          onSelect={() => onSelect(address.id)}
          onEdit={() => onEdit(address)}
        />
      ))}
    </div>
  );
};
