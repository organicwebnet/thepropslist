import React, { useState, useRef } from 'react';
import { 
  PropLifecycleStatus, 
  lifecycleStatusLabels, 
  lifecycleStatusPriority, 
  StatusPriority,
  PropStatusUpdate as PropStatusUpdateType
} from '../../types/lifecycle.ts';
import { WysiwygEditor } from '../WysiwygEditor.tsx';
import { AlertTriangle, Clock, RefreshCcw, Camera, Upload, X, Image } from 'lucide-react';
import { HelpTooltip } from '../HelpTooltip.tsx';
import { useFirebase } from '../../contexts/FirebaseContext.tsx';
import { UserPicker } from '../UserPicker.tsx';

interface PropStatusUpdateProps {
  currentStatus: PropLifecycleStatus;
  onStatusUpdate: (newStatus: PropLifecycleStatus, notes: string, notifyTeam: boolean, damageImages?: File[]) => Promise<void>;
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
  const { service } = useFirebase();
  const [newStatus, setNewStatus] = useState<PropLifecycleStatus | ''>(currentStatus || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyTeam, setNotifyTeam] = useState(false);
  const [damageImages, setDamageImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus || newStatus === currentStatus) return;
    // Validation: require assignment for statuses that need it
    if (showAssignment && (!assignedTo || assignedTo.length === 0)) {
      alert('Please assign at least one user for this status.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onStatusUpdate(
        newStatus,
        notes.trim() || '',
        notifyTeam,
        damageImages.length > 0 ? damageImages : undefined
      );
      setNotes('');
      setDamageImages([]);
      setImagePreviews([]);
      // Don't reset status as we want to show the new current status
      setAssignedTo([]);
    } catch (error) {
      alert('Failed to update prop status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      setDamageImages([...damageImages, ...newImages]);

      // Create image previews
      const newPreviews = newImages.map(file => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...damageImages];
    newImages.splice(index, 1);
    setDamageImages(newImages);

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]); // Clean up the URL
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  // Determine if we should show the image upload section
  const shouldShowImageUpload = 
    newStatus === 'damaged_awaiting_repair' || 
    newStatus === 'damaged_awaiting_replacement' || 
    newStatus === 'out_for_repair';

  // Determine if the new status requires notification
  // We'll suggest notifications for high/critical status changes
  const shouldSuggestNotification = 
    newStatus &&
    (lifecycleStatusPriority[newStatus] === 'critical' || 
     lifecycleStatusPriority[newStatus] === 'high');

  // Determine priority and color safely - Use simple check for existence
  const statusPriority = newStatus ? lifecycleStatusPriority[newStatus] : 'info';

  // Refactored statusColor logic
  let statusColor: string;
  const defaultColor = 'border-gray-700 bg-gray-800/50';
  if (newStatus) {
    const colorMap: Record<StatusPriority | 'info', string> = {
      critical: 'border-red-500 bg-red-900/50',
      high: 'border-orange-500 bg-orange-900/50',
      medium: 'border-yellow-500 bg-yellow-900/50',
      low: 'border-blue-500 bg-blue-900/50',
      active: 'border-cyan-500 bg-cyan-900/50',
      info: defaultColor,
    };
    statusColor = colorMap[statusPriority] || defaultColor;
  } else {
    statusColor = defaultColor;
  }

  // --- Status-driven field logic ---
  const statusFieldMap: Record<PropLifecycleStatus, { assignment?: boolean; repair?: boolean; imageUpload?: boolean; notes?: boolean }> = {
    confirmed: { notes: true },
    cut: { notes: true },
    out_for_repair: { assignment: true, repair: true, imageUpload: true, notes: true },
    damaged_awaiting_repair: { assignment: true, repair: true, imageUpload: true, notes: true },
    damaged_awaiting_replacement: { assignment: true, repair: true, imageUpload: true, notes: true },
    missing: { notes: true },
    in_transit: { notes: true },
    under_maintenance: { assignment: true, repair: true, notes: true },
    loaned_out: { notes: true },
    on_hold: { notes: true },
    under_review: { notes: true },
    being_modified: { notes: true },
    backup: { notes: true },
    temporarily_retired: { notes: true },
    ready_for_disposal: { notes: true },
    repaired_back_in_show: { notes: true },
    available_in_storage: { notes: true },
    checked_out: { notes: true },
    in_use_on_set: { notes: true },
    on_order: { notes: true },
    to_buy: { notes: true },
  };
  const showAssignment = !!(newStatus && statusFieldMap[newStatus]?.assignment);
  const showRepair = !!(newStatus && statusFieldMap[newStatus]?.repair);
  const showImageUpload = !!(newStatus && statusFieldMap[newStatus]?.imageUpload);
  const showNotes = !!(newStatus && statusFieldMap[newStatus]?.notes);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            Current Status
            <HelpTooltip content={
              <div>
                <p className="font-medium mb-1">Current Status:</p>
                <p className="text-[var(--text-secondary)]">The prop's current lifecycle state in the production.</p>
              </div>
            } />
          </label>
          <span className={`text-sm px-2 py-1 rounded-full ${statusColor}`}>
            {lifecycleStatusLabels[currentStatus]}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
          Update Status
          <HelpTooltip content={
            <div>
              <p className="font-medium mb-1">Status Types:</p>
              <ul className="space-y-2">
                <li><span className="font-medium">Confirmed:</span> Active in show</li>
                <li><span className="font-medium">Under Maintenance:</span> Being serviced</li>
                <li><span className="font-medium">Damaged:</span> Needs repair/replacement</li>
                <li><span className="font-medium">Missing:</span> Lost or misplaced</li>
              </ul>
            </div>
          } />
        </label>
        <select
          id="status-select"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as PropLifecycleStatus | '')}
          className="w-full flex-grow bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent disabled:opacity-50"
          disabled={isSubmitting || disabled}
        >
          <option value="">Select New Status</option>
          {Object.entries(lifecycleStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{String(label)}</option>
          ))}
        </select>
        {/* Only render tooltip if newStatus is a valid key */}
        {newStatus && lifecycleStatusPriority[newStatus] && (
          <HelpTooltip content={`Priority: ${lifecycleStatusPriority[newStatus].toUpperCase()}`} />
        )}
      </div>

      {/* Assignment field for statuses that require it */}
      {showAssignment && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Assign To (Select users)</label>
          <UserPicker
            selectedUserIds={assignedTo}
            onChange={setAssignedTo}
            disabled={isSubmitting || disabled}
          />
        </div>
      )}
      {/* Repair fields for repair/maintenance statuses */}
      {showRepair && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Repair Deadline</label>
            <input
              type="date"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
              disabled={isSubmitting || disabled}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Estimated Return Date</label>
            <input
              type="date"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
              disabled={isSubmitting || disabled}
            />
          </div>
        </div>
      )}
      {/* Image Upload Section - only show for damage-related statuses */}
      {showImageUpload && (
        <div className="p-4 rounded-lg bg-[var(--bg-secondary)] space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Damage Documentation
              <HelpTooltip content="Upload images of the damage for documentation and insurance purposes." />
            </label>
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1 bg-[var(--highlight-color)] text-white rounded-md hover:bg-[var(--highlight-color-dark)]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || disabled}
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={isSubmitting || disabled}
            />
          </div>
          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative group">
                  <img src={src} alt="Damage Preview" className="w-24 h-24 object-cover rounded-md" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(idx)}
                    disabled={isSubmitting || disabled}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Notes field for statuses that require it */}
      {showNotes && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            Status Update Notes
            <HelpTooltip content={<div><p className="font-medium mb-1">Update Notes:</p><ul className="list-disc list-inside space-y-1"><li>Explain reason for status change</li><li>Include relevant details</li><li>Note any required actions</li></ul></div>} />
          </label>
          <WysiwygEditor
            value={notes}
            onChange={setNotes}
            placeholder="Enter any relevant notes about this status change..."
            minHeight={100}
            disabled={disabled || isSubmitting}
          />
        </div>
      )}

      {/* Notification option - show if supervisor or manager emails are available */}
      {(showManagerEmail || propsSupervisorEmail) && (
        <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
          <label className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={notifyTeam}
              onChange={(e) => setNotifyTeam(e.target.checked)}
              className="mt-1 form-checkbox h-4 w-4 text-[var(--highlight-color)] bg-[var(--input-bg)] border-[var(--border-color)] rounded focus:ring-[var(--highlight-color)]"
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
        disabled={newStatus === currentStatus || isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--highlight-color)] hover:bg-[var(--highlight-color)]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
