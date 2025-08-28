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
import AddPropPage from './pages/AddPropPage';
import BoardsPage from './pages/BoardsPage';
import PackingListPage from './pages/PackingListPage';
import PackingListDetailPage from './pages/PackingListDetailPage';
import ContainerDetailPage from './pages/ContainerDetailPage';
import PropsPdfExportPage from './pages/PropsPdfExportPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ProfilePage from './pages/ProfilePage';
import FeedbackPage from './pages/FeedbackPage';
import PropDetailMockPage from './pages/PropDetailMockPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user } = useWebAuth();
  return (
    <ShowSelectionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path="/props/pdf-export" element={<ProtectedRoute><PropsPdfExportPage /></ProtectedRoute>} />
          <Route path="/props/:id/edit" element={<ProtectedRoute><EditPropPage /></ProtectedRoute>} />
          <Route path="/props/add" element={<ProtectedRoute><AddPropPage /></ProtectedRoute>} />
          <Route path="/props/:id" element={<ProtectedRoute><PropDetailPage /></ProtectedRoute>} />
          <Route path="/props" element={<ProtectedRoute><PropsListPage /></ProtectedRoute>} />
          <Route path="/" element={user ? <DashboardHome /> : <Navigate to="/login" replace />} />
          <Route path="/shows" element={<ShowsListPage />} />
          <Route path="/shows/new" element={<AddShowPage />} />
          <Route path="/shows/:id/edit" element={<EditShowPage />} />
          <Route path="/shows/:id" element={<ShowDetailPage />} />
          <Route path="/boards" element={<ProtectedRoute><BoardsPage /></ProtectedRoute>} />
          <Route path="/packing-lists" element={<ProtectedRoute><PackingListPage /></ProtectedRoute>} />
          <Route path="/packing-lists/:packListId" element={<ProtectedRoute><PackingListDetailPage /></ProtectedRoute>} />
          <Route path="/packing-lists/:packListId/containers/:containerId" element={<ProtectedRoute><ContainerDetailPage /></ProtectedRoute>} />
          <Route path="/shopping" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
          {/* Mock preview routes for screenshots */}
          <Route path="/mock/prop-detail" element={user ? <PropDetailMockPage /> : <Navigate to="/login" replace />} />
          <Route path="/mock/prop-detail/:id" element={user ? <PropDetailMockPage /> : <Navigate to="/login" replace />} />
          <Route path="/*" element={user ? <PropsBibleHomepage>{<DashboardHome />}</PropsBibleHomepage> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ShowSelectionProvider>
  );
}

export default App; 