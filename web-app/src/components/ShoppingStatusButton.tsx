import React from 'react';

export type ShoppingOptionStatus = 'pending' | 'maybe' | 'rejected' | 'buy';

interface ShoppingStatusButtonProps {
  status: ShoppingOptionStatus;
  currentStatus: ShoppingOptionStatus | undefined;
  updatingStatus: ShoppingOptionStatus | null;
  onClick: () => void | Promise<void>;
  label: string;
  icon: string;
  className?: string;
}

/**
 * Reusable status button component for shopping list options
 * Provides consistent styling, accessibility, and loading states
 */
export const ShoppingStatusButton: React.FC<ShoppingStatusButtonProps> = ({
  status,
  currentStatus,
  updatingStatus,
  onClick,
  label,
  icon,
  className = '',
}) => {
  const isActive = currentStatus === status;
  const isUpdating = updatingStatus === status;
  const isDisabled = updatingStatus !== null;

  // Get status-specific styling
  const getStatusStyles = () => {
    if (isUpdating) {
      switch (status) {
        case 'rejected':
          return 'bg-red-400 text-white cursor-not-allowed opacity-75';
        case 'maybe':
          return 'bg-yellow-400 text-white cursor-not-allowed opacity-75';
        case 'buy':
          return 'bg-green-400 text-white cursor-not-allowed opacity-75';
        case 'pending':
          return 'bg-gray-400 text-white cursor-not-allowed opacity-75';
        default:
          return 'bg-gray-400 text-white cursor-not-allowed opacity-75';
      }
    }

    if (isActive) {
      switch (status) {
        case 'rejected':
          return 'bg-red-600 text-white ring-2 ring-red-400';
        case 'maybe':
          return 'bg-yellow-600 text-white ring-2 ring-yellow-400';
        case 'buy':
          return 'bg-green-600 text-white ring-2 ring-green-400';
        case 'pending':
          return 'bg-gray-600 text-white ring-2 ring-gray-400';
        default:
          return 'bg-gray-600 text-white ring-2 ring-gray-400';
      }
    }

    // Default hover state
    switch (status) {
      case 'rejected':
        return 'bg-red-500 text-white hover:bg-red-600 hover:scale-105';
      case 'maybe':
        return 'bg-yellow-500 text-white hover:bg-yellow-600 hover:scale-105';
      case 'buy':
        return 'bg-green-500 text-white hover:bg-green-600 hover:scale-105';
      case 'pending':
        return 'bg-gray-500 text-white hover:bg-gray-600 hover:scale-105';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600 hover:scale-105';
    }
  };

  return (
    <button
      type="button"
      role="button"
      aria-label={`Mark option as ${status}${isActive ? ' (currently selected)' : ''}`}
      aria-pressed={isActive}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
      disabled={isDisabled}
      className={`
        px-3 py-1 rounded-lg font-semibold shadow 
        transition-all duration-200 text-sm
        focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-pb-primary focus:ring-offset-pb-darker
        ${getStatusStyles()}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isDisabled) {
            onClick();
          }
        }
      }}
    >
      {icon} {label}
    </button>
  );
};

