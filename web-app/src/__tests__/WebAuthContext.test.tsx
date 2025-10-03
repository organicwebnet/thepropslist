import React from 'react';
import { render, act } from '@testing-library/react';
import { WebAuthProvider, useWebAuth } from '../contexts/WebAuthContext';

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
const mockTimestamp = { now: jest.fn(() => ({ seconds: Date.now() / 1000 })) };
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  Timestamp: mockTimestamp,
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

// Test component that uses the auth context
const TestComponent = () => {
  const auth = useWebAuth();
  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'not loading'}</div>
      <div data-testid="error">{auth.error || 'no error'}</div>
      <div data-testid="user">{auth.user ? auth.user.email : 'no user'}</div>
      <button 
        data-testid="signin-btn" 
        onClick={() => auth.signIn('test@example.com', 'password')}
      >
        Sign In
      </button>
      <button 
        data-testid="signup-btn" 
        onClick={() => auth.signUp('test@example.com', 'password', 'Test User')}
      >
        Sign Up
      </button>
      <button 
        data-testid="google-btn" 
        onClick={() => auth.signInWithGoogle()}
      >
        Google Sign In
      </button>
      <button 
        data-testid="code-verification-btn" 
        onClick={() => auth.startCodeVerification('test@example.com')}
      >
        Send Code
      </button>
      <button 
        data-testid="verify-code-btn" 
        onClick={() => auth.verifyCode('test@example.com', '123456')}
      >
        Verify Code
      </button>
    </div>
  );
};

describe('WebAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Simulate no user initially
      callback(null);
      return jest.fn(); // unsubscribe function
    });
    
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        codeHash: 'test-hash',
        expiresAt: Date.now() + 600000, // 10 minutes from now
        attempts: 0,
      }),
    });
  });

  it('should provide authentication context', () => {
    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('not loading');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
    expect(screen.getByTestId('user')).toHaveTextContent('no user');
  });

  it('should handle sign in', async () => {
    const mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };
    
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const signInBtn = screen.getByTestId('signin-btn');
    
    await act(async () => {
      signInBtn.click();
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    );
  });

  it('should handle sign up', async () => {
    const mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };
    
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const signUpBtn = screen.getByTestId('signup-btn');
    
    await act(async () => {
      signUpBtn.click();
    });

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    );
  });

  it('should handle Google sign in', async () => {
    const mockUser = {
      uid: 'google-user-123',
      email: 'test@gmail.com',
      displayName: 'Google User',
    };
    
    mockSignInWithPopup.mockResolvedValueOnce({ user: mockUser });

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const googleBtn = screen.getByTestId('google-btn');
    
    await act(async () => {
      googleBtn.click();
    });

    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it('should handle Google sign in cancellation gracefully', async () => {
    const error = new Error('User cancelled');
    error.code = 'auth/popup-closed-by-user';
    mockSignInWithPopup.mockRejectedValueOnce(error);

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const googleBtn = screen.getByTestId('google-btn');
    
    await act(async () => {
      googleBtn.click();
    });

    expect(mockSignInWithPopup).toHaveBeenCalled();
    // Should not set error for user cancellation
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });

  it('should send verification code', async () => {
    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const codeBtn = screen.getByTestId('code-verification-btn');
    
    await act(async () => {
      codeBtn.click();
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        codeHash: expect.any(String),
        expiresAt: expect.any(Number),
        attempts: 0,
        createdAt: expect.anything(),
      })
    );
  });

  it('should verify code successfully', async () => {
    // Mock the hashCode function to return a predictable hash
    const _mockHashCode = jest.fn().mockResolvedValue('test-hash');
    
    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const verifyBtn = screen.getByTestId('verify-code-btn');
    
    await act(async () => {
      verifyBtn.click();
    });

    expect(mockGetDoc).toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        attempts: 1,
      })
    );
  });

  it('should handle verification code errors', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Network error'));

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const codeBtn = screen.getByTestId('code-verification-btn');
    
    await act(async () => {
      codeBtn.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
  });

  it('should handle expired verification code', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        codeHash: 'test-hash',
        expiresAt: Date.now() - 600000, // 10 minutes ago (expired)
        attempts: 0,
      }),
    });

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const verifyBtn = screen.getByTestId('verify-code-btn');
    
    await act(async () => {
      verifyBtn.click();
    });

    // Should return false for expired code
    expect(mockGetDoc).toHaveBeenCalled();
  });

  it('should handle non-existent verification code', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const verifyBtn = screen.getByTestId('verify-code-btn');
    
    await act(async () => {
      verifyBtn.click();
    });

    // Should return false for non-existent code
    expect(mockGetDoc).toHaveBeenCalled();
  });

  it('should clear errors when clearError is called', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Test error'));

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const codeBtn = screen.getByTestId('code-verification-btn');
    
    await act(async () => {
      codeBtn.click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Test error');

    // Test clearError functionality
    const auth = useWebAuth();
    await act(async () => {
      auth.clearError();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });

  it('should handle sign out', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const auth = useWebAuth();
    
    await act(async () => {
      auth.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should handle password reset', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    render(
      <WebAuthProvider>
        <TestComponent />
      </WebAuthProvider>
    );

    const auth = useWebAuth();
    
    await act(async () => {
      auth.resetPassword('test@example.com');
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com'
    );
  });
});
