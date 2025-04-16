import React, { useState } from 'react';
import { PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority, StatusPriority } from '../../types/lifecycle';
import { WysiwygEditor } from '../WysiwygEditor';
import { AlertTriangle, Clock, RefreshCcw } from 'lucide-react';

interface PropStatusUpdateProps {
  currentStatus: PropLifecycleStatus;
  onStatusUpdate: (newStatus: PropLifecycleStatus, notes: string, notifyTeam: boolean) => Promise<void>;
  disabled?: boolean;
  showManagerEmail?: string;
  propsSupervisorEmail?: string;
}

export function PropStatusUpdate({ 
  currentStatus, 
  onStatusUpdate, 
  disabled = false,
  showManagerEmail,
  propsSupervisorEmail
}: PropStatusUpdateProps) {
  const [newStatus, setNewStatus] = useState<PropLifecycleStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyTeam, setNotifyTeam] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onStatusUpdate(newStatus, notes, notifyTeam);
      setNotes('');
      // Don't reset status as we want to show the new current status
    } catch (error) {
      console.error('Error updating prop status:', error);
      alert('Failed to update prop status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if the new status requires notification
  // We'll suggest notifications for high/critical status changes
  const shouldSuggestNotification = 
    lifecycleStatusPriority[newStatus] === 'critical' || 
    lifecycleStatusPriority[newStatus] === 'high';

  // Get status priority color
  const getStatusColor = (priority: StatusPriority): string => {
    switch (priority) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-green-500 bg-green-500/10';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Current Status
          </label>
          <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(lifecycleStatusPriority[currentStatus])}`}>
            {lifecycleStatusLabels[currentStatus]}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Update Status
        </label>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as PropLifecycleStatus)}
          className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
          disabled={disabled || isSubmitting}
        >
          {Object.entries(lifecycleStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Status Update Notes
        </label>
        <WysiwygEditor
          value={notes}
          onChange={setNotes}
          placeholder="Enter any relevant notes about this status change..."
          minHeight={100}
          disabled={disabled || isSubmitting}
        />
      </div>

      {/* Notification option - show if supervisor or manager emails are available */}
      {(showManagerEmail || propsSupervisorEmail) && (
        <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
          <label className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={notifyTeam}
              onChange={(e) => setNotifyTeam(e.target.checked)}
              className="mt-1 form-checkbox h-4 w-4 text-primary bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-primary"
            />
            <div>
              <span className="block text-[var(--text-secondary)]">
                Notify team about this status change
              </span>
              <span className="text-xs text-[var(--text-secondary)]/70">
                {shouldSuggestNotification && (
                  <span className="flex items-center gap-1 text-yellow-500 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Notification recommended for this status</span>
                  </span>
                )}
                {showManagerEmail && <span className="block mt-1">Stage Manager: {showManagerEmail}</span>}
                {propsSupervisorEmail && <span className="block mt-1">Props Supervisor: {propsSupervisorEmail}</span>}
              </span>
            </div>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || isSubmitting || (currentStatus === newStatus && !notes)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <span>Updating Status...</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            <span>Update Status</span>
          </>
        )}
      </button>
    </form>
  );
} 