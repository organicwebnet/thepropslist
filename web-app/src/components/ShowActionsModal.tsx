import React, { useState } from 'react';
import { Archive, Trash2, AlertTriangle, X } from 'lucide-react';
import { ArchiveService } from '../services/ArchiveService';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useLimitChecker } from '../hooks/useLimitChecker';

interface ShowActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  showName: string;
  onShowArchived?: () => void;
  onShowDeleted?: () => void;
}

const ShowActionsModal: React.FC<ShowActionsModalProps> = ({
  isOpen,
  onClose,
  showId,
  showName,
  onShowArchived,
  onShowDeleted,
}) => {
  const { service: firebaseService } = useFirebase();
  const { user } = useWebAuth();
  const { limits } = useSubscription();
  const { checkArchivedShowsLimit } = useLimitChecker();
  const [activeTab, setActiveTab] = useState<'archive' | 'delete'>('archive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [archiveService] = useState(() => new ArchiveService(firebaseService));

  if (!isOpen) return null;

  const handleArchive = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check archived shows limit using the new limit checker
      const limitCheck = await checkArchivedShowsLimit(user.uid);
      if (!limitCheck.withinLimit) {
        setError(limitCheck.message || 'Archived shows limit reached');
        setLoading(false);
        return;
      }
      
      await archiveService.archiveShow(showId, user.uid, limits.archivedShows);
      onShowArchived?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to archive show');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.uid || deleteConfirmation !== 'delete show') return;
    
    setLoading(true);
    setError(null);
    
    try {
      await archiveService.permanentlyDeleteShow(showId, user.uid);
      onShowDeleted?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete show');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-pb-darker/90 border border-pb-primary/30 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pb-primary/20">
          <h2 className="text-xl font-bold text-white">Show Actions</h2>
          <button
            onClick={onClose}
            className="text-pb-gray hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Show Info */}
        <div className="p-6 border-b border-pb-primary/20">
          <h3 className="text-lg font-semibold text-white mb-2">{showName}</h3>
          <p className="text-pb-gray text-sm">
            Choose an action for this show. Archived shows can be restored, but deleted shows cannot be recovered.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-pb-primary/20">
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex-1 px-6 py-4 text-left transition-colors ${
              activeTab === 'archive'
                ? 'bg-pb-primary/20 text-pb-primary border-b-2 border-pb-primary'
                : 'text-pb-gray hover:text-white hover:bg-pb-primary/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              <span className="font-medium">Archive Show</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex-1 px-6 py-4 text-left transition-colors ${
              activeTab === 'delete'
                ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                : 'text-pb-gray hover:text-white hover:bg-red-500/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">Delete Show</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'archive' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Archive className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Archive Show</h4>
                  <p className="text-pb-gray text-sm mb-3">
                    Archiving will preserve all show data including props, tasks, packing lists, and collaborators. 
                    The show can be restored later if needed.
                  </p>
                  <ul className="text-pb-gray text-sm space-y-1">
                    <li>• All props and their images will be preserved</li>
                    <li>• Task boards and cards will be archived</li>
                    <li>• Packing lists and boxes will be saved</li>
                    <li>• Collaborator information will be maintained</li>
                    <li>• Show can be restored at any time</li>
                  </ul>
                  <div className="mt-3 p-2 bg-pb-darker/60 rounded text-xs text-pb-gray">
                    <strong>Archive Limit:</strong> {limits.archivedShows === 0 ? 'No archived shows allowed on free plan' : `Up to ${limits.archivedShows} archived shows`}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleArchive}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Archiving...' : 'Archive Show'}
              </button>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">Permanently Delete Show</h4>
                  <p className="text-pb-gray text-sm mb-3">
                    <strong className="text-red-400">This action cannot be undone.</strong> All show data will be permanently deleted including:
                  </p>
                  <ul className="text-pb-gray text-sm space-y-1">
                    <li>• All props and their images</li>
                    <li>• Task boards and cards</li>
                    <li>• Packing lists and boxes</li>
                    <li>• Collaborator information</li>
                    <li>• Shopping lists</li>
                    <li>• All associated media and files</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-pb-gray text-sm mb-2 block">
                    To confirm deletion, type <code className="bg-pb-darker px-2 py-1 rounded text-red-400">delete show</code> below:
                  </span>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="delete show"
                    className="w-full px-3 py-2 bg-pb-darker border border-red-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </label>

                <div className="space-y-2">
                  <button
                    onClick={handleDelete}
                    disabled={loading || deleteConfirmation !== 'delete show'}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Deleting...' : 'Permanently Delete Show'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowActionsModal;
