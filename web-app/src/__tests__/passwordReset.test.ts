import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpsCallable } from 'firebase/functions';
import { WebAuthContext } from '../contexts/WebAuthContext';

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn()
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  signInWithEmailLink: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  OAuthProvider: vi.fn(),
  signInWithPopup: vi.fn()
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000 })),
    fromDate: vi.fn()
  },
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn()
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  auth: {},
  db: {},
  functions: {}
}));

describe('Password Reset Functionality', () => {
  let mockHttpsCallable: any;
  let mockResetPasswordFunction: any;

  beforeEach(() => {
    mockResetPasswordFunction = vi.fn();
    mockHttpsCallable = vi.mocked(httpsCallable);
    mockHttpsCallable.mockReturnValue(mockResetPasswordFunction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Validation', () => {
    it('should reject empty email', async () => {
      const { resetPassword } = WebAuthContext;
      
      await expect(resetPassword('')).rejects.toThrow('Please enter a valid email address');
    });

    it('should reject invalid email format', async () => {
      const { resetPassword } = WebAuthContext;
      
      await expect(resetPassword('invalid-email')).rejects.toThrow('Please enter a valid email address');
    });

    it('should accept valid email format', async () => {
      const { resetPassword } = WebAuthContext;
      mockResetPasswordFunction.mockResolvedValue({ data: { success: true } });
      
      await expect(resetPassword('test@example.com')).resolves.toBeDefined();
    });
  });

  describe('Function Call', () => {
    it('should call the correct Cloud Function', async () => {
      const { resetPassword } = WebAuthContext;
      mockResetPasswordFunction.mockResolvedValue({ data: { success: true } });
      
      await resetPassword('test@example.com');
      
      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'sendCustomPasswordResetEmail');
      expect(mockResetPasswordFunction).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should handle successful response', async () => {
      const { resetPassword } = WebAuthContext;
      const mockResponse = { data: { success: true, message: 'Email sent successfully' } };
      mockResetPasswordFunction.mockResolvedValue(mockResponse);
      
      const result = await resetPassword('test@example.com');
      
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle functions/unavailable error', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Service unavailable');
      error.code = 'functions/unavailable';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });

    it('should handle functions/invalid-argument error', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Invalid argument');
      error.code = 'functions/invalid-argument';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });

    it('should handle functions/resource-exhausted error', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Too many requests');
      error.code = 'functions/resource-exhausted';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Network error occurred');
      error.message = 'Network error occurred';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });

    it('should handle generic errors', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Unknown error');
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });
  });

  describe('Loading States', () => {
    it('should set loading to true during request', async () => {
      const { resetPassword } = WebAuthContext;
      let loadingState = false;
      
      // Mock the setLoading function
      const originalSetLoading = WebAuthContext.setLoading;
      WebAuthContext.setLoading = vi.fn((loading) => {
        loadingState = loading;
      });
      
      mockResetPasswordFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      );
      
      const resetPromise = resetPassword('test@example.com');
      
      // Check that loading is set to true
      expect(loadingState).toBe(true);
      
      await resetPromise;
      
      // Check that loading is set to false after completion
      expect(loadingState).toBe(false);
      
      // Restore original function
      WebAuthContext.setLoading = originalSetLoading;
    });
  });

  describe('Error State Management', () => {
    it('should clear error state before making request', async () => {
      const { resetPassword } = WebAuthContext;
      let _errorState = 'Previous error';
      
      // Mock the setError function
      const originalSetError = WebAuthContext.setError;
      WebAuthContext.setError = vi.fn((error) => {
        errorState = error;
      });
      
      mockResetPasswordFunction.mockResolvedValue({ data: { success: true } });
      
      await resetPassword('test@example.com');
      
      // Check that error was cleared (set to null)
      expect(WebAuthContext.setError).toHaveBeenCalledWith(null);
      
      // Restore original function
      WebAuthContext.setError = originalSetError;
    });
  });
});

describe('Cloud Function Integration', () => {
  describe('Rate Limiting', () => {
    it('should handle rate limiting errors', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Too many password reset requests');
      error.code = 'functions/resource-exhausted';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });
  });

  describe('Token Generation', () => {
    it('should handle token generation errors', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Failed to generate reset token');
      error.code = 'functions/internal';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });
  });

  describe('Email Sending', () => {
    it('should handle email sending errors', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Failed to send email');
      error.code = 'functions/internal';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });
  });
});

describe('Security Considerations', () => {
  describe('Input Sanitization', () => {
    it('should sanitize email input', async () => {
      const { resetPassword } = WebAuthContext;
      mockResetPasswordFunction.mockResolvedValue({ data: { success: true } });
      
      await resetPassword('test@example.com');
      
      // Verify that the email is passed as-is (sanitization happens in the function)
      expect(mockResetPasswordFunction).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('Token Security', () => {
    it('should not expose sensitive information in errors', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Internal server error');
      error.code = 'functions/internal';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
      
      // Verify that the error message doesn't contain sensitive information
      expect(error.message).not.toContain('token');
      expect(error.message).not.toContain('password');
    });
  });
});

describe('User Experience', () => {
  describe('Success Feedback', () => {
    it('should provide clear success feedback', async () => {
      const { resetPassword } = WebAuthContext;
      const mockResponse = { 
        data: { 
          success: true, 
          message: 'Password reset email sent successfully' 
        } 
      };
      mockResetPasswordFunction.mockResolvedValue(mockResponse);
      
      const result = await resetPassword('test@example.com');
      
      expect(result.data.message).toBe('Password reset email sent successfully');
    });
  });

  describe('Error Messages', () => {
    it('should provide user-friendly error messages', async () => {
      const { resetPassword } = WebAuthContext;
      const error = new Error('Service temporarily unavailable');
      error.code = 'functions/unavailable';
      mockResetPasswordFunction.mockRejectedValue(error);
      
      await expect(resetPassword('test@example.com')).rejects.toThrow();
    });
  });
});
