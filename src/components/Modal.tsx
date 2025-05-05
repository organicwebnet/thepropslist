import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg' // Default size
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full w-full h-full'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-gray-800 rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 ease-in-out w-full ${sizeClasses[size]} text-gray-100`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 id="modal-title" className="text-xl font-semibold text-secondary">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors duration-150 focus:outline-none"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {children}
        </div>

        {/* Optional Footer could go here */}
        {/* <div className="px-6 py-3 bg-gray-700 text-right">*/}
        {/*   Footer Buttons */}
        {/* </div>*/}
      </div>
    </div>
  );
}; 