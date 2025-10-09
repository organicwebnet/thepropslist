import React from 'react';

interface AddressSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
  id?: string;
  'aria-describedby'?: string;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = 'Search addresses...',
  id,
  'aria-describedby': ariaDescribedBy
}) => {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-pb-darker border border-pb-primary/30 p-3 text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary/50 focus:border-pb-primary/50 transition-colors"
        aria-describedby={ariaDescribedBy}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pb-gray hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};
