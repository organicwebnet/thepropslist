import React, { useState } from 'react';
import { Prop } from '../types/props';
import { getQuantityBreakdown, calculateQuantityInStorage } from '../utils/propQuantityUtils';
import { X } from 'lucide-react';

interface SpareManagementProps {
  prop: Prop;
  onUpdate: (updates: Partial<Prop>) => Promise<void>;
}

type BrokenReason = 'broken' | 'lost' | 'damaged' | 'used' | 'other';

export const SpareManagement: React.FC<SpareManagementProps> = ({ prop, onUpdate }) => {
  const [error, setError] = useState<string | null>(null);
  const [showBrokenModal, setShowBrokenModal] = useState(false);
  const [brokenReason, setBrokenReason] = useState<BrokenReason>('broken');
  const [brokenNotes, setBrokenNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const breakdown = getQuantityBreakdown(prop);
  const inStorage = calculateQuantityInStorage(prop);

  const handleUseSpare = async () => {
    if (inStorage <= 0) {
      setError('No spares available in storage');
      return;
    }
    
    setActionLoading('use');
    setError(null);
    try {
      const newQuantityInUse = (prop.quantityInUse ?? 0) + 1;
      await onUpdate({ quantityInUse: newQuantityInUse });
    } catch (err: any) {
      setError(err.message || 'Failed to use spare');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnToStorage = async () => {
    const currentInUse = prop.quantityInUse ?? 0;
    if (currentInUse <= 0) {
      setError('No items currently in use');
      return;
    }
    
    setActionLoading('return');
    setError(null);
    try {
      const newQuantityInUse = currentInUse - 1;
      await onUpdate({ quantityInUse: Math.max(0, newQuantityInUse) });
    } catch (err: any) {
      setError(err.message || 'Failed to return to storage');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkBrokenLost = async (reason: BrokenReason, notes?: string) => {
    if (inStorage <= 0) {
      setError('No spares available to mark as broken/lost');
      return;
    }
    
    // Validate that we're not breaking the quantity constraint
    const newQuantity = prop.quantity - 1;
    const currentInUse = prop.quantityInUse ?? 0;
    if (currentInUse > newQuantity) {
      setError(`Cannot mark as broken: ${currentInUse} items are in use, but only ${newQuantity} will remain. Please return some items to storage first.`);
      return;
    }
    
    if (newQuantity < 0) {
      setError('Cannot mark as broken: quantity would become negative');
      return;
    }
    
    setActionLoading('broken');
    setError(null);
    try {
      const usageHistory = prop.spareUsageHistory || [];
      
      await onUpdate({
        quantity: newQuantity,
        quantityInUse: currentInUse, // Keep in-use count the same
        spareUsageHistory: [
          ...usageHistory,
          {
            date: new Date().toISOString(),
            quantity: 1,
            reason,
            notes
          }
        ]
      });
      setShowBrokenModal(false);
      setBrokenNotes('');
      setBrokenReason('broken');
    } catch (err: any) {
      setError(err.message || 'Failed to mark as broken/lost');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenBrokenModal = () => {
    setShowBrokenModal(true);
    setError(null);
  };

  const handleSubmitBroken = () => {
    handleMarkBrokenLost(brokenReason, brokenNotes.trim() || undefined);
  };

  const handleCheckInventory = async () => {
    setActionLoading('check');
    setError(null);
    try {
      const currentStorage = prop.spareStorage || {};
      await onUpdate({
        spareStorage: {
          ...currentStorage,
          location: currentStorage.location || '',
          lastChecked: new Date().toISOString()
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory check');
    } finally {
      setActionLoading(null);
    }
  };

  if (breakdown.spare <= 0 && inStorage <= 0 && !prop.spareStorage?.location) {
    return null; // Don't show spare management if no spares
  }

  return (
    <div className="bg-pb-darker/40 rounded-lg border border-pb-primary/20 p-4 space-y-4">
      <h3 className="text-white font-semibold text-lg">Spare Management</h3>
      
      {error && (
        <div 
          className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-pb-darker/60 rounded-lg p-3">
          <div className="text-pb-gray text-sm mb-1">In Storage</div>
          <div className="text-white text-2xl font-bold">{inStorage}</div>
        </div>
        <div className="bg-pb-darker/60 rounded-lg p-3">
          <div className="text-pb-gray text-sm mb-1">In Use</div>
          <div className="text-white text-2xl font-bold">{breakdown.inUse}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleUseSpare}
          disabled={actionLoading !== null || inStorage <= 0}
          aria-label={`Use one spare. ${inStorage} spares available in storage.`}
          aria-disabled={actionLoading !== null || inStorage <= 0}
          className="px-4 py-2 bg-pb-primary hover:bg-pb-accent text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === 'use' ? 'Processing...' : 'Use Spare'}
        </button>
        
        <button
          onClick={handleReturnToStorage}
          disabled={actionLoading !== null || breakdown.inUse <= 0}
          aria-label={`Return one item to storage. ${breakdown.inUse} items currently in use.`}
          aria-disabled={actionLoading !== null || breakdown.inUse <= 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === 'return' ? 'Processing...' : 'Return to Storage'}
        </button>
        
        <button
          onClick={handleOpenBrokenModal}
          disabled={actionLoading !== null || inStorage <= 0}
          aria-label="Mark an item as broken, lost, or damaged"
          aria-disabled={actionLoading !== null || inStorage <= 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mark Broken/Lost
        </button>
        
        <button
          onClick={handleCheckInventory}
          disabled={actionLoading !== null}
          aria-label="Update inventory check timestamp"
          aria-disabled={actionLoading !== null}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === 'check' ? 'Processing...' : 'Check Inventory'}
        </button>
      </div>

      {/* Broken/Lost Modal */}
      {showBrokenModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowBrokenModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="broken-modal-title"
        >
          <div 
            className="bg-pb-darker rounded-lg border border-pb-primary/30 p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="broken-modal-title" className="text-white font-semibold text-lg">Mark Item as Broken/Lost</h3>
              <button
                onClick={() => setShowBrokenModal(false)}
                aria-label="Close modal"
                className="text-pb-gray hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="broken-reason" className="block text-pb-gray mb-2 font-medium">Reason</label>
                <select
                  id="broken-reason"
                  value={brokenReason}
                  onChange={(e) => setBrokenReason(e.target.value as BrokenReason)}
                  className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                >
                  <option value="broken">Broken</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                  <option value="used">Used</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="broken-notes" className="block text-pb-gray mb-2 font-medium">Notes (optional)</label>
                <textarea
                  id="broken-notes"
                  value={brokenNotes}
                  onChange={(e) => setBrokenNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                  placeholder="Add any additional notes..."
                />
              </div>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm" role="alert">
                  {error}
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowBrokenModal(false);
                    setBrokenNotes('');
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-pb-primary/30 text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBroken}
                  disabled={actionLoading === 'broken'}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'broken' ? 'Processing...' : 'Mark as Broken/Lost'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {prop.spareStorage?.lastChecked && (
        <div className="text-pb-gray text-sm">
          Last checked: {new Date(prop.spareStorage.lastChecked).toLocaleDateString('en-GB')}
        </div>
      )}
    </div>
  );
};

