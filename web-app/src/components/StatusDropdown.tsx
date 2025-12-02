import React, { useState, useRef } from 'react';
import { PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority, StatusPriority } from '../../../src/types/lifecycle';
import { X } from 'lucide-react';

interface StatusDropdownProps {
  currentStatus: PropLifecycleStatus;
  onStatusChange: (newStatus: PropLifecycleStatus, notes?: string) => Promise<void>;
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PropLifecycleStatus | null>(null);
  const [detailsNotes, setDetailsNotes] = useState('');
  const [repairDetails, setRepairDetails] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PropLifecycleStatus;
    if (newStatus === localStatus || disabled || isUpdating) {
      // Revert if same status or disabled
      if (selectRef.current) {
        selectRef.current.value = localStatus;
      }
      return;
    }

    // Store the select element for later updates
    if (!selectRef.current) {
      selectRef.current = e.target;
    }

    // Statuses that require details
    const statusesRequiringDetails: PropLifecycleStatus[] = [
      'damaged_awaiting_repair',
      'damaged_awaiting_replacement',
      'out_for_repair',
      'under_maintenance',
      'needs_modifying'
    ];

    // Special handling for specific statuses
    if (newStatus === 'missing') {
      // Missing status has special handling elsewhere, proceed directly
      await proceedWithStatusChange(newStatus);
      return;
    }

    if (newStatus === 'cut') {
      const container = prompt('Please enter the storage container location for this cut prop:');
      if (!container || !container.trim()) {
        // Revert select on cancel
        if (selectRef.current) {
          selectRef.current.value = localStatus;
        }
        return;
      }
      await proceedWithStatusChange(newStatus, `Storage container: ${container.trim()}`);
      return;
    }

    if (newStatus === 'on_order') {
      const date = prompt('Please enter the expected delivery date (YYYY-MM-DD):');
      if (!date || !date.trim()) {
        // Revert select on cancel
        if (selectRef.current) {
          selectRef.current.value = localStatus;
        }
        return;
      }
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date.trim())) {
        alert('Please enter date in YYYY-MM-DD format.');
        // Revert select on invalid date
        if (selectRef.current) {
          selectRef.current.value = localStatus;
        }
        return;
      }
      await proceedWithStatusChange(newStatus, `Expected delivery date: ${date.trim()}`);
      return;
    }

    // For statuses requiring details, show modal
    if (statusesRequiringDetails.includes(newStatus)) {
      setPendingStatus(newStatus);
      setShowDetailsModal(true);
      // Don't revert here - we'll handle it in the modal
      return;
    }

    // For other statuses, proceed directly
    await proceedWithStatusChange(newStatus);
  };

  const proceedWithStatusChange = async (newStatus: PropLifecycleStatus, notes?: string) => {
    console.log('StatusDropdown: Attempting to change status from', localStatus, 'to', newStatus);
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus, notes);
      setLocalStatus(newStatus);
      console.log('StatusDropdown: Successfully updated status to', newStatus);
    } catch (error: any) {
      console.error('StatusDropdown: Failed to update status:', error);
      console.error('StatusDropdown: Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      const errorMsg = error?.message || error?.code || 'Unknown error';
      alert(`Failed to update prop status: ${errorMsg}. Please check the browser console for more details.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDetails = async () => {
    if (!pendingStatus) return;

    // Combine notes and repair details
    let combinedNotes = detailsNotes.trim();
    if (repairDetails.trim()) {
      if (combinedNotes) {
        combinedNotes += '\n\n--- Repair/Maintenance Details ---\n';
      } else {
        combinedNotes = '--- Repair/Maintenance Details ---\n';
      }
      combinedNotes += repairDetails.trim();
    }

    // Warn if no details provided for repair-related statuses
    if (!combinedNotes.trim() && 
        (pendingStatus === 'damaged_awaiting_repair' || 
         pendingStatus === 'out_for_repair' || 
         pendingStatus === 'under_maintenance')) {
      const proceed = confirm(
        'No repair details provided. The props supervisor will need to determine what needs fixing. Continue anyway?'
      );
      if (!proceed) {
        // Revert select on cancel
        if (selectRef.current) {
          selectRef.current.value = localStatus;
        }
        setShowDetailsModal(false);
        setDetailsNotes('');
        setRepairDetails('');
        setPendingStatus(null);
        return;
      }
    }

    await proceedWithStatusChange(pendingStatus, combinedNotes || '');
    setShowDetailsModal(false);
    setDetailsNotes('');
    setRepairDetails('');
    setPendingStatus(null);
  };

  const handleCancelDetails = () => {
    // Revert select on cancel
    if (selectRef.current) {
      selectRef.current.value = localStatus;
    }
    setShowDetailsModal(false);
    setDetailsNotes('');
    setRepairDetails('');
    setPendingStatus(null);
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
        ref={selectRef}
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

      {/* Details Modal */}
      {showDetailsModal && pendingStatus && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-details-title"
              onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelDetails();
            }
          }}
        >
          <div className="bg-pb-darker rounded-2xl border border-pb-primary/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-pb-primary/20">
              <h2 id="status-details-title" className="text-xl font-bold text-white">
                {lifecycleStatusLabels[pendingStatus]} - Details Required
              </h2>
              <button
                onClick={handleCancelDetails}
                className="p-2 hover:bg-pb-primary/20 rounded-lg transition-colors"
                aria-label="Close modal"
                type="button"
              >
                <X className="w-5 h-5 text-pb-gray" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-pb-gray text-sm">
                Please provide details about this status change. This information helps track the prop's condition and history.
              </p>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={detailsNotes}
                  onChange={(e) => setDetailsNotes(e.target.value)}
                  placeholder="Enter any notes about this status change..."
                  className="w-full bg-pb-darker/50 border border-pb-primary/20 rounded-lg px-4 py-3 text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary min-h-[80px]"
                  rows={4}
                />
              </div>

              {(pendingStatus === 'damaged_awaiting_repair' || 
                pendingStatus === 'out_for_repair' || 
                pendingStatus === 'under_maintenance' ||
                pendingStatus === 'needs_modifying') && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Repair/Maintenance Details (recommended)
                  </label>
                  <textarea
                    value={repairDetails}
                    onChange={(e) => setRepairDetails(e.target.value)}
                    placeholder="Describe what needs to be repaired or maintained..."
                    className="w-full bg-pb-darker/50 border border-pb-primary/20 rounded-lg px-4 py-3 text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary min-h-[100px]"
                    rows={5}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-pb-primary/20">
                <button
                  onClick={handleCancelDetails}
                  className="px-4 py-2 bg-pb-darker/50 hover:bg-pb-darker text-white rounded-lg transition-colors"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDetails}
                  className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
                  type="button"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
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

