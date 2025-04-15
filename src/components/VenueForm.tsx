import React from 'react';
import { PlusCircle, X } from 'lucide-react';
import type { Venue } from '../types';

interface VenueFormProps {
  venues: Venue[];
  onChange: (venues: Venue[]) => void;
}

export function VenueForm({ venues, onChange }: VenueFormProps) {
  const addVenue = () => {
    onChange([...venues, { name: '', address: '', startDate: '', endDate: '', notes: '' }]);
  };

  const removeVenue = (index: number) => {
    onChange(venues.filter((_, i) => i !== index));
  };

  const updateVenue = (index: number, field: keyof Venue, value: string) => {
    const updatedVenues = venues.map((venue, i) => {
      if (i === index) {
        return { ...venue, [field]: value };
      }
      return venue;
    });
    onChange(updatedVenues);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">Venues</label>
        <button
          type="button"
          onClick={addVenue}
          className="inline-flex items-center text-sm text-primary hover:text-primary/80"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Venue
        </button>
      </div>

      {venues.map((venue, index) => (
        <div key={index} className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium text-gray-300">Venue {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeVenue(index)}
              className="text-gray-400 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={venue.address}
                onChange={(e) => updateVenue(index, 'address', e.target.value)}
                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter venue address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={venue.startDate}
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
                  value={venue.endDate}
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