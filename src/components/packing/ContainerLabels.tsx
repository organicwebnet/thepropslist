import React, { useState } from 'react';
import { PackingContainer } from '../../shared/services/inventory/packListService';

interface ContainerLabelsProps {
  container: PackingContainer;
  onUpdateLabels: (labels: string[]) => void;
}

export const ContainerLabels: React.FC<ContainerLabelsProps> = ({
  container,
  onUpdateLabels
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddLabel = () => {
    if (!newLabel.trim()) {
      setError('Label cannot be empty');
      return;
    }

    if (container.labels.includes(newLabel.trim())) {
      setError('Label already exists');
      return;
    }

    const updatedLabels = [...container.labels, newLabel.trim()];
    onUpdateLabels(updatedLabels);
    setNewLabel('');
    setError(null);
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const updatedLabels = container.labels.filter(label => label !== labelToRemove);
    onUpdateLabels(updatedLabels);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddLabel();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a label..."
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAddLabel}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {container.labels.map((label) => (
          <div
            key={label}
            className="flex items-center bg-gray-100 px-3 py-1 rounded"
          >
            <span className="mr-2">{label}</span>
            <button
              onClick={() => handleRemoveLabel(label)}
              className="text-gray-500 hover:text-red-500 focus:outline-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 