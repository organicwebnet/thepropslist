import React, { useEffect, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList } from '../../shared/services/inventory/packListService';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import DashboardLayout from '../PropsBibleHomepage';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';

const PackingListPage: React.FC = () => {
  const { service } = useFirebase();
  const { currentShowId, setCurrentShowId } = useShowSelection();
  const [packingLists, setPackingLists] = useState<PackList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user, loading: webAuthLoading } = useWebAuth();

  useEffect(() => {
    if (!currentShowId) return;
    setLoading(true);
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
    // TODO: Replace with real-time listener if available
    packListService.listPackLists({ showId: currentShowId })
      .then((lists: PackList[]) => {
        setPackingLists(lists);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentShowId, service]);

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

  if (!currentShowId) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto p-8">
          <h2 className="text-2xl font-bold mb-6">Select a Show</h2>
          {/* TODO: Show selector component here */}
          <button onClick={() => setCurrentShowId(prompt('Enter show ID:') || null)} className="btn btn-primary">Set Show</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Packing Lists</h1>
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