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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== STATUS UPDATE DEBUG ===');
    console.log('1. Current Status:', currentStatus);
    console.log('2. New Status:', newStatus);
    console.log('3. Notes:', notes);
    console.log('4. Notify Team:', notifyTeam);
    console.log('5. Damage Images:', damageImages);
    
    if (!newStatus || newStatus === currentStatus) return;

    setIsSubmitting(true);
    
    try {
      console.log('6. Calling onStatusUpdate with params:', {
        newStatus,
        notes: notes.trim() || '',
        notifyTeam,
        damageImages: damageImages.length > 0 ? damageImages : undefined
      });

      await onStatusUpdate(
        newStatus,
        notes.trim() || '',
        notifyTeam,
        damageImages.length > 0 ? damageImages : undefined
      );

      console.log('7. Status update completed successfully');

      // Reset form state after successful update
      setNotes('');
      setDamageImages([]);
      setImagePreviews([]);
      // Don't reset status as we want to show the new current status
    } catch (error) {
      console.error('8. Error updating prop status:', error);
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
  // const statusColor = newStatus ? {
  //   critical: 'border-red-500 bg-red-900/50',
  //   high: 'border-orange-500 bg-orange-900/50',
  //   medium: 'border-yellow-500 bg-yellow-900/50',
  //   low: 'border-blue-500 bg-blue-900/50',
  //   info: 'border-gray-700 bg-gray-800/50',
  // }[statusPriority] || 'border-gray-700 bg-gray-800/50'; // Fallback

  // Refactored statusColor logic
  let statusColor: string;
  const defaultColor = 'border-gray-700 bg-gray-800/50';
  if (newStatus) {
    const colorMap: Record<StatusPriority | 'info', string> = {
      critical: 'border-red-500 bg-red-900/50',
      high: 'border-orange-500 bg-orange-900/50',
      medium: 'border-yellow-500 bg-yellow-900/50',
      low: 'border-blue-500 bg-blue-900/50',
      info: defaultColor,
    };
    statusColor = colorMap[statusPriority] || defaultColor;
  } else {
    statusColor = defaultColor;
  }

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

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
          Status Update Notes
          <HelpTooltip content={
            <div>
              <p className="font-medium mb-1">Update Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Explain reason for status change</li>
                <li>Include relevant details</li>
                <li>Note any required actions</li>
              </ul>
            </div>
          } />
        </label>
        <WysiwygEditor
          value={notes}
          onChange={setNotes}
          placeholder="Enter any relevant notes about this status change..."
          minHeight={100}
          disabled={disabled || isSubmitting}
        />
      </div>

      {/* Image Upload Section - only show for damage-related statuses */}
      {shouldShowImageUpload && (
        <div className="p-4 rounded-lg bg-[var(--bg-secondary)] space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              Damage Documentation
              <HelpTooltip content={
                <div>
                  <p className="font-medium mb-1">Documentation Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Clear photos of damage</li>
                    <li>Multiple angles if needed</li>
                    <li>Good lighting for visibility</li>
                  </ul>
                </div>
              } />
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--input-bg)] hover:bg-[var(--input-bg)]/80 text-[var(--text-primary)] rounded-md transition-colors"
              disabled={disabled || isSubmitting}
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={disabled || isSubmitting}
            />
          </div>

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group h-24 border border-[var(--border-color)] rounded-md overflow-hidden">
                  <img 
                    src={preview} 
                    alt={`Damage documentation ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {imagePreviews.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-[var(--border-color)] rounded-md">
              <Camera className="h-8 w-8 text-[var(--text-secondary)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Upload images to document the damage
              </p>
              <p className="text-xs text-[var(--text-secondary)]/70">
                (Drag and drop or click the upload button)
              </p>
            </div>
          )}
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