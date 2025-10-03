import { Suspense, lazy } from 'react';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWebAuth } from './contexts/WebAuthContext';
import { ShowSelectionProvider } from './contexts/ShowSelectionContext';
import ProtectedRoute from './components/ProtectedRoute';

// Core components that are always needed
import PropsBibleHomepage from './PropsBibleHomepage';
import DashboardHome from './DashboardHome';

// Lazy load all page components for better performance
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CompleteSignup = lazy(() => import('./pages/CompleteSignup'));
const Signup = lazy(() => import('./pages/Signup'));

const PropsListPage = lazy(() => import('./PropsListPage'));
const PropDetailPage = lazy(() => import('./pages/PropDetailPage'));
const EditPropPage = lazy(() => import('./pages/EditPropPage'));
const AddPropPage = lazy(() => import('./pages/AddPropPage'));
const PropsPdfExportPage = lazy(() => import('./pages/PropsPdfExportPage'));

const ShowsListPage = lazy(() => import('./ShowsListPage'));
const ShowDetailPage = lazy(() => import('./pages/ShowDetailPage'));
const AddShowPage = lazy(() => import('./pages/AddShowPage'));
const EditShowPage = lazy(() => import('./pages/EditShowPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));

const BoardsPage = lazy(() => import('./pages/BoardsPage'));

const PackingListPage = lazy(() => import('./pages/PackingListPage'));
const PackingListDetailPage = lazy(() => import('./pages/PackingListDetailPage'));
const ContainerDetailPage = lazy(() => import('./pages/ContainerDetailPage'));
const PublicContainerPage = lazy(() => import('./pages/PublicContainerPage'));

const BrandingStudioPage = lazy(() => import('./pages/BrandingStudioPage'));
const ShoppingListPage = lazy(() => import('./pages/ShoppingListPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const PropDetailMockPage = lazy(() => import('./pages/PropDetailMockPage'));
const SubscriberStatsPage = lazy(() => import('./pages/SubscriberStatsPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
// const SubscriptionTest = lazy(() => import('../../src/components/__tests__/SubscriptionTest'));
const JoinInvitePage = lazy(() => import('./pages/JoinInvitePage'));

function App() {
  const { user } = useWebAuth();
  return (
    <ShowSelectionProvider>
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen w-full bg-gradient-to-br from-pb-darker/80 to-pb-primary/30 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
              <p className="text-pb-light text-lg">Loading...</p>
            </div>
          </div>
        }>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" replace />} />
          <Route path="/complete-signup" element={<CompleteSignup />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          {/* <Route path="/test/subscription" element={<ProtectedRoute><SubscriptionTest /></ProtectedRoute>} /> */}
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
          <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
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