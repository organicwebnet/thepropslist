import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from './PropsBibleHomepage';
import { useFirebase, FirebaseContextType } from './contexts/FirebaseContext';
import type { Show } from './types/Show';
import { useNavigate } from 'react-router-dom';
import { Plus, Gem, AlertTriangle, Archive } from 'lucide-react';
import { useShowSelection } from './contexts/ShowSelectionContext';
import { useSubscription } from './hooks/useSubscription';
import { useLimitChecker } from './hooks/useLimitChecker';
import { useWebAuth } from './contexts/WebAuthContext';
import { usePermissions } from './hooks/usePermissions';
import UpgradeModal from './components/UpgradeModal';
import { showNeedsAttention } from './utils/showUtils';
import ArchivedShowsModal from './components/ArchivedShowsModal';
import AvailabilityCounter from './components/AvailabilityCounter';

const ShowsListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const { user } = useWebAuth();
  const { service: firebaseService, isInitialized, error: firebaseInitError }: FirebaseContextType = useFirebase();
  const navigate = useNavigate();
  const { currentShowId, setCurrentShowId } = useShowSelection();
  const { limits, effectiveLimits } = useSubscription();
  const { checkShowLimit } = useLimitChecker();
  const { isExempt, shouldShowSubscriptionNotifications, effectiveLimits: permissionLimits } = usePermissions();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [archivedShowsOpen, setArchivedShowsOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Clear notifications for exempt users
  const clearNotificationsForExemptUser = useCallback(() => {
    if (isExempt) {
      setNotification(null);
    }
  }, [isExempt]);

  // Check limits on page load and when shows change
  useEffect(() => {
    const checkLimits = async () => {
      if (!user?.uid) return;
      
      // Skip subscription checks for exempt users
      if (isExempt) {
        clearNotificationsForExemptUser();
        return;
      }
      
      try {
        const limitCheck = await checkShowLimit(user.uid);
        if (!limitCheck.withinLimit) {
          setNotification(limitCheck.message || 'Show limit reached');
        } else {
          setNotification(null);
        }
      } catch (error) {
        // Don't show error to user, just log it
        console.error('Error checking show limits:', error);
      }
    };

    checkLimits();
  }, [user?.uid, isExempt, shows.length, checkShowLimit, clearNotificationsForExemptUser]);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

    // Track all owned shows from both field names
    let allOwnedShows: Show[] = [];
    let createdByShows: Show[] = [];
    let userIdShows: Show[] = [];
    
    const updateCombinedShows = () => {
      // Combine and deduplicate shows from both queries
      allOwnedShows = [...createdByShows];
      userIdShows.forEach(show => {
        if (!allOwnedShows.find(s => s.id === show.id)) {
          allOwnedShows.push(show);
        }
      });
      
      // Fetch shows the user collaborates on
      const collaborativeShowsUnsubscribe = firebaseService.listenToCollection<Show>(
        'shows',
        (collaborativeData) => {
          const collaborativeShows = collaborativeData.map(doc => ({ ...doc.data, id: doc.id }));
          
          // Combine and deduplicate shows
          const allShows = [...allOwnedShows];
          collaborativeShows.forEach(show => {
            if (!allShows.find(s => s.id === show.id)) {
              allShows.push(show);
            }
          });
          
          setShows(allShows);
          setLoading(false);
          
          // If user has no shows, redirect to add show form
          if (allShows.length === 0 && user?.uid) {
            navigate('/shows/new');
          }
        },
        (err: Error) => {
          console.error("Error fetching collaborative shows:", err);
          // Only show error notifications for non-exempt users
          if (shouldShowSubscriptionNotifications) {
            setNotification(`Failed to load collaborative shows: ${err.message}`);
          }
          setLoading(false);
        },
        {
          where: [['collaborators', 'array-contains', user?.uid || '']]
        }
      );
      
      return collaborativeShowsUnsubscribe;
    };

    // Listen to shows with createdBy field
    const createdByShowsUnsubscribe = firebaseService.listenToCollection<Show>(
      'shows',
      (ownedData) => {
        createdByShows = ownedData.map(doc => ({ ...doc.data, id: doc.id }));
        updateCombinedShows();
      },
      (err: Error) => {
        console.error("Error fetching createdBy shows:", err);
        // Only show error notifications for non-exempt users
        if (shouldShowSubscriptionNotifications) {
          setNotification(`Failed to load shows: ${err.message}`);
        }
        setLoading(false);
      },
      {
        where: [['createdBy', '==', user?.uid || '']]
      }
    );

    // Listen to shows with userId field
    const userIdShowsUnsubscribe = firebaseService.listenToCollection<Show>(
      'shows',
      (ownedData) => {
        userIdShows = ownedData.map(doc => ({ ...doc.data, id: doc.id }));
        updateCombinedShows();
      },
      (err: Error) => {
        console.error("Error fetching userId shows:", err);
        // Only show error notifications for non-exempt users
        if (shouldShowSubscriptionNotifications) {
          setNotification(`Failed to load shows: ${err.message}`);
        }
        setLoading(false);
      },
      {
        where: [['userId', '==', user?.uid || '']]
      }
    );

    return () => {
      createdByShowsUnsubscribe();
      userIdShowsUnsubscribe();
    };
  }, [firebaseService, isInitialized, firebaseInitError, navigate, user?.uid]);

  // const _handleAddShow = () => {
  //   // TODO: Route to add show form
  //   alert('Add Show (not implemented)');
  // };


  return (
    <DashboardLayout>
      {/* Subtle notification - only show for non-exempt users */}
      {notification && shouldShowSubscriptionNotifications && (
        <div className="fixed top-4 right-4 z-50 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {notification}
        </div>
      )}

      <div className="relative min-h-[70vh] flex flex-col justify-center items-center bg-gradient-to-br from-pb-primary/40 via-pb-darker/80 to-pb-accent/30 rounded-xl shadow-xl p-6">
        <div className="flex w-full justify-between items-center mb-6">
          <h2 className="text-2xl font-bold self-start">Shows List</h2>
            <div className="flex items-center gap-3">
            {shouldShowSubscriptionNotifications && (
              <AvailabilityCounter
                currentCount={shows.length}
                limit={permissionLimits.shows}
                type="shows"
                className="text-sm"
              />
            )}
            
            <button
              onClick={() => setArchivedShowsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-pb-darker hover:bg-pb-primary/20 text-pb-gray hover:text-white border border-pb-primary/30 rounded-lg transition-colors"
              title={limits.archivedShows === 0 ? 'No archived shows allowed on free plan' : `View archived shows (limit: ${limits.archivedShows})`}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archived</span>
            </button>
            
            <button
              onClick={async () => {
                if (!user?.uid) {
                  navigate('/login');
                  return;
                }
                
                // Skip limit checks for exempt users
                if (!isExempt) {
                  const limitCheck = await checkShowLimit(user.uid);
                  if (!limitCheck.withinLimit) {
                    setUpgradeOpen(true);
                    return;
                  }
                }
                
                navigate('/shows/new');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${!isExempt && shows.length >= permissionLimits.shows ? 'bg-pb-primary/20 text-pb-gray cursor-not-allowed' : 'bg-pb-primary hover:bg-pb-accent text-white'} shadow transition focus:outline-none focus:ring-2 focus:ring-pb-primary/50`}
              title={!isExempt && shows.length >= permissionLimits.shows ? 'Upgrade to create more shows' : 'Create a new show'}
              aria-label="Add New Show"
            >
              {!isExempt && shows.length >= permissionLimits.shows ? <Gem className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">Add Show</span>
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="animate-spin h-10 w-10 text-pb-primary mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
            <div className="text-pb-gray mt-2">Loading shows...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="h-10 w-10 text-pb-gray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
            <div className="text-pb-gray">Unable to load shows. Please try again later.</div>
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
                className={`bg-pb-darker/60 rounded-xl shadow-lg p-4 mb-4 cursor-pointer hover:bg-pb-primary/30 transition-colors${currentShowId === show.id ? ' border-2 border-pb-primary' : ''}${showNeedsAttention(show) ? ' border-l-4 border-l-pb-warning' : ''}`}
                onClick={() => navigate(`/shows/${show.id}`)}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${show.name}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/shows/${show.id}`); }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-lg text-white">{show.name}</div>
                      {showNeedsAttention(show) && (
                        <div className="flex items-center gap-1" title="Add more details like production info, venues, acts, or team members to get the most out of this show">
                          <AlertTriangle className="w-4 h-4 text-pb-warning" />
                          <span className="text-xs text-pb-warning font-medium">Needs attention</span>
                        </div>
                      )}
                    </div>
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
      {upgradeOpen && (
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={`You have reached your plan's show limit. Upgrade to create more shows.`} />
      )}
      
      {archivedShowsOpen && (
        <ArchivedShowsModal 
          isOpen={archivedShowsOpen} 
          onClose={() => setArchivedShowsOpen(false)}
          onShowRestored={() => {
            // Refresh the shows list when a show is restored
            window.location.reload();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default ShowsListPage; 