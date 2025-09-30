import React, { useState, useEffect } from 'react';
import { Archive, RotateCcw, Calendar, User, Database } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { ArchiveService } from '../services/ArchiveService';
import type { ShowArchive } from '../types/Archive';

interface ArchivedShowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowRestored?: () => void;
}

const ArchivedShowsModal: React.FC<ArchivedShowsModalProps> = ({
  isOpen,
  onClose,
  onShowRestored,
}) => {
  const { service: firebaseService } = useFirebase();
  const { user } = useWebAuth();
  const { limits } = useSubscription();
  const [archives, setArchives] = useState<ShowArchive[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveService] = useState(() => new ArchiveService(firebaseService));

  useEffect(() => {
    if (isOpen) {
      loadArchives();
    }
  }, [isOpen]);

  const loadArchives = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const archivesDocs = await firebaseService.getDocuments('show_archives', {
        where: [['archivedBy', '==', user.uid]],
        orderBy: [['archivedAt', 'desc']],
      });
      
      setArchives(archivesDocs.map(doc => ({ ...doc.data, id: doc.id } as ShowArchive)));
    } catch (err: any) {
      setError(err.message || 'Failed to load archived shows');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (archiveId: string) => {
    if (!user?.uid) return;
    
    setRestoring(archiveId);
    setError(null);
    
    try {
      await archiveService.restoreShow(archiveId, user.uid);
      onShowRestored?.();
      loadArchives(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to restore show');
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-pb-darker/90 border border-pb-primary/30 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pb-primary/20">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-pb-primary" />
            <div>
              <h2 className="text-xl font-bold text-white">Archived Shows</h2>
              <p className="text-sm text-pb-gray">
                {limits.archivedShows === 0 ? 'No archived shows allowed on free plan' : `${archives.length}/${limits.archivedShows} archived shows`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-pb-gray hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pb-primary"></div>
              <span className="ml-3 text-pb-gray">Loading archived shows...</span>
            </div>
          ) : archives.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 text-pb-gray mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Archived Shows</h3>
              <p className="text-pb-gray">You haven't archived any shows yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {archives.map((archive) => (
                <div
                  key={archive.id}
                  className="bg-pb-darker/60 border border-pb-primary/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {archive.originalShow.name}
                        </h3>
                        {!archive.restorationInfo?.canRestore && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            Restored
                          </span>
                        )}
                      </div>
                      
                      <p className="text-pb-gray text-sm mb-3">
                        {archive.originalShow.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-pb-primary" />
                          <span className="text-pb-gray">Archived:</span>
                          <span className="text-white">{formatDate(archive.archivedAt)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-pb-primary" />
                          <span className="text-pb-gray">Size:</span>
                          <span className="text-white">{formatFileSize(archive.archiveMetadata.archiveSize)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-pb-gray">Props:</span>
                          <span className="text-white">{archive.archiveMetadata.totalProps}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-pb-gray">Tasks:</span>
                          <span className="text-white">{archive.archiveMetadata.totalTasks}</span>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-pb-gray">
                        <div>Packing Boxes: {archive.archiveMetadata.totalPackingBoxes}</div>
                        <div>Collaborators: {archive.archiveMetadata.totalCollaborators}</div>
                      </div>
                    </div>

                    <div className="ml-4">
                      {archive.restorationInfo?.canRestore ? (
                        <button
                          onClick={() => handleRestore(archive.id)}
                          disabled={restoring === archive.id}
                          className="flex items-center gap-2 px-4 py-2 bg-pb-primary hover:bg-pb-accent text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {restoring === archive.id ? 'Restoring...' : 'Restore'}
                        </button>
                      ) : (
                        <div className="text-center">
                          <div className="text-green-400 text-sm font-medium mb-1">Restored</div>
                          <div className="text-pb-gray text-xs">
                            {archive.restorationInfo?.lastRestoredAt && 
                              formatDate(archive.restorationInfo.lastRestoredAt)
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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

export default ArchivedShowsModal;
