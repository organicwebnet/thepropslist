import React, { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'default'
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 md:mx-auto overflow-hidden">
        <div className="p-4 md:p-6 max-h-[90vh] overflow-y-auto">
          <h3 className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${isDanger ? 'text-red-600' : 'text-gray-900'} break-words`}>
            {title}
          </h3>
          
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 break-words">
            {message}
          </p>
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 md:py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center"
            >
              {cancelText}
            </button>
            
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2.5 md:py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center ${
                isDanger 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
