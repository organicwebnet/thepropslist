import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, onClose, reason }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-pb-darker/90 border border-pb-primary/30 rounded-xl p-6 w-[92%] max-w-md">
        <div className="text-white text-lg font-semibold mb-2">Upgrade required</div>
        {reason && <div className="text-pb-gray text-sm mb-3">{reason}</div>}
        <div className="text-pb-gray text-sm mb-4">Upgrade your plan to unlock this feature or increase your limits.</div>
        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded bg-pb-primary/20 text-white">Cancel</button>
          <button onClick={handleManageBilling} disabled={loading} className="px-3 py-2 rounded bg-pb-primary text-white font-semibold">
            {loading ? 'Opening…' : 'Manage Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;


