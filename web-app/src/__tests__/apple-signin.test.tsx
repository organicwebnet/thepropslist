import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WebAuthProvider } from '../contexts/WebAuthContext';
import Signup from '../pages/Signup';
import Login from '../pages/Login';

// Mock Firebase Auth
const mockSignInWithPopup = jest.fn();
const mockOAuthProvider = jest.fn();
const mockUpdateProfile = jest.fn();

jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithPopup: mockSignInWithPopup,
  OAuthProvider: mockOAuthProvider,
  updateProfile: mockUpdateProfile,
}));

// Mock Firebase
jest.mock('../firebase', () => ({
  auth: {},
  db: {},
}));

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <WebAuthProvider>
        {component}
      </WebAuthProvider>
    </BrowserRouter>
  );
};

describe('Apple Sign-In Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful Apple Sign-In
    mockOAuthProvider.mockImplementation(() => ({
      addScope: jest.fn(),
    }));
    
    mockSignInWithPopup.mockResolvedValue({
      user: {
        uid: 'apple-user-123',
        email: 'user@privaterelay.appleid.com',
        displayName: 'Apple User',
        providerData: [{ providerId: 'apple.com' }],
      },
      additionalUserInfo: {
        profile: {
          name: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
    });
  });

  describe('Signup Page', () => {
    it('should render Apple sign-in button', () => {
      renderWithAuth(<Signup />);
      
      expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
    });

    it('should handle Apple sign-in success', async () => {
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Opening Apple sign-in...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        expect(screen.getByText('Account created! Redirecting...')).toBeInTheDocument();
      });
    });

    it('should handle Apple sign-in cancellation gracefully', async () => {
      const error = new Error('User cancelled');
      error.code = 'auth/cancelled-popup-request';
      mockSignInWithPopup.mockRejectedValueOnce(error);
      
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        // Should not show error for user cancellation
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });

    it('should handle Apple private email relay', async () => {
      mockSignInWithPopup.mockResolvedValueOnce({
        user: {
          uid: 'apple-user-123',
          email: 'user@privaterelay.appleid.com',
          displayName: 'Apple User',
        },
        additionalUserInfo: {
          profile: {
            name: {
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        },
      });
      
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'user@privaterelay.appleid.com',
          }),
          { displayName: 'John Doe' }
        );
      });
    });
  });

  describe('Login Page', () => {
    it('should render Apple sign-in button', () => {
      renderWithAuth(<Login />);
      
      expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
    });

    it('should handle Apple sign-in success', async () => {
      renderWithAuth(<Login />);
      
      const appleButton = screen.getByRole('button', { name: /sign in with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Starting Apple authentication...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        expect(screen.getByText('Apple sign in successful! Redirecting...')).toBeInTheDocument();
      });
    });

    it('should handle Apple sign-in errors', async () => {
      const error = new Error('Apple authentication failed');
      mockSignInWithPopup.mockRejectedValueOnce(error);
      
      renderWithAuth(<Login />);
      
      const appleButton = screen.getByRole('button', { name: /sign in with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        expect(screen.getByText('Apple authentication failed')).toBeInTheDocument();
      });
    });
  });

  describe('Apple Sign-In Provider Configuration', () => {
    it('should configure OAuth provider with correct scopes', async () => {
      const mockProvider = {
        addScope: jest.fn(),
      };
      mockOAuthProvider.mockReturnValue(mockProvider);
      
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(mockOAuthProvider).toHaveBeenCalledWith('apple.com');
        expect(mockProvider.addScope).toHaveBeenCalledWith('email');
        expect(mockProvider.addScope).toHaveBeenCalledWith('name');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle popup closed by user', async () => {
      const error = new Error('Popup closed by user');
      error.code = 'auth/popup-closed-by-user';
      mockSignInWithPopup.mockRejectedValueOnce(error);
      
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        // Should not show error for popup closed
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      error.code = 'auth/network-request-failed';
      mockSignInWithPopup.mockRejectedValueOnce(error);
      
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      fireEvent.click(appleButton);
      
      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for Apple sign-in button', () => {
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      expect(appleButton).toBeInTheDocument();
      expect(appleButton).toHaveAttribute('type', 'button');
    });

    it('should be keyboard navigable', () => {
      renderWithAuth(<Signup />);
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i });
      appleButton.focus();
      expect(appleButton).toHaveFocus();
    });
  });
});
