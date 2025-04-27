import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  AuthError, 
  User, 
  UserCredential, 
  getRedirectResult, 
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { LogIn, UserPlus, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  onClose: () => void;
}

export type AuthMode = 'signin' | 'signup' | 'forgot';

function RequiredLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span className="block text-sm font-medium text-gray-300 mb-1.5">
      {children} <span className="text-primary">*</span>
    </span>
  );
}

export function AuthForm({ onClose }: AuthFormProps): JSX.Element {
  const { service: firebaseService, isInitialized, error: firebaseError } = useFirebase();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (firebaseError) {
      setError(`Firebase initialization failed: ${firebaseError.message}`);
    }
  }, [firebaseError]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    if (!isInitialized || !firebaseService) {
      setError("Firebase service not available. Please wait or refresh.");
      setLoading(false);
      return;
    }
    
    const auth = firebaseService.auth();
    const db = firebaseService.firestore();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, 'userProfiles', user.uid), {
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        provider: 'google.com',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      onClose();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      let errorMessage = 'Unable to sign in with Google. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Google Sign-In window closed. Please try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Multiple sign-in windows opened. Please close others and try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = `This domain (${window.location.hostname}) is not authorized for Google Sign-In. Please contact support.`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

    if (!isInitialized || !firebaseService) {
      setError("Firebase service not available.");
      return;
    }
    const auth = firebaseService.auth();

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
    
    if (!isInitialized || !firebaseService) {
      setError("Firebase service not available.");
      return;
    }
    const auth = firebaseService.auth();

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
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100]">
      {/* Dramatic stage background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/stage-background.jpg")',
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        />
        {/* Gradient overlays for depth and readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        {/* Blue atmospheric fog overlay */}
        <div className="absolute inset-0 mix-blend-color bg-blue-900/20" />
        {/* Additional lighting effect */}
        <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-transparent to-transparent opacity-20" />
      </div>

      <div className="bg-[#1A1A1A]/80 rounded-xl shadow-2xl shadow-neon-lg w-full max-w-4xl flex overflow-hidden border border-primary-neon/20 relative z-10 backdrop-blur-sm">
        {/* Left Panel */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-primary to-primary-dark p-6 sm:p-8 md:p-12 text-white hidden md:block relative overflow-hidden">
          {/* Neon glow effect */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary-neon/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-primary-neon/20 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white">The Props Bible</h1>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 text-white/90">Your complete solution for managing theater props and show inventories</p>
            
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-200">Features</h3>
              <div className="space-y-3 text-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary-neon/20 flex items-center justify-center border border-primary-neon/30">
                    <svg className="w-3 h-3 text-primary-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Comprehensive Props Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary-neon/20 flex items-center justify-center border border-primary-neon/30">
                    <svg className="w-3 h-3 text-primary-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Show Organization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary-neon/20 flex items-center justify-center border border-primary-neon/30">
                    <svg className="w-3 h-3 text-primary-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Collaborative Tools</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 bg-[#1A1A1A] relative">
          {/* Subtle neon glow for the right panel */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-neon/5 to-transparent opacity-50"></div>
          
          <div className="w-full max-w-md mx-auto relative">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              {mode === 'forgot' ? (
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="mr-3 text-gray-400 hover:text-primary-neon transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Reset Password</h2>
                </div>
              ) : (
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                </h2>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-primary-neon transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl text-gray-200 mb-2">Welcome to Props Bible</h3>
              <p className="text-sm sm:text-base text-gray-300">Manage your theater props efficiently</p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-4 sm:mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-800 rounded-lg text-white hover:border-primary-neon hover:shadow-neon transition-all duration-300 disabled:opacity-50 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-400 bg-[#1A1A1A]">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div 
                  className="p-2.5 sm:p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm"
                  dangerouslySetInnerHTML={{ __html: error }}
                />
              )}

              {success && (
                <div className="p-2.5 sm:p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-300 text-sm">
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
                  placeholder="hello@example.com"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white bg-[#0A0A0A] border border-gray-800 rounded-lg focus:ring-2 focus:ring-primary-neon/20 focus:border-primary-neon transition-all duration-300"
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
                      placeholder="Enter your password"
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white bg-[#0A0A0A] border border-gray-800 rounded-lg focus:ring-2 focus:ring-primary-neon/20 focus:border-primary-neon transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-neon transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isInitialized}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-white hover:shadow-neon border border-primary-neon/20 hover:border-primary-neon/50 focus:outline-none focus:ring-2 focus:ring-primary-neon/50 focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 transition-all duration-300"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : mode === 'signup' ? (
                  <>
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Sign Up
                  </>
                ) : mode === 'forgot' ? (
                  'Send Reset Link'
                ) : (
                  <>
                    <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Sign In
                  </>
                )}
              </button>

              <div className="text-center space-y-1.5 sm:space-y-2">
                {mode === 'forgot' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-sm text-dark-primary-neon hover:text-primary-light transition-colors"
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
                      className="text-sm text-dark-primary-neon hover:text-primary-light transition-colors"
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
                        className="block w-full text-sm text-dark-primary-neon hover:text-primary-light transition-colors"
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
      </div>
    </div>
  );
}