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

  if (webAuthLoading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in to create a packing list.</div>;

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

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Packing Lists</h1>
        <SubFootnote features={["Packing labels", "Shipping QR codes", "Advanced packing tools"]} />
        <form onSubmit={handleCreatePackingList} className="flex flex-col gap-2 mb-6 max-w-lg">
          <label htmlFor="new-list-name" className="text-white font-semibold mb-1">Create New List</label>
          <div className="flex gap-2">
            <input
              id="new-list-name"
              type="text"
              className="flex-1 px-4 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/40 text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary"
              placeholder="New packing list name"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              disabled={creating}
              required
            />
            <button
              type="submit"
              className={`btn btn-primary${creating || !newListName.trim() ? ' opacity-60 cursor-not-allowed' : ''}`}
              disabled={creating || !newListName.trim()}
            >
              {creating ? 'Creating...' : '+ New Packing List'}
            </button>
          </div>
        </form>
        {loading && <div className="text-gray-400">Loading...</div>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packingLists.map(list => (
            <div
              key={list.id}
              className="bg-gray-900 rounded-xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-shadow duration-200"
            >
              <div>
                <a
                  href={`/packing-lists/${list.id}`}
                  className="text-xl font-bold text-white mb-2 hover:underline hover:text-indigo-400 transition-colors duration-150 cursor-pointer"
                >
                  {list.name}
                </a>
                <p className="text-sm text-gray-400 mb-2">
                  Status: <span className="capitalize">{list.status}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(list.metadata.createdAt).toLocaleDateString()}
                </p>
              </div>
              {/* No View button */}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PackingListPage; 