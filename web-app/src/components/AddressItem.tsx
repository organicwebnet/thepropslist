import React from 'react';
import { Address } from '../hooks/useAddresses';

interface AddressItemProps {
  address: Address;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

export const AddressItem: React.FC<AddressItemProps> = ({
  address,
  isSelected,
  onSelect,
  onEdit
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
        isSelected 
          ? 'bg-pb-primary/20 text-pb-primary border border-pb-primary/30' 
          : 'hover:bg-pb-primary/10 border border-transparent'
      }`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      aria-label={`${address.name} - ${address.street1}, ${address.city}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-pb-primary bg-pb-darker border-pb-primary/30 rounded focus:ring-pb-primary focus:ring-2 accent-pb-primary"
          aria-label={`Select ${address.name}`}
          tabIndex={-1} // Prevent double tabbing
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {address.name}
          </div>
          <div className="text-xs text-pb-gray truncate">
            {address.street1}, {address.city}
          </div>
          {address.companyName && (
            <div className="text-xs text-pb-gray/70 truncate">
              {address.companyName}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
        className="text-pb-gray hover:text-pb-primary text-sm px-3 py-1 rounded hover:bg-pb-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
        title="Edit address"
        aria-label={`Edit ${address.name}`}
      >
        Edit
      </button>
    </div>
  );
};
