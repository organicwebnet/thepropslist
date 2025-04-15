import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, UserPlus, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-sm font-medium text-gray-300 mb-1">
      {children} <span className="text-primary">*</span>
    </span>
  );
}

export function AuthForm({ onClose }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return false;
    }
    
    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (mode !== 'forgot' && !trimmedPassword) {
      setError('Please enter your password');
      return false;
    }

    if (mode === 'signup' && trimmedPassword.length < 6) {
      setError('Password should be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Password reset email sent! Please check your inbox.');
      setEmail('');
    } catch (error: any) {
      let message = 'Failed to send reset email. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        default:
          console.error('Password reset error:', error);
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
      onClose();
    } catch (error: any) {
      const firebaseError = error as AuthError;
      let message = 'An error occurred. Please try again.';
      
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters long.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/password sign up is not enabled. Please contact support.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        default:
          console.error('Auth error:', error);
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          {mode === 'forgot' ? (
            <div className="flex items-center">
              <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                }}
                className="mr-3 text-gray-400 hover:text-gray-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-bold gradient-text">Reset Password</h2>
            </div>
          ) : (
            <h2 className="text-2xl font-bold gradient-text">
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
              {success}
            </div>
          )}

          <div>
            <RequiredLabel>Email</RequiredLabel>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <RequiredLabel>Password</RequiredLabel>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-medium text-white hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </>
            ) : mode === 'forgot' ? (
              'Send Reset Link'
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </>
            )}
          </button>

          <div className="text-center space-y-2">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-sm text-primary hover:text-primary/80"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signup' ? 'signin' : 'signup');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccess(null);
                      setPassword('');
                    }}
                    className="block w-full text-sm text-primary hover:text-primary/80"
                  >
                    Forgot your password?
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}