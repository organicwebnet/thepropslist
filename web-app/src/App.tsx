import React, { Suspense, lazy } from 'react';
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
import TeamPage from './pages/TeamPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AddShowPage from './pages/AddShowPage';
import EditShowPage from './pages/EditShowPage';
import { ShowSelectionProvider } from './contexts/ShowSelectionContext';
import PropDetailPage from './pages/PropDetailPage';
import EditPropPage from './pages/EditPropPage';
import AddPropPage from './pages/AddPropPage';
const BoardsPage = lazy(() => import('./pages/BoardsPage'));
import PackingListPage from './pages/PackingListPage';
const PackingListDetailPage = lazy(() => import('./pages/PackingListDetailPage'));
const ContainerDetailPage = lazy(() => import('./pages/ContainerDetailPage'));
import PublicContainerPage from './pages/PublicContainerPage';
const PropsPdfExportPage = lazy(() => import('./pages/PropsPdfExportPage'));
const BrandingStudioPage = lazy(() => import('./pages/BrandingStudioPage'));
const ShoppingListPage = lazy(() => import('./pages/ShoppingListPage'));
import ProfilePage from './pages/ProfilePage';
import FeedbackPage from './pages/FeedbackPage';
import PropDetailMockPage from './pages/PropDetailMockPage';
import SubscriberStatsPage from './pages/SubscriberStatsPage';
import ProtectedRoute from './components/ProtectedRoute';
import JoinInvitePage from './pages/JoinInvitePage';
import CompleteSignup from './pages/CompleteSignup';

function App() {
  const { user } = useWebAuth();
  return (
    <ShowSelectionProvider>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" replace />} />
          <Route path="/complete-signup" element={<CompleteSignup />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path="/props/pdf-export" element={<ProtectedRoute><PropsPdfExportPage /></ProtectedRoute>} />
          <Route path="/branding" element={<ProtectedRoute><BrandingStudioPage /></ProtectedRoute>} />
          <Route path="/props/:id/edit" element={<ProtectedRoute><EditPropPage /></ProtectedRoute>} />
          <Route path="/props/add" element={<ProtectedRoute><AddPropPage /></ProtectedRoute>} />
          <Route path="/props/:id" element={<ProtectedRoute><PropDetailPage /></ProtectedRoute>} />
          <Route path="/props" element={<ProtectedRoute><PropsListPage /></ProtectedRoute>} />
          <Route path="/" element={user ? <DashboardHome /> : <Navigate to="/login" replace />} />
          <Route path="/shows" element={<ShowsListPage />} />
          <Route path="/shows/new" element={<AddShowPage />} />
          <Route path="/shows/:id/edit" element={<EditShowPage />} />
          <Route path="/shows/:id" element={<ShowDetailPage />} />
          <Route path="/shows/:id/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/boards" element={<ProtectedRoute><BoardsPage /></ProtectedRoute>} />
          <Route path="/join/:token" element={<JoinInvitePage />} />
          <Route path="/packing-lists" element={<ProtectedRoute><PackingListPage /></ProtectedRoute>} />
          <Route path="/packing-lists/:packListId" element={<ProtectedRoute><PackingListDetailPage /></ProtectedRoute>} />
          <Route path="/admin/subscribers" element={<ProtectedRoute><SubscriberStatsPage /></ProtectedRoute>} />
          <Route path="/packing-lists/:packListId/containers/:containerId" element={<ProtectedRoute><ContainerDetailPage /></ProtectedRoute>} />
          {/* Public container viewer: scan or link goes here */}
          <Route path="/c/:containerId" element={<PublicContainerPage />} />
          <Route path="/shopping" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
          {/* Mock preview routes for screenshots */}
          <Route path="/mock/prop-detail" element={user ? <PropDetailMockPage /> : <Navigate to="/login" replace />} />
          <Route path="/mock/prop-detail/:id" element={user ? <PropDetailMockPage /> : <Navigate to="/login" replace />} />
          <Route path="/*" element={user ? <PropsBibleHomepage>{<DashboardHome />}</PropsBibleHomepage> : <Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ShowSelectionProvider>
  );
}

export default App; 