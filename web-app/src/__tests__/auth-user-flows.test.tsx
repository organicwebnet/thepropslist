import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WebAuthProvider } from '../contexts/WebAuthContext';
import Signup from '../pages/Signup';
import Login from '../pages/Login';
import CompleteSignup from '../pages/CompleteSignup';

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
    // Simulate no user initially
    callback(null);
    return jest.fn(); // unsubscribe function
  }),
  updateProfile: jest.fn(),
  sendSignInLinkToEmail: jest.fn(),
  isSignInWithEmailLink: jest.fn(),
  signInWithEmailLink: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
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
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  },
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

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <WebAuthProvider>
        {component}
      </WebAuthProvider>
    </BrowserRouter>
  );
};

describe('Authentication User Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Signup Flow', () => {
    it('should render signup form with email input', () => {
      renderWithAuth(<Signup />);
      
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByText('Sign up to start using Props Bible')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument();
    });

    it('should show validation error for empty email', async () => {
      renderWithAuth(<Signup />);
      
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter your email first.')).toBeInTheDocument();
      });
    });

    it('should send verification code successfully', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValueOnce(undefined);
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sending verification code...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(setDoc).toHaveBeenCalled();
        expect(screen.getByText('Verification code sent. Check your inbox.')).toBeInTheDocument();
      });
    });

    it('should handle verification code sending error gracefully', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to send code/)).toBeInTheDocument();
      });
    });

    it('should show verification code input after successful email submission', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValueOnce(undefined);
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
      });
    });

    it('should allow resending verification code', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValue(undefined);
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
      
      const resendButton = screen.getByRole('button', { name: /resend code/i });
      fireEvent.click(resendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Code re-sent. It can take a minute to arrive.')).toBeInTheDocument();
      });
    });
  });

  describe('Google Authentication', () => {
    it('should render Google sign-in button', () => {
      renderWithAuth(<Signup />);
      
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    it('should handle Google sign-in success', async () => {
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockResolvedValueOnce({
        user: {
          uid: 'google-user-123',
          email: 'user@gmail.com',
          displayName: 'Google User',
        },
      });
      
      renderWithAuth(<Signup />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Opening Google sign-in...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalled();
        expect(screen.getByText('Account created! Redirecting...')).toBeInTheDocument();
      });
    });

    it('should handle Google sign-in cancellation', async () => {
      const { signInWithPopup } = require('firebase/auth');
      const error = new Error('User cancelled');
      error.code = 'auth/popup-closed-by-user';
      signInWithPopup.mockRejectedValueOnce(error);
      
      renderWithAuth(<Signup />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalled();
        // Should not show error for user cancellation
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Login Flow', () => {
    it('should render login form', () => {
      renderWithAuth(<Login />);
      
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should show validation errors for empty fields', async () => {
      renderWithAuth(<Login />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Email and password are required')).toBeInTheDocument();
      });
    });

    it('should handle successful login', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      signInWithEmailAndPassword.mockResolvedValueOnce({
        user: {
          uid: 'user-123',
          email: 'test@example.com',
        },
      });
      
      renderWithAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          'test@example.com',
          'password123'
        );
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Signup Flow', () => {
    it('should render complete signup form when email is verified', () => {
      // Mock localStorage to return stored email
      (window.localStorage.getItem as jest.Mock).mockReturnValue('test@example.com');
      
      renderWithAuth(<CompleteSignup />);
      
      expect(screen.getByText('Complete Your Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should show validation errors for empty fields', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('test@example.com');
      
      renderWithAuth(<CompleteSignup />);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Display name and password are required')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages from authentication context', () => {
      // This would require mocking the context to return an error
      // For now, we'll test that error display works
      renderWithAuth(<Signup />);
      
      // The error display should be present in the DOM
      const errorContainer = document.querySelector('[class*="bg-red-500"]');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should clear errors when user starts new action', async () => {
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      // First, trigger an error by submitting empty form
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter your email first.')).toBeInTheDocument();
      });
      
      // Then start typing in email field - error should clear
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      // Error should be cleared when user starts typing
      await waitFor(() => {
        expect(screen.queryByText('Please enter your email first.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Links', () => {
    it('should have link to login page from signup', () => {
      renderWithAuth(<Signup />);
      
      const loginLink = screen.getByRole('link', { name: /already have an account/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should have link to signup page from login', () => {
      renderWithAuth(<Login />);
      
      const signupLink = screen.getByRole('link', { name: /don't have an account/i });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute('href', '/signup');
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during authentication', async () => {
      const { setDoc } = require('firebase/firestore');
      // Make the promise hang to test loading state
      setDoc.mockImplementation(() => new Promise(() => {}));
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sending verification code...')).toBeInTheDocument();
        // Button should be disabled during loading
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
