import React from 'react';
import { Address } from '../hooks/useAddresses';

interface AddressItemProps {
  address: Address;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  allowMultiple?: boolean;
  inputName?: string;
}

export const AddressItem: React.FC<AddressItemProps> = ({
  address,
  isSelected,
  onSelect,
  onEdit,
  allowMultiple = true,
  inputName = 'address-selection'
}) => {
  const inputId = `address-${allowMultiple ? 'checkbox' : 'radio'}-${address.id}`;
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
        isSelected 
          ? 'bg-pb-primary/20 text-pb-primary border border-pb-primary/30 shadow-sm' 
          : 'hover:bg-pb-primary/10 border border-transparent hover:border-pb-primary/20'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <input
          type={allowMultiple ? "checkbox" : "radio"}
          id={inputId}
          name={inputName}
          value={address.id}
          checked={isSelected}
          onChange={onSelect}
          className={`w-4 h-4 text-pb-primary bg-pb-darker border-pb-primary/30 focus:ring-pb-primary focus:ring-2 ${
            allowMultiple 
              ? 'rounded accent-pb-primary' 
              : 'rounded-full border-pb-primary/30'
          }`}
        />
        <label 
          htmlFor={inputId}
          className="flex-1 min-w-0 cursor-pointer"
        >
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
          {address.nickname && (
            <div className="text-xs text-pb-primary/70 truncate">
              "{address.nickname}"
            </div>
          )}
        </label>
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
