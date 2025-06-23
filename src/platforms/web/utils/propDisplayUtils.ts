import { PropLifecycleStatus, lifecycleStatusLabels } from '../../../types/lifecycle.ts';

// Status color mapping using Tailwind classes
export const statusColorMap: Record<PropLifecycleStatus, { bg: string; text: string; border: string }> = {
  confirmed: { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-500/50' },
  repaired_back_in_show: { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-500/50' },
  out_for_repair: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  damaged_awaiting_repair: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  damaged_awaiting_replacement: { bg: 'bg-orange-700/30', text: 'text-orange-300', border: 'border-orange-400/50' },
  missing: { bg: 'bg-red-700/30', text: 'text-red-300', border: 'border-red-400/50' },
  cut: { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500/50' },
  in_transit: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  under_maintenance: { bg: 'bg-teal-600/20', text: 'text-teal-400', border: 'border-teal-500/50' },
  loaned_out: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  on_hold: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', border: 'border-indigo-500/50' },
  under_review: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  being_modified: { bg: 'bg-pink-600/20', text: 'text-pink-400', border: 'border-pink-500/50' },
  backup: { bg: 'bg-lime-600/20', text: 'text-lime-400', border: 'border-lime-500/50' },
  temporarily_retired: { bg: 'bg-gray-700/30', text: 'text-gray-300', border: 'border-gray-400/50' },
  ready_for_disposal: { bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-400/50' },
  available_in_storage: { bg: 'bg-slate-600/20', text: 'text-slate-400', border: 'border-slate-500/50' },
  checked_out: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  in_use_on_set: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  on_order: { bg: 'bg-yellow-200/20', text: 'text-yellow-600', border: 'border-yellow-400/50' },
  to_buy: { bg: 'bg-orange-200/20', text: 'text-orange-600', border: 'border-orange-400/50' },
};

// Helper to get status label
export const getStatusLabel = (status: PropLifecycleStatus | undefined): string => {
  if (!status) return 'Unknown';
  return lifecycleStatusLabels[status] || status;
};

// Helper to format date/time
export const formatDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString([], { // Use user's locale
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  } catch (e) {
    return 'Invalid Date';
  }
}; 