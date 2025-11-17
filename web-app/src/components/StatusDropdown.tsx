import React, { useState } from 'react';
import { PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority, StatusPriority } from '../../../src/types/lifecycle';

interface StatusDropdownProps {
  currentStatus: PropLifecycleStatus;
  onStatusChange: (newStatus: PropLifecycleStatus) => Promise<void>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  className = '',
  size = 'md'
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<PropLifecycleStatus>(currentStatus);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PropLifecycleStatus;
    if (newStatus === localStatus || disabled || isUpdating) return;

    console.log('StatusDropdown: Attempting to change status from', localStatus, 'to', newStatus);
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
      setLocalStatus(newStatus);
      console.log('StatusDropdown: Successfully updated status to', newStatus);
    } catch (error: any) {
      console.error('StatusDropdown: Failed to update status:', error);
      console.error('StatusDropdown: Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      // Revert the select value on error
      e.target.value = localStatus;
      const errorMsg = error?.message || error?.code || 'Unknown error';
      alert(`Failed to update prop status: ${errorMsg}. Please check the browser console for more details.`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Update local status when currentStatus prop changes
  React.useEffect(() => {
    setLocalStatus(currentStatus);
  }, [currentStatus]);

  const statusPriority = lifecycleStatusPriority[localStatus] || 'info';
  const statusColor = getStatusColor(statusPriority);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`relative ${className}`}>
      <select
        value={localStatus}
        onChange={handleChange}
        disabled={disabled || isUpdating}
        className={`
          appearance-none pr-8 pl-3 rounded-lg border-2 font-medium
          ${sizeClasses[size]}
          ${statusColor}
          bg-pb-darker/80 text-white
          focus:outline-none focus:ring-2 focus:ring-pb-primary focus:border-pb-primary
          hover:bg-pb-darker/90 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {Object.entries(lifecycleStatusLabels).map(([value, label]) => (
          <option key={value} value={value} className="bg-pb-darker text-white">
            {label}
          </option>
        ))}
      </select>
      <svg 
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/80 w-4 h-4" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      {isUpdating && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

function getStatusColor(priority: StatusPriority): string {
  const colorMap: Record<StatusPriority, string> = {
    critical: 'border-red-500 bg-red-900/30',
    high: 'border-orange-500 bg-orange-900/30',
    medium: 'border-yellow-500 bg-yellow-900/30',
    low: 'border-blue-500 bg-blue-900/30',
    active: 'border-cyan-500 bg-cyan-900/30',
    info: 'border-pb-primary bg-pb-primary/20',
  };
  return colorMap[priority] || colorMap.info;
}

