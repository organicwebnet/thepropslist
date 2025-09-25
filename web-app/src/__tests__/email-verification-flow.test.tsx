import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WebAuthProvider } from '../contexts/WebAuthContext';
import Signup from '../pages/Signup';

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
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  Timestamp: { now: jest.fn(() => ({ seconds: Date.now() / 1000 })) },
  collection: mockCollection,
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

describe('Email Verification Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        codeHash: 'test-hash',
        expiresAt: Date.now() + 600000, // 10 minutes from now
        attempts: 0,
      }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  describe('Step 1: Email Input', () => {
    it('should start with email input step', () => {
      renderWithAuth(<Signup />);
      
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument();
      expect(screen.queryByText('Enter verification code')).not.toBeInTheDocument();
    });

    it('should validate email format', async () => {
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);
      
      // HTML5 validation should prevent submission
      expect(emailInput).toBeInvalid();
    });

    it('should accept valid email and proceed to code step', async () => {
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sending verification code...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument(); // Email should be displayed
      });
    });
  });

  describe('Step 2: Verification Code Input', () => {
    beforeEach(async () => {
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
    });

    it('should show verification code input with proper formatting', () => {
      const codeInput = screen.getByPlaceholderText('123456');
      expect(codeInput).toBeInTheDocument();
      expect(codeInput).toHaveAttribute('inputMode', 'numeric');
      expect(codeInput).toHaveAttribute('pattern', '[0-9]{6}');
    });

    it('should only accept numeric input and limit to 6 digits', () => {
      const codeInput = screen.getByPlaceholderText('123456');
      
      // Test non-numeric input
      fireEvent.change(codeInput, { target: { value: 'abc123' } });
      expect(codeInput).toHaveValue('123');
      
      // Test more than 6 digits
      fireEvent.change(codeInput, { target: { value: '1234567' } });
      expect(codeInput).toHaveValue('123456');
    });

    it('should allow changing email address', () => {
      const changeEmailBtn = screen.getByRole('button', { name: /change email/i });
      expect(changeEmailBtn).toBeInTheDocument();
      
      fireEvent.click(changeEmailBtn);
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.queryByText('Enter verification code')).not.toBeInTheDocument();
    });

    it('should show resend functionality with cooldown', async () => {
      const resendBtn = screen.getByRole('button', { name: /resend code/i });
      expect(resendBtn).toBeInTheDocument();
      
      // Click resend
      fireEvent.click(resendBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Resending verification code...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Code re-sent. It can take a minute to arrive.')).toBeInTheDocument();
      });
      
      // Button should be disabled during cooldown
      expect(resendBtn).toBeDisabled();
    });

    it('should handle successful code verification', async () => {
      const codeInput = screen.getByPlaceholderText('123456');
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });
      
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Email verified. Create your password.')).toBeInTheDocument();
      });
    });

    it('should handle invalid verification code', async () => {
      // Mock invalid code response
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          codeHash: 'different-hash',
          expiresAt: Date.now() + 600000,
          attempts: 0,
        }),
      });
      
      const codeInput = screen.getByPlaceholderText('123456');
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });
      
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid or expired code. Please try again or resend.')).toBeInTheDocument();
      });
    });

    it('should handle expired verification code', async () => {
      // Mock expired code
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          codeHash: 'test-hash',
          expiresAt: Date.now() - 600000, // 10 minutes ago
          attempts: 0,
        }),
      });
      
      const codeInput = screen.getByPlaceholderText('123456');
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });
      
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid or expired code. Please try again or resend.')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Password Creation', () => {
    beforeEach(async () => {
      renderWithAuth(<Signup />);
      
      // Go through email and code verification steps
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
      
      const codeInput = screen.getByPlaceholderText('123456');
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });
      
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Email verified. Create your password.')).toBeInTheDocument();
      });
    });

    it('should show password creation form', () => {
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const submitBtn = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('All fields are required')).toBeInTheDocument();
      });
    });

    it('should create account with valid data', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: {
          uid: 'user-123',
          email: 'test@example.com',
        },
      });
      
      const displayNameInput = screen.getByLabelText(/display name/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /create account/i });
      
      fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Creating account...')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          'test@example.com',
          'password123'
        );
        expect(screen.getByText('Account created! Redirecting...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during code sending', async () => {
      mockSetDoc.mockRejectedValueOnce(new Error('Network error'));
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to send code: Unknown error - Network error')).toBeInTheDocument();
      });
    });

    it('should handle email service errors gracefully', async () => {
      // Mock email service failure but code storage success
      mockSetDoc
        .mockResolvedValueOnce(undefined) // Code storage succeeds
        .mockRejectedValueOnce(new Error('Email service error')); // Email sending fails
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      // Should still proceed to code step even if email fails
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
    });

    it('should handle verification code database errors', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Database error'));
      
      renderWithAuth(<Signup />);
      
      // Go to code verification step
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
      
      const codeInput = screen.getByPlaceholderText('123456');
      const verifyBtn = screen.getByRole('button', { name: /verify code/i });
      
      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid or expired code. Please try again or resend.')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('should show helpful instructions', () => {
      renderWithAuth(<Signup />);
      
      expect(screen.getByText('Sign up to start using Props Bible')).toBeInTheDocument();
    });

    it('should show email delivery instructions', async () => {
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/If the email hasn't arrived, check your Spam\/Junk folder/)).toBeInTheDocument();
    });

    it('should maintain email address across steps', async () => {
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should show loading states appropriately', async () => {
      // Make setDoc hang to test loading state
      mockSetDoc.mockImplementation(() => new Promise(() => {}));
      
      renderWithAuth(<Signup />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send verification code/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Sending verification code...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
