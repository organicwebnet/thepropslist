import React, { useEffect, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList } from '../../shared/services/inventory/packListService';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import DashboardLayout from '../PropsBibleHomepage';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useLimitChecker } from '../hooks/useLimitChecker';
import SubFootnote from '../components/SubFootnote';

const PackingListPage: React.FC = () => {
  const { service } = useFirebase();
  const { currentShowId, setCurrentShowId: _setCurrentShowId } = useShowSelection();
  const [packingLists, setPackingLists] = useState<PackList[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user, loading: webAuthLoading } = useWebAuth();
  const { checkPackingBoxesLimit, checkPackingBoxesLimitForShow } = useLimitChecker();
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Check limits on page load and when packing lists change
  useEffect(() => {
    const checkLimits = async () => {
      if (!user?.uid) return;
      
      try {
        // Check per-plan packing boxes limit
        const planLimitCheck = await checkPackingBoxesLimit(user.uid);
        if (!planLimitCheck.withinLimit) {
          setLimitWarning(planLimitCheck.message || 'Packing boxes limit reached');
          return;
        }

        // Check per-show packing boxes limit if show is selected
        if (currentShowId) {
          const showLimitCheck = await checkPackingBoxesLimitForShow(currentShowId);
          if (!showLimitCheck.withinLimit) {
            setLimitWarning(showLimitCheck.message || 'Show packing boxes limit reached');
            return;
          }
        }

        // Clear warning if within limits
        setLimitWarning(null);
      } catch (error) {
        console.error('Error checking packing boxes limits:', error);
        // Don't show error to user, just log it
      }
    };

    checkLimits();
  }, [user?.uid, currentShowId, packingLists.length, checkPackingBoxesLimit, checkPackingBoxesLimitForShow]);

  useEffect(() => {
    if (webAuthLoading) return;
    if (!user) return;
    setLoading(true);
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
    const filters = currentShowId ? { showId: currentShowId } : { ownerId: user.uid };
    // TODO: Replace with real-time listener if available
    packListService.listPackLists(filters as any)
      .then((lists: PackList[]) => {
        setPackingLists(lists);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentShowId, service, user, webAuthLoading]);

  const handleCreatePackingList = async (e: React.FormEvent) => {
    console.log('handleCreatePackingList called');
    e.preventDefault();
    if (!currentShowId || !newListName.trim()) {
      console.log('Missing show ID or list name', { currentShowId, newListName });
      return;
    }
    if (!user) {
      setError('You must be logged in to create a packing list.');
      console.log('No user in context');
      return;
    }
    const ownerId = user.uid;
    if (!ownerId) {
      setError('You must be logged in to create a packing list.');
      console.log('No ownerId');
      return;
    }

    // Check packing boxes limits before creating
    try {
      // Check per-plan packing boxes limit
      const planLimitCheck = await checkPackingBoxesLimit(user.uid);
      if (!planLimitCheck.withinLimit) {
        setError(planLimitCheck.message || 'Packing boxes limit reached');
        return;
      }

      // Check per-show packing boxes limit if show is selected
      if (currentShowId) {
        const showLimitCheck = await checkPackingBoxesLimitForShow(currentShowId);
        if (!showLimitCheck.withinLimit) {
          setError(showLimitCheck.message || 'Show packing boxes limit reached');
          return;
        }
      }
    } catch (limitError) {
      console.error('Error checking packing boxes limits:', limitError);
      setError('Error checking limits. Please try again.');
      return;
    }

    setCreating(true);
    setError(null);
    console.log('Creating DigitalPackListService...');
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);

    try {
      const newListData = {
        name: newListName.trim(),
        showId: currentShowId,
        containers: [],
        status: 'draft' as const,
        labels: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: ownerId,
          updatedBy: ownerId,
        },
        ownerId,
      };
      console.log('About to call createPackList', newListData);
      const newListId = await packListService.createPackList(newListData);
      console.log('Packing list created, newListId:', newListId);
      setNewListName('');
      // Refresh list after creation
      const lists = await packListService.listPackLists({ showId: currentShowId });
      setPackingLists(lists);
      // Navigate to the new packing list detail page
      if (newListId) {
        navigate(`/packing-lists/${newListId}`);
      }
    } catch (e: any) {
      setError(e.message);
      console.error('Error creating packing list:', e);
    } finally {
      setCreating(false);
    }
  };

  if (webAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
            <p className="text-pb-gray/70">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 text-red-500 mx-auto mb-4">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
            <p className="text-pb-gray/70">Please sign in to create a packing list.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Limit Warning Banner */}
      {limitWarning && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-red-200 font-semibold mb-1">Subscription Limit Reached</div>
              <div className="text-red-100 text-sm mb-3">{limitWarning}</div>
              <a 
                href="/profile"
                className="inline-block px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg font-semibold transition-colors text-sm"
              >
                Upgrade Plan
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Packing Lists</h1>
          </div>
          <p className="text-pb-gray/70">Manage your packing lists and containers for efficient organization</p>
        </div>
        <SubFootnote features={["Packing labels", "Shipping QR codes", "Advanced packing tools"]} />
        
        {/* Create New List Form */}
        <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10 mb-6">
          <form onSubmit={handleCreatePackingList} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-list-name" className="block text-white font-semibold mb-2">Create New Packing List</label>
              <div className="flex gap-3">
                <input
                  id="new-list-name"
                  type="text"
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                  placeholder="Enter packing list name..."
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  disabled={creating}
                  required
                />
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    creating || !newListName.trim() 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-pb-primary hover:bg-pb-secondary text-white'
                  }`}
                  disabled={creating || !newListName.trim()}
                >
                  {creating ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </div>
          </form>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
              <p className="text-pb-gray/70">Loading packing lists...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packingLists.map(list => (
              <div
                key={list.id}
                className="bg-pb-darker/40 rounded-lg border border-white/10 p-6 hover:bg-pb-darker/60 transition-colors duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <a
                      href={`/packing-lists/${list.id}`}
                      className="text-xl font-bold text-white hover:text-pb-primary transition-colors duration-150 cursor-pointer block mb-2"
                    >
                      {list.name}
                    </a>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-pb-gray/70 text-sm">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                        list.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        list.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        list.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {list.status}
                      </span>
                    </div>
                    <p className="text-pb-gray/50 text-sm">
                      Created: {new Date(list.metadata.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-pb-gray/70 text-sm">
                    {list.containers?.length || 0} containers
                  </div>
                  <a
                    href={`/packing-lists/${list.id}`}
                    className="text-pb-primary hover:text-pb-secondary text-sm font-medium transition-colors"
                  >
                    View Details →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && packingLists.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 text-pb-gray/50 mx-auto mb-4">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <p className="text-pb-gray/70 text-lg mb-2">No packing lists found</p>
            <p className="text-pb-gray/50 text-sm">Create your first packing list to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PackingListPage; 