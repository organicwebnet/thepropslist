import React, { useState } from 'react';

interface QuickActionModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  maxLength?: number;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  visible,
  title,
  placeholder = 'Enter text...',
  initialValue = '',
  onSave,
  onCancel,
  multiline = false,
  maxLength = 500,
}) => {
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    if (value.trim().length === 0) {
      alert('Please enter some text before saving.');
      return;
    }
    onSave(value.trim());
    setValue('');
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            {title}
          </h3>
          
          {multiline ? (
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-base mb-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              maxLength={maxLength}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-base mb-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={maxLength}
              autoFocus
            />
          )}
          
          <div className="text-right text-sm text-gray-500 mb-4">
            {value.length}/{maxLength} characters
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
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
