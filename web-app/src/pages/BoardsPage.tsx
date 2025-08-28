import React, { useState, useEffect } from "react";
import DashboardLayout from "../PropsBibleHomepage";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useFirebase } from "../contexts/FirebaseContext";
import type { BoardData } from "../types/taskManager";
import Board from "../components/TaskBoard/Board";
import { useShowSelection } from "../contexts/ShowSelectionContext";
import type { Show } from "../types/Show";
import { useWebAuth } from '../contexts/WebAuthContext';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShowSelectionProvider } from "../contexts/ShowSelectionContext";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import EditPropPage from "../pages/EditPropPage";
import PropDetailPage from "../pages/PropDetailPage";
import PropsListPage from '../PropsListPage';
import DashboardHome from '../DashboardHome';
import ShowsListPage from '../ShowsListPage';
import AddShowPage from "../pages/AddShowPage";
import EditShowPage from "../pages/EditShowPage";
import ShowDetailPage from "../pages/ShowDetailPage";
import PropsBibleHomepage from '../PropsBibleHomepage';

const BoardsPage: React.FC = () => {
  const { service } = useFirebase();
  const [showForm, setShowForm] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const { currentShowId } = useShowSelection();
  const [showTitle, setShowTitle] = useState<string>("");
  const { user } = useWebAuth();

  console.log("[BoardsPage] currentShowId:", currentShowId);
  console.log("[BoardsPage] Current user:", user);

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
        const filteredBoards = mappedBoards.filter(b => !currentShowId || b.showId === currentShowId);
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
    let unsub: (() => void) | undefined;
    unsub = service.listenToDocument<Show>(
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
      // Create a new board in Firestore
      await service.addDocument("boards", {
        title: boardName,
        listIds: [],
        createdAt: new Date(),
      });
      setBoardName("");
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShowSelectionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path="/props/:id/edit" element={user ? <EditPropPage /> : <Navigate to="/login" replace />} />
          <Route path="/props/:id" element={user ? <PropDetailPage /> : <Navigate to="/login" replace />} />
          <Route path="/props" element={user ? <PropsListPage /> : <Navigate to="/login" replace />} />
          <Route path="/" element={user ? <DashboardHome /> : <Navigate to="/login" replace />} />
          <Route path="/shows" element={<ShowsListPage />} />
          <Route path="/shows/new" element={<AddShowPage />} />
          <Route path="/shows/:id/edit" element={<EditShowPage />} />
          <Route path="/shows/:id" element={<ShowDetailPage />} />
          <Route path="/boards" element={user ? <BoardsPageContent /> : <Navigate to="/login" replace />} />
          <Route path="/*" element={user ? <PropsBibleHomepage>{<DashboardHome />}</PropsBibleHomepage> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ShowSelectionProvider>
  );
};

function BoardsPageContent() {
  const { service } = useFirebase();
  const [showForm, setShowForm] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const { currentShowId } = useShowSelection();
  const [showTitle, setShowTitle] = useState<string>("");
  const { user } = useWebAuth();

  console.log("[BoardsPage] currentShowId:", currentShowId);
  console.log("[BoardsPage] Current user:", user);

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
        const filteredBoards = mappedBoards.filter(b => !currentShowId || b.showId === currentShowId);
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
    let unsub: (() => void) | undefined;
    unsub = service.listenToDocument<Show>(
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
      // Create a new board in Firestore
      await service.addDocument("boards", {
        title: boardName,
        listIds: [],
        createdAt: new Date(),
      });
      setBoardName("");
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {!selectedBoardId ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mt-8"
        >
          <div className="flex items-center mb-6 justify-center relative">
            <div className="w-10 h-10 bg-pb-primary/20 rounded-lg flex items-center justify-center mr-4 absolute left-0">
              <Calendar className="w-6 h-6 text-pb-primary" />
            </div>
            <div className="flex-1 flex flex-col items-center">
              <h1 className="text-2xl font-bold text-white">Task Boards</h1>
              <p className="text-pb-primary text-lg font-semibold mt-1">{showTitle || "No show selected"}</p>
              <p className="text-sm text-pb-gray">Organize your work with Kanban-style boards</p>
            </div>
          </div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { scale: 0.95, opacity: 0 },
              visible: { scale: 1, opacity: 1, transition: { duration: 0.4 } }
            }}
            whileHover="hover"
            className="rounded-xl bg-pb-primary/10 border border-pb-primary/20 p-8 flex flex-col items-center justify-center shadow-lg min-h-[200px] w-full"
          >
            {boards.length === 0 && (
              <>
                <p className="text-lg text-pb-gray mb-2">Your Kanban boards will appear here.</p>
                <p className="text-sm text-pb-gray mb-4">Create a new board to get started!</p>
              </>
            )}
            <div className="flex flex-wrap gap-4 justify-center w-full mb-4">
              {boards.map(board => (
                <button
                  key={board.id}
                  className={`bg-pb-darker border border-pb-primary/30 rounded-lg px-6 py-4 text-white font-semibold shadow hover:bg-pb-primary/20 transition w-64 text-left ${selectedBoardId === board.id ? 'ring-2 ring-pb-primary' : ''}`}
                  onClick={() => setSelectedBoardId(board.id)}
                >
                  <div className="text-lg font-bold mb-1">{board.title}</div>
                  <div className="text-xs text-pb-gray">{(board.listIds?.length || 0)} lists</div>
                </button>
              ))}
            </div>
            <button
              className="bg-pb-primary text-white px-4 py-2 rounded hover:bg-pb-secondary transition mb-2"
              onClick={() => setShowForm(v => !v)}
            >
              {showForm ? "Cancel" : "Create Board"}
            </button>
            {showForm && (
              <form onSubmit={handleCreateBoard} className="flex flex-col items-center w-full max-w-xs mt-2">
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
                  {loading ? "Creating..." : "Create"}
                </button>
                {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
              </form>
            )}
          </motion.div>
        </motion.div>
      ) : (
          <Board boardId={selectedBoardId} />
      )}
    </DashboardLayout>
  );
}

export default BoardsPageContent; 