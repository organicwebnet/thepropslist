import React, { useState, useEffect } from "react";
import DashboardLayout from "../PropsBibleHomepage";
import { motion } from "framer-motion";
import { Calendar, Gem } from "lucide-react";
import { useFirebase } from "../contexts/FirebaseContext";
import type { BoardData } from "../types/taskManager";
import Board from "../components/TaskBoard/Board";
import { useShowSelection } from "../contexts/ShowSelectionContext";
import type { Show } from "../types/Show";
import { useWebAuth } from '../contexts/WebAuthContext';
import { useSearchParams } from "react-router-dom";
import { useSubscription } from '../hooks/useSubscription';
import { useLimitChecker } from '../hooks/useLimitChecker';
import UpgradeModal from '../components/UpgradeModal';

const BoardsPage: React.FC = () => {
  return <BoardsPageContent />;
};

function BoardsPageContent() {
  const { service } = useFirebase();
  const [showForm, setShowForm] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const selectedCardId = searchParams.get('selectedCardId');
  const { currentShowId } = useShowSelection();
  const [_showTitle, setShowTitle] = useState<string>("");
  const { user } = useWebAuth();
  const { limits } = useSubscription();
  const { checkBoardLimit, checkBoardLimitForShow } = useLimitChecker();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  console.log("[BoardsPage] currentShowId:", currentShowId);
  console.log("[BoardsPage] Current user:", user);

  // Check limits on page load and when boards change
  useEffect(() => {
    const checkLimits = async () => {
      if (!user?.uid) return;
      
      try {
        // Check per-plan board limit
        const planLimitCheck = await checkBoardLimit(user.uid);
        if (!planLimitCheck.withinLimit) {
          setLimitWarning(planLimitCheck.message || 'Board limit reached');
          return;
        }

        // Check per-show board limit if show is selected
        if (currentShowId) {
          const showLimitCheck = await checkBoardLimitForShow(currentShowId);
          if (!showLimitCheck.withinLimit) {
            setLimitWarning(showLimitCheck.message || 'Show board limit reached');
            return;
          }
        }

        // Clear warning if within limits
        setLimitWarning(null);
      } catch (error) {
        console.error('Error checking board limits:', error);
        // Don't show error to user, just log it
      }
    };

    checkLimits();
  }, [user?.uid, currentShowId, boards.length, checkBoardLimit, checkBoardLimitForShow]);

  useEffect(() => {
    // Listen to boards collection, filter by showId if selected
    const unsub = service.listenToCollection<BoardData>(
      "todo_boards",
      docs => {
        console.log("[BoardsPage] Raw docs from Firestore:", docs);
        const mappedBoards = docs.map(d => ({
          ...d.data,
          id: d.id,
          title: d.data.title || d.data.name || "Untitled Board",
          listIds: d.data.listIds || [],
        }));
        console.log("[BoardsPage] currentShowId:", currentShowId);
        mappedBoards.forEach(b => console.log(`[BoardsPage] Board: ${b.title}, showId: ${b.showId}`));
        console.log("[BoardsPage] Mapped boards before filtering:", mappedBoards);
        const filteredBoards = mappedBoards.filter(b => {
          // If no show is selected, show all boards the user has access to
          if (!currentShowId) return true;
          // If a show is selected, show boards for that show OR boards without a showId (legacy boards)
          return b.showId === currentShowId || !b.showId;
        });
        console.log("[BoardsPage] Filtered boards:", filteredBoards);
        setBoards(filteredBoards);
      },
      err => setError(err.message || "Failed to load boards")
    );
    return () => unsub();
  }, [service, currentShowId]);

  useEffect(() => {
    if (!currentShowId) {
      setShowTitle("");
      return;
    }
    const unsub = service.listenToDocument<Show>(
      `shows/${currentShowId}`,
      doc => setShowTitle(doc.data?.name || ""),
      () => setShowTitle("")
    );
    return () => { if (unsub) unsub(); };
  }, [service, currentShowId]);

  useEffect(() => {
    service.getDocuments("todo_boards").then(docs => {
      console.log("[BoardsPage] Manual fetch docs:", docs);
    }).catch(err => {
      console.error("[BoardsPage] Manual fetch error:", err);
    });
  }, [service]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Check board limits before creating
      if (!user?.uid) {
        setError('You must be signed in to create boards.');
        setLoading(false);
        return;
      }

      // Check per-plan board limit
      const planLimitCheck = await checkBoardLimit(user.uid);
      if (!planLimitCheck.withinLimit) {
        setError(planLimitCheck.message || 'Board limit reached');
        setLoading(false);
        return;
      }

      // Check per-show board limit if show is selected
      if (currentShowId) {
        const showLimitCheck = await checkBoardLimitForShow(currentShowId);
        if (!showLimitCheck.withinLimit) {
          setError(showLimitCheck.message || 'Show board limit reached');
          setLoading(false);
          return;
        }
      }

      // Create a new board in Firestore
      await service.addDocument("todo_boards", {
        title: boardName,
        listIds: [],
        ownerId: user.uid,
        sharedWith: [user.uid], // User is automatically added to sharedWith
        createdAt: new Date(),
        showId: currentShowId || null, // Associate with current show if selected
      });
      setBoardName("");
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  // If there is exactly one board, auto open it. If more than one, open the first.
  const effectiveBoardId = selectedBoardId || boards[0]?.id || null;

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
              <button 
                onClick={() => setUpgradeOpen(true)}
                className="inline-block px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg font-semibold transition-colors text-sm"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {effectiveBoardId ? (
        <div className="w-full h-[calc(100vh-4.5rem)] overflow-hidden flex flex-col p-0">
          {/* Header with title, dropdown if multiple boards, and create button */}
          <div className="sticky top-0 z-20 bg-transparent px-6 pt-2 pb-2">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-pb-primary" />
                {boards.length > 1 ? (
                  <select
                    className="bg-pb-darker/50 border border-pb-primary/30 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pb-primary"
                    value={effectiveBoardId}
                    onChange={e => setSelectedBoardId(e.target.value)}
                  >
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                ) : (
                  <h1 className="text-2xl font-bold text-white">{boards[0]?.title || 'Board'}</h1>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="text-sm text-pb-gray" title={`Boards used: ${boards.length} of ${limits.boards}`}>{boards.length}/{limits.boards}</div>
                <button
                  className={`${boards.length >= limits.boards ? 'bg-pb-primary/20 text-pb-gray cursor-not-allowed' : 'bg-pb-primary text-white hover:bg-pb-secondary'} px-4 py-2 rounded transition`}
                  title={boards.length >= limits.boards ? 'Upgrade to create more boards' : 'Create a new board'}
                  onClick={() => {
                    if (boards.length >= limits.boards) { setUpgradeOpen(true); return; }
                    setShowForm(v => !v);
                  }}
                >
                  {boards.length >= limits.boards ? (<span className="inline-flex items-center gap-2"><Gem className="w-4 h-4" /> New Board</span>) : 'New Board'}
                </button>
              </div>
            </div>
            {showForm && (
              <div className="w-full px-6 pb-4 relative">
                <button
                  type="button"
                  aria-label="Close create board form"
                  title="Close"
                  className="absolute -top-2 right-4 text-pb-gray hover:text-white bg-pb-darker/60 border border-pb-primary/30 rounded-full w-7 h-7 flex items-center justify-center"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
                <form onSubmit={handleCreateBoard} className="flex items-center gap-2 max-w-md">
                  <input
                    className="flex-1 px-3 py-2 rounded border border-pb-primary/40 bg-pb-darker text-white focus:outline-none"
                    type="text"
                    placeholder="Board name"
                    value={boardName}
                    onChange={e => setBoardName(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="bg-pb-success text-white px-4 py-2 rounded hover:bg-pb-primary transition"
                    disabled={loading || !boardName.trim()}
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
                </form>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-0">
            <Board boardId={effectiveBoardId} hideHeader selectedCardId={selectedCardId} />
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto mt-8 px-4"
        >
          <div className="text-center text-pb-gray">No boards yet. Create your first board.</div>
          <div className="flex justify-center mt-4">
            <button
              className={`${boards.length >= limits.boards ? 'bg-pb-primary/20 text-pb-gray cursor-not-allowed' : 'bg-pb-primary text-white hover:bg-pb-secondary'} px-4 py-2 rounded transition`}
              title={boards.length >= limits.boards ? 'Upgrade to create more boards' : 'Create a new board'}
              onClick={() => {
                if (boards.length >= limits.boards) { setUpgradeOpen(true); return; }
                setShowForm(true);
              }}
            >
              {boards.length >= limits.boards ? (<span className="inline-flex items-center gap-2"><Gem className="w-4 h-4" /> Create Board</span>) : 'Create Board'}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleCreateBoard} className="flex flex-col items-center w-full max-w-xs mt-4 mx-auto">
              <input
                className="w-full px-3 py-2 rounded border border-pb-primary/40 mb-2 bg-pb-darker text-white focus:outline-none"
                type="text"
                placeholder="Board name"
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-pb-success text-white px-4 py-2 rounded hover:bg-pb-primary transition w-full"
                disabled={loading || !boardName.trim()}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
            </form>
          )}
        </motion.div>
      )}
      
      {upgradeOpen && (
        <UpgradeModal 
          open={upgradeOpen} 
          onClose={() => setUpgradeOpen(false)} 
        />
      )}
    </DashboardLayout>
  );
}

export default BoardsPage; 