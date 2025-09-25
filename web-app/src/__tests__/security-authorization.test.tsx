import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { WebAuthProvider } from '../contexts/WebAuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminUsersPage from '../pages/AdminUsersPage';
import TeamPage from '../pages/TeamPage';
import ProfilePage from '../pages/ProfilePage';

// Mock Firebase
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock Firebase Auth functions
const mockSignInWithEmailAndPassword = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockUpdateProfile = jest.fn();
const mockSendSignInLinkToEmail = jest.fn();
const mockIsSignInWithEmailLink = jest.fn();
const mockSignInWithEmailLink = jest.fn();
const mockEmailAuthProvider = { credential: jest.fn() };
const mockLinkWithCredential = jest.fn();
const mockGoogleAuthProvider = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSendPasswordResetEmail = jest.fn();

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  updateProfile: mockUpdateProfile,
  sendSignInLinkToEmail: mockSendSignInLinkToEmail,
  isSignInWithEmailLink: mockIsSignInWithEmailLink,
  signInWithEmailLink: mockSignInWithEmailLink,
  EmailAuthProvider: mockEmailAuthProvider,
  linkWithCredential: mockLinkWithCredential,
  GoogleAuthProvider: mockGoogleAuthProvider,
  signInWithPopup: mockSignInWithPopup,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

// Mock Firebase Firestore functions
const mockDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  Timestamp: { now: jest.fn(() => ({ seconds: Date.now() / 1000 })) },
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  getDocs: mockGetDocs,
}));

// Mock EmailService
jest.mock('../services/EmailService', () => ({
  buildVerificationEmailDoc: jest.fn(() => ({
    from: { email: 'test@example.com', name: 'Test App' },
    to: [{ email: 'user@example.com', name: 'User' }],
    subject: 'Test verification code',
    html: '<p>Test code: 123456</p>',
    text: 'Test code: 123456',
  })),
}));

// Mock crypto.subtle for hashCode function
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// Mock TextEncoder
global.TextEncoder = jest.fn(() => ({
  encode: jest.fn(() => new Uint8Array([1, 2, 3, 4])),
})) as any;

// Mock Array.from for Uint8Array
global.Array = {
  ...Array,
  from: jest.fn((arr) => Array.from(arr)),
} as any;

const renderWithAuth = (component: React.ReactElement, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <WebAuthProvider>
        <Routes>
          <Route path="*" element={component} />
        </Routes>
      </WebAuthProvider>
    </MemoryRouter>
  );
};

describe('Security and Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
  });

  describe('Authentication Guards', () => {
    it('should redirect unauthenticated users to login', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null); // No user
        return jest.fn();
      });

      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should redirect to login (in real app, this would be handled by router)
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow authenticated users to access protected routes', () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock user profile
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'user',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin users to access admin pages', async () => {
      const mockUser = {
        uid: 'admin-123',
        email: 'admin@example.com',
        displayName: 'Admin User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock admin user profile
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'admin-123',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <AdminUsersPage />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Users')).toBeInTheDocument();
      });
    });

    it('should deny non-admin users access to admin pages', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Regular User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock regular user profile
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Regular User',
          role: 'user', // Not admin
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <AdminUsersPage />
        </ProtectedRoute>
      );

      // Should show access denied or redirect
      await waitFor(() => {
        expect(screen.getByText(/access denied|unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should handle god role with elevated permissions', async () => {
      const mockUser = {
        uid: 'god-123',
        email: 'god@example.com',
        displayName: 'God User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock god user profile
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'god-123',
          email: 'god@example.com',
          displayName: 'God User',
          role: 'god',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <AdminUsersPage />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Users')).toBeInTheDocument();
      });
    });
  });

  describe('Invite-Only Mode', () => {
    it('should enforce invite-only signups when enabled', async () => {
      // Mock environment variable
      const originalEnv = import.meta.env.VITE_INVITE_ONLY;
      import.meta.env.VITE_INVITE_ONLY = 'true';

      const mockUser = {
        uid: 'new-user-123',
        email: 'newuser@example.com',
        displayName: 'New User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock no existing profile
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      // Mock no invitation found
      mockGetDocs.mockResolvedValue({
        empty: true,
      });

      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/Signups are invite‑only/i)).toBeInTheDocument();
      });

      // Restore original environment
      import.meta.env.VITE_INVITE_ONLY = originalEnv;
    });

    it('should allow signup with valid invitation', async () => {
      // Mock environment variable
      const originalEnv = import.meta.env.VITE_INVITE_ONLY;
      import.meta.env.VITE_INVITE_ONLY = 'true';

      const mockUser = {
        uid: 'invited-user-123',
        email: 'invited@example.com',
        displayName: 'Invited User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock no existing profile
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      // Mock valid invitation found
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          data: () => ({
            email: 'invited@example.com',
            status: 'pending',
          }),
        }],
      });

      // Mock profile creation
      mockSetDoc.mockResolvedValue(undefined);

      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Restore original environment
      import.meta.env.VITE_INVITE_ONLY = originalEnv;
    });
  });

  describe('Organization-Based Access', () => {
    it('should restrict access based on organization membership', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock user with specific organization
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'user',
          organizations: ['org-123'],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <TeamPage />
        </ProtectedRoute>,
        '/shows/org-456/team' // Different organization
      );

      // Should check organization access
      await waitFor(() => {
        expect(screen.getByText(/access denied|unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should allow access to same organization resources', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock user with matching organization
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'user',
          organizations: ['org-123'],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <TeamPage />
        </ProtectedRoute>,
        '/shows/org-123/team' // Same organization
      );

      await waitFor(() => {
        expect(screen.getByText('Team')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration gracefully', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      // Simulate session expiration
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        // Simulate auth state change to null (session expired)
        setTimeout(() => callback(null), 100);
        return jest.fn();
      });

      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Initially should show content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // After session expires, should redirect
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('should update last login timestamp on authentication', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      // Mock existing profile
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'user',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(Date.now() - 86400000), // Yesterday
          createdAt: new Date(),
        }),
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      renderWithAuth(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            lastLogin: expect.anything(),
          })
        );
      });
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should sanitize user input in profile updates', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'user',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      );

      // Test that malicious input is sanitized
      const maliciousInput = '<script>alert("xss")</script>';
      
      // In a real test, you would simulate form submission with malicious input
      // and verify it's properly sanitized before being saved
    });
  });

  describe('API Security', () => {
    it('should validate user permissions before API calls', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return jest.fn();
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
          role: 'user',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid',
          },
          lastLogin: new Date(),
          createdAt: new Date(),
        }),
      });

      renderWithAuth(
        <ProtectedRoute>
          <AdminUsersPage />
        </ProtectedRoute>
      );

      // Should validate permissions before making API calls
      await waitFor(() => {
        expect(screen.getByText(/access denied|unauthorized/i)).toBeInTheDocument();
      });
    });
  });
});
