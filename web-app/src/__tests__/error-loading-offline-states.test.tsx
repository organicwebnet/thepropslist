import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WebAuthProvider } from '../contexts/WebAuthContext';
import { FirebaseProvider } from '../contexts/FirebaseContext';
import ShowsListPage from '../ShowsListPage';
import PublicContainerPage from '../pages/PublicContainerPage';
import ProtectedRoute from '../components/ProtectedRoute';

// Mock Firebase
jest.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock Firebase Auth functions
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
  updateProfile: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  isSignInWithEmailLink: jest.fn(),
  signInWithEmailLink: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  linkWithCredential: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: { now: jest.fn(() => ({ seconds: Date.now() / 1000 })) },
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
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

// Mock WebFirebaseService
jest.mock('../services/WebFirebaseService', () => ({
  WebFirebaseService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    listenToCollection: jest.fn(() => jest.fn()), // unsubscribe function
    addDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    offline: jest.fn(() => ({
      enableSync: jest.fn(),
      disableSync: jest.fn(),
      getSyncStatus: jest.fn().mockResolvedValue(false),
    })),
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <WebAuthProvider>
        <FirebaseProvider>
          {component}
        </FirebaseProvider>
      </WebAuthProvider>
    </BrowserRouter>
  );
};

describe('Error, Loading, and Offline States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading state in ShowsListPage while fetching data', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      
      // Mock service to hang on listenToCollection
      mockService.listenToCollection.mockImplementation(() => {
        // Don't call the callback immediately to simulate loading
        return jest.fn();
      });

      renderWithProviders(<ShowsListPage />);

      // Should show loading state initially
      expect(screen.getByText('Loading shows...')).toBeInTheDocument();
    });

    it('should show loading state in PublicContainerPage while fetching', async () => {
      // Mock fetch to hang
      global.fetch = jest.fn(() => new Promise(() => {}));

      renderWithProviders(<PublicContainerPage />);

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('should show loading state in ProtectedRoute while auth is loading', () => {
      const { onAuthStateChanged } = require('firebase/auth');
      
      // Mock auth state to hang
      onAuthStateChanged.mockImplementation(() => jest.fn());

      renderWithProviders(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Should render nothing while loading (as per ProtectedRoute implementation)
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error state in ShowsListPage when Firebase fails', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      
      // Mock service to call error callback
      mockService.listenToCollection.mockImplementation((collection, callback, onError) => {
        setTimeout(() => {
          onError(new Error('Firebase connection failed'));
        }, 100);
        return jest.fn();
      });

      renderWithProviders(<ShowsListPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load shows/)).toBeInTheDocument();
        expect(screen.getByText(/Firebase connection failed/)).toBeInTheDocument();
      });
    });

    it('should show error state in PublicContainerPage when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      renderWithProviders(<PublicContainerPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show error state in PublicContainerPage when container not found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      renderWithProviders(<PublicContainerPage />);

      await waitFor(() => {
        expect(screen.getByText('Not found.')).toBeInTheDocument();
      });
    });

    it('should show Firebase initialization error', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      WebFirebaseService.mockImplementation(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('Firebase init failed')),
        listenToCollection: jest.fn(),
        addDocument: jest.fn(),
        getDocument: jest.fn(),
        updateDocument: jest.fn(),
        deleteDocument: jest.fn(),
        offline: jest.fn(() => ({
          enableSync: jest.fn(),
          disableSync: jest.fn(),
          getSyncStatus: jest.fn().mockResolvedValue(false),
        })),
      }));

      renderWithProviders(<ShowsListPage />);

      await waitFor(() => {
        expect(screen.getByText(/Firebase Initialization Error/)).toBeInTheDocument();
        expect(screen.getByText(/Firebase init failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state in ShowsListPage when no shows exist', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      
      // Mock service to return empty array
      mockService.listenToCollection.mockImplementation((collection, callback) => {
        setTimeout(() => {
          callback([]);
        }, 100);
        return jest.fn();
      });

      renderWithProviders(<ShowsListPage />);

      await waitFor(() => {
        expect(screen.getByText('No shows found.')).toBeInTheDocument();
      });
    });
  });

  describe('Offline States', () => {
    it('should handle offline sync status', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      const mockOffline = {
        enableSync: jest.fn(),
        disableSync: jest.fn(),
        getSyncStatus: jest.fn().mockResolvedValue(true), // Simulate offline
      };
      
      mockService.offline.mockReturnValue(mockOffline);

      renderWithProviders(<ShowsListPage />);

      // Should be able to call offline methods
      expect(mockService.offline).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      
      // Mock service to simulate network error
      mockService.listenToCollection.mockImplementation((collection, callback, onError) => {
        setTimeout(() => {
          onError(new Error('Network request failed'));
        }, 100);
        return jest.fn();
      });

      renderWithProviders(<ShowsListPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load shows/)).toBeInTheDocument();
        expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after error in ShowsListPage', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      let callCount = 0;
      
      mockService.listenToCollection.mockImplementation((collection, callback, onError) => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          setTimeout(() => {
            onError(new Error('First attempt failed'));
          }, 100);
        } else {
          // Second call succeeds
          setTimeout(() => {
            callback([{ id: '1', data: { name: 'Test Show' } }]);
          }, 100);
        }
        return jest.fn();
      });

      renderWithProviders(<ShowsListPage />);

      // Wait for first error
      await waitFor(() => {
        expect(screen.getByText(/First attempt failed/)).toBeInTheDocument();
      });

      // Simulate retry by re-rendering (in real app, this would be triggered by user action)
      renderWithProviders(<ShowsListPage />);

      // Should eventually show success
      await waitFor(() => {
        expect(screen.getByText('Test Show')).toBeInTheDocument();
      });
    });
  });

  describe('Error Message Quality', () => {
    it('should show user-friendly error messages', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      
      mockService.listenToCollection.mockImplementation((collection, callback, onError) => {
        setTimeout(() => {
          onError(new Error('Permission denied'));
        }, 100);
        return jest.fn();
      });

      renderWithProviders(<ShowsListPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load shows/)).toBeInTheDocument();
        expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
        expect(screen.getByText(/Please check your network connection and Firebase permissions/)).toBeInTheDocument();
      });
    });

    it('should show appropriate error for different error types', async () => {
      const { WebFirebaseService } = require('../services/WebFirebaseService');
      const mockService = new WebFirebaseService();
      
      // Test different error scenarios
      const errorScenarios = [
        { error: new Error('Network error'), expectedText: 'Network error' },
        { error: new Error('Permission denied'), expectedText: 'Permission denied' },
        { error: new Error('Service unavailable'), expectedText: 'Service unavailable' },
      ];

      for (const scenario of errorScenarios) {
        mockService.listenToCollection.mockImplementation((collection, callback, onError) => {
          setTimeout(() => {
            onError(scenario.error);
          }, 100);
          return jest.fn();
        });

        const { unmount } = renderWithProviders(<ShowsListPage />);

        await waitFor(() => {
          expect(screen.getByText(scenario.expectedText)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });
});
