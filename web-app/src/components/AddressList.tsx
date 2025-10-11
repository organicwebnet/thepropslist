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
    
    // Always include selected addresses, even if they don't match the search
    const selectedAddresses = addresses.filter(address => selectedIds.includes(address.id));
    
    // Filter addresses that match the search term
    const matchingAddresses = addresses.filter(address => 
      address.name.toLowerCase().includes(term) ||
      address.city.toLowerCase().includes(term) ||
      address.street1.toLowerCase().includes(term) ||
      (address.companyName && address.companyName.toLowerCase().includes(term))
    );
    
    // Combine selected addresses with matching addresses, removing duplicates
    const combined = [...selectedAddresses];
    matchingAddresses.forEach(address => {
      if (!selectedIds.includes(address.id)) {
        combined.push(address);
      }
    });
    
    return combined;
  }, [addresses, searchTerm, selectedIds]);

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
          {searchTerm ? (
            <div>
              <div>No addresses found matching "{searchTerm}".</div>
              <div className="text-xs text-pb-gray/70 mt-1">Try a different search term or add a new address.</div>
            </div>
          ) : (
            <div>
              <div>No addresses available.</div>
              <div className="text-xs text-pb-gray/70 mt-1">Add your first address using the "Add New" button below.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Separate selected and unselected addresses for better UX
  const selectedAddresses = filteredAddresses.filter(address => selectedIds.includes(address.id));
  const unselectedAddresses = filteredAddresses.filter(address => !selectedIds.includes(address.id));

  return (
    <fieldset className="space-y-4 max-h-64 overflow-y-auto">
      <legend className="sr-only">Select addresses</legend>
      
      {/* Selected addresses section */}
      {selectedAddresses.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-pb-primary uppercase tracking-wide">
            Selected ({selectedAddresses.length})
          </div>
          {selectedAddresses.map(address => (
            <AddressItem
              key={address.id}
              address={address}
              isSelected={true}
              onSelect={() => onSelect(address.id)}
              onEdit={() => onEdit(address)}
              allowMultiple={allowMultiple}
              inputName={`address-${allowMultiple ? 'checkbox' : 'radio'}`}
            />
          ))}
        </div>
      )}
      
      {/* Available addresses section */}
      {unselectedAddresses.length > 0 && (
        <div className="space-y-2">
          {selectedAddresses.length > 0 && (
            <div className="text-xs font-medium text-pb-gray uppercase tracking-wide">
              {searchTerm ? 'Search Results' : 'Available'}
            </div>
          )}
          {unselectedAddresses.map(address => (
            <AddressItem
              key={address.id}
              address={address}
              isSelected={false}
              onSelect={() => onSelect(address.id)}
              onEdit={() => onEdit(address)}
              allowMultiple={allowMultiple}
              inputName={`address-${allowMultiple ? 'checkbox' : 'radio'}`}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
};
