import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, onClose, reason }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open && !loading) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      const fn = httpsCallable<any, { url: string }>(getFunctions(), 'createBillingPortalSession');
      const res = await fn({});
      const url = res?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setError('Failed to create billing session');
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-pb-darker/90 border border-pb-primary/30 rounded-xl p-4 md:p-6 w-full max-w-md mx-4 overflow-hidden">
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="text-white text-base md:text-lg font-semibold mb-2 break-words">Upgrade required</div>
          {reason && <div className="text-pb-gray text-sm md:text-base mb-3 break-words">{reason}</div>}
          <div className="text-pb-gray text-sm md:text-base mb-4 break-words">Upgrade your plan to unlock this feature or increase your limits.</div>
          {error && <div className="text-red-400 text-sm md:text-base mb-3 break-words">{error}</div>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2.5 md:py-2 rounded bg-pb-primary/20 text-white text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center">Cancel</button>
            <button onClick={handleManageBilling} disabled={loading} className="px-4 py-2.5 md:py-2 rounded bg-pb-primary text-white font-semibold text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center">
              {loading ? 'Opening…' : 'Manage Subscription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;


