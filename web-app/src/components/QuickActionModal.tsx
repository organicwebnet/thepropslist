import React, { useState, useEffect } from 'react';

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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!visible) return;
      
      if (event.key === 'Escape') {
        handleCancel();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, value]);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 md:p-6 max-h-[90vh] overflow-y-auto">
          <h3 id="modal-title" className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 text-center break-words">
            {title}
          </h3>
          
          {multiline ? (
            <textarea
              id="modal-description"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm md:text-base mb-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[120px] md:min-h-[100px]"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              maxLength={maxLength}
              autoFocus
              aria-label={`${title} input field`}
              aria-describedby="char-count"
            />
          ) : (
            <input
              id="modal-description"
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm md:text-base mb-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] md:min-h-0"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={maxLength}
              autoFocus
              aria-label={`${title} input field`}
              aria-describedby="char-count"
            />
          )}
          
          <div id="char-count" className="text-right text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            {value.length}/{maxLength} characters
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <button
              className="flex-1 px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center"
              onClick={handleCancel}
              aria-label="Cancel"
            >
              Cancel
            </button>
            
            <button
              className="flex-1 px-4 py-2.5 md:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center"
              onClick={handleSave}
              aria-label="Save"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
