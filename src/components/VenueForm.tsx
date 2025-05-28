import React, { useState, useEffect } from 'react';
import { PlusCircle, X } from 'lucide-react';
import type { Venue } from '../types/index.ts';
import type { Address } from '../shared/types/address.ts';
import type { CustomTimestamp } from '../shared/services/firebase/types.ts';

const defaultAddress: Address = {
  id: '',
  name: '',
  street1: '',
  street2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'United Kingdom',
  nickname: '',
};

interface VenueFormProps {
  venues: Venue[];
  onChange: (venues: Venue[]) => void;
  isTouringShow: boolean;
}

// Helper function to format date for input[type="date"]
const formatDateForInput = (dateValue: string | CustomTimestamp | null | undefined): string => {
  if (!dateValue) {
    return '';
  }
  if (typeof dateValue === 'string') {
    // Assuming if it's a string, it might already be in YYYY-MM-DD or a full ISO string
    // Input type="date" can sometimes handle ISO strings, but YYYY-MM-DD is safest.
    if (dateValue.includes('T')) { // Likely an ISO string
      return dateValue.split('T')[0];
    }
    return dateValue; // Assume it's YYYY-MM-DD or compatible
  }
  // Check if it's a Firebase Timestamp (has toDate method)
  if (dateValue && typeof (dateValue as CustomTimestamp).toDate === 'function') {
    const date = (dateValue as CustomTimestamp).toDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return ''; // Fallback for unexpected types
};

export function VenueForm({ venues = [], onChange, isTouringShow }: VenueFormProps) {
  const addVenue = () => {
    if (isTouringShow || venues.length === 0) {
      const newVenue: Venue = {
        name: '',
        address: { ...defaultAddress },
        startDate: '',
        endDate: '',
        notes: ''
      };
      onChange([...venues, newVenue]);
    }
  };

  const removeVenue = (index: number) => {
    if (isTouringShow || venues.length > 1) {
      onChange(venues.filter((_, i) => i !== index));
    }
  };

  const updateVenue = (
    index: number, 
    field: keyof Venue | `address.${keyof Address}`, 
    value: string
  ) => {
    const updatedVenues = venues.map((venue, i) => {
      if (i === index) {
        const currentVenue = { ...venue, address: venue.address || { ...defaultAddress } };
        if (field.startsWith('address.')) {
          const addressField = field.split('.')[1] as keyof Address;
          return { 
            ...currentVenue,
            address: { 
              ...currentVenue.address,
              [addressField]: value 
            } 
          };
        } else {
          return { ...currentVenue, [field as keyof Venue]: value };
        }
      }
      return venue;
    });
    onChange(updatedVenues);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">{isTouringShow ? 'Venues' : 'Venue'}</label>
        {(isTouringShow || venues.length === 0) && (
          <button
            type="button"
            onClick={addVenue}
            className="inline-flex items-center text-sm text-primary hover:text-primary/80"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Venue
          </button>
        )}
      </div>

      {(isTouringShow || venues.length > 0 ? venues : []).map((venue, index) => (
        <div key={index} className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium text-gray-300">Venue {index + 1}</h4>
            {(isTouringShow || venues.length > 1) && (
              <button
                type="button"
                onClick={() => removeVenue(index)}
                className="text-gray-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Venue Name
              </label>
              <input
                type="text"
                value={venue.name}
                onChange={(e) => updateVenue(index, 'name', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter venue name"
              />
            </div>

            <div className="p-3 border border-gray-700 rounded-md space-y-3">
              <h5 className="text-xs font-medium text-gray-400">Address</h5>
              {(Object.keys(defaultAddress) as Array<keyof Address>)
                .filter(key => key !== 'id' && key !== 'nickname')
                .map((addressKey) => {
                  const currentAddress = venue.address || defaultAddress;
                  return (
                    <div key={addressKey}>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        {addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input
                        type="text"
                        value={currentAddress[addressKey] || ''}
                        onChange={(e) => updateVenue(index, `address.${addressKey}`, e.target.value)}
                        className="w-full bg-[#1F1F1F] border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                        placeholder={addressKey.charAt(0).toUpperCase() + addressKey.slice(1).replace(/([A-Z])/g, ' $1')}
                      />
                    </div>
                  );
                })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formatDateForInput(venue.startDate)}
                  onChange={(e) => updateVenue(index, 'startDate', e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formatDateForInput(venue.endDate)}
                  onChange={(e) => updateVenue(index, 'endDate', e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={venue.notes}
                onChange={(e) => updateVenue(index, 'notes', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                placeholder="Enter any additional notes about the venue"
              />
            </div>
          </div>
        </div>
      ))}

      {venues.length === 0 && (
        <div className="text-center py-8 border border-dashed border-gray-800 rounded-lg">
          <p className="text-gray-400">No venues added yet. Click "Add Venue" to get started.</p>
        </div>
      )}
    </div>
  );
}