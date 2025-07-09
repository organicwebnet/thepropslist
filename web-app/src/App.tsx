import React from 'react';
import PropsBibleHomepage from './PropsBibleHomepage';
import PropsListPage from './PropsListPage';
import DashboardHome from './DashboardHome';
import ShowsListPage from './ShowsListPage';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import { useWebAuth } from './contexts/WebAuthContext';
import ShowDetailPage from './pages/ShowDetailPage';
import AddShowPage from './pages/AddShowPage';
import EditShowPage from './pages/EditShowPage';
import { ShowSelectionProvider } from './contexts/ShowSelectionContext';
import PropDetailPage from './pages/PropDetailPage';
import EditPropPage from './pages/EditPropPage';
import BoardsPage from './pages/BoardsPage';
import PackingListPage from './pages/PackingListPage';
import PackingListDetailPage from './pages/PackingListDetailPage';

function App() {
  const { user, loading } = useWebAuth();
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white text-xl">Loading...</div>;
  }
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
          <Route path="/boards" element={user ? <BoardsPage /> : <Navigate to="/login" replace />} />
          <Route path="/packing-lists" element={user ? <PackingListPage /> : <Navigate to="/login" replace />} />
          <Route path="/packing-lists/:packListId" element={user ? <PackingListDetailPage /> : <Navigate to="/login" replace />} />
          <Route path="/*" element={user ? <PropsBibleHomepage>{<DashboardHome />}</PropsBibleHomepage> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ShowSelectionProvider>
  );
}

export default App; 