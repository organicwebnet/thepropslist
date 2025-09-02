import React, { useState, useEffect } from 'react';
import DashboardLayout from './PropsBibleHomepage';
import { useWebAuth } from './contexts/WebAuthContext';
import { useFirebase, FirebaseContextType } from './contexts/FirebaseContext';
import type { Show } from '../types/Show.ts';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useShowSelection } from './contexts/ShowSelectionContext';

const ShowsListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const { userProfile, user } = useWebAuth();
  const { service: firebaseService, isInitialized, error: firebaseInitError }: FirebaseContextType = useFirebase();
  const navigate = useNavigate();
  const { currentShowId, setCurrentShowId } = useShowSelection();

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      setError("Firebase not initialized.");
      return;
    }

    if (firebaseInitError) {
      setError(`Firebase Initialization Error: ${firebaseInitError.message}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firebaseService.listenToCollection<Show>(
      'shows',
      (data) => {
        const showList = data.map(doc => ({ ...doc.data, id: doc.id }));
        setShows(showList);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Error fetching shows:", err);
        setError(`Failed to load shows: ${err.message}. Please check your network connection and Firebase permissions.`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseService, isInitialized, firebaseInitError]);

  const handleAddShow = () => {
    // TODO: Route to add show form
    alert('Add Show (not implemented)');
  };

  return (
    <DashboardLayout>
      {/* Debug info removed per request */}

      <div className="relative min-h-[70vh] flex flex-col justify-center items-center bg-gradient-to-br from-pb-primary/40 via-pb-darker/80 to-pb-accent/30 rounded-xl shadow-xl p-6">
        <div className="flex w-full justify-between items-center mb-6">
          <h2 className="text-2xl font-bold self-start">Shows List</h2>
          <button
            onClick={() => navigate('/shows/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white shadow transition focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
            aria-label="Add New Show"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Show</span>
          </button>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="animate-spin h-10 w-10 text-pb-primary mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
            <div className="text-pb-gray mt-2">Loading shows...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
            <div className="text-red-500 font-semibold">{error}</div>
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="h-10 w-10 text-pb-gray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" /></svg>
            <div className="text-pb-gray">No shows found.</div>
          </div>
        ) : (
          <div className="w-full max-w-7xl mx-auto px-4">
            {shows.map((show) => (
              <div
                key={show.id}
                className={`bg-pb-darker/60 rounded-xl shadow-lg p-4 mb-4 cursor-pointer hover:bg-pb-primary/30 transition-colors${currentShowId === show.id ? ' border-2 border-pb-primary' : ''}`}
                onClick={() => navigate(`/shows/${show.id}`)}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${show.name}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/shows/${show.id}`); }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg text-white mb-1">{show.name}</div>
                    {show.description && <div className="text-pb-gray text-sm mb-1 line-clamp-2">{show.description}</div>}
                    <div className="text-xs text-pb-primary/80">
                      {show.startDate && (
                        <span>Start: {show.startDate.toDate ? show.startDate.toDate().toLocaleDateString() : String(show.startDate)}</span>
                      )}
                      {show.endDate && (
                        <span className="ml-4">End: {show.endDate.toDate ? show.endDate.toDate().toLocaleDateString() : String(show.endDate)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setCurrentShowId(show.id); }}
                    className={`ml-4 px-3 py-1 rounded ${currentShowId === show.id ? 'bg-pb-primary text-white' : 'bg-pb-primary/20 text-pb-primary hover:bg-pb-primary/40'} font-semibold text-xs transition`}
                    aria-label={currentShowId === show.id ? 'Current Show' : 'Select Show'}
                  >
                    {currentShowId === show.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShowsListPage; 