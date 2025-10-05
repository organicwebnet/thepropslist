import React, { useState } from 'react';

interface LocationPickerModalProps {
  visible: boolean;
  currentLocation?: string;
  onSave: (location: string) => void;
  onCancel: () => void;
  predefinedLocations?: string[];
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  currentLocation = '',
  onSave,
  onCancel,
  predefinedLocations = [
    'Storage Room A',
    'Storage Room B',
    'Backstage Left',
    'Backstage Right',
    'Green Room',
    'Dressing Room 1',
    'Dressing Room 2',
    'On Stage',
    'In Transit',
    'Under Maintenance',
    'Missing',
  ],
}) => {
  const [customLocation, setCustomLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);

  const handleSave = () => {
    const location = customLocation.trim() || selectedLocation;
    if (!location) {
      alert('Please select or enter a location.');
      return;
    }
    onSave(location);
    setCustomLocation('');
    setSelectedLocation('');
  };

  const handleCancel = () => {
    setCustomLocation('');
    setSelectedLocation('');
    onCancel();
  };

  const handlePredefinedSelect = (location: string) => {
    setSelectedLocation(location);
    setCustomLocation('');
  };

  const handleCustomInput = (text: string) => {
    setCustomLocation(text);
    setSelectedLocation('');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Update Location
          </h3>
          
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-600 mb-1">Current Location:</div>
            <div className="text-blue-600 font-medium">
              {currentLocation || 'Not set'}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-600 mb-2">Select from common locations:</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {predefinedLocations.map((location) => (
                <button
                  key={location}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedLocation === location
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handlePredefinedSelect(location)}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-600 mb-2">Or enter custom location:</div>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter custom location..."
              value={customLocation}
              onChange={(e) => handleCustomInput(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            
            <button
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              onClick={handleSave}
            >
              Update Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
