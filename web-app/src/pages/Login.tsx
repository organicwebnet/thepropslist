import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { signIn, signInWithGoogle, signInWithApple, loading, error, clearError, user } = useWebAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [showPasswordResetMessage, setShowPasswordResetMessage] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      setDebugInfo('Login successful! Redirecting...');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    }
  }, [user, navigate, from]);

  // Check if user just came from password reset
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('reset') === 'success') {
      setShowPasswordResetMessage(true);
      // Clear the URL parameter
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  function getFriendlyErrorMessage(err: any): string {
    if (!err) return '';
    const code = err.code || err.message || '';
    if (typeof code !== 'string') return 'An unknown error occurred. Please try again.';
    if (code.includes('auth/invalid-email')) return 'Invalid email address. Please check and try again.';
    if (code.includes('auth/user-not-found')) return 'No account found with this email. Please sign up or check your email.';
    if (code.includes('auth/invalid-credential')) return 'Invalid email address or account not found. Please check your email and try again.';
    if (code.includes('auth/wrong-password')) return 'Incorrect password. If you just reset your password, please use your NEW password. Otherwise, try resetting your password.';
    if (code.includes('auth/too-many-requests')) return 'Too many failed attempts. Please wait a moment and try again.';
    if (code.includes('auth/popup-closed-by-user')) return 'Google sign-in was cancelled.';
    if (code.includes('auth/network-request-failed')) return 'Network error. Please check your connection and try again.';
    if (code.includes('auth/internal-error')) return 'Internal error. Please try again.';
    if (code.includes('auth/popup-blocked')) return 'Popup was blocked. Please allow popups and try again.';
    if (code.includes('auth/account-exists-with-different-credential')) return 'An account already exists with this email using a different sign-in method.';
    if (code.includes('auth/user-disabled')) return 'This account has been disabled. Please contact support.';
    return 'Sign in failed. Please check your email and password, or try resetting your password.';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setShowPasswordResetMessage(false); // Clear password reset message when attempting to sign in
    setDebugInfo('Starting authentication...');
    if (!email || !password) {
      setDebugInfo('Please enter both email and password.');
      return;
    }
    try {
      await signIn(email, password);
      setDebugInfo('Sign in successful! Redirecting...');
    } catch (err: any) {
      setDebugInfo(getFriendlyErrorMessage(err));
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setDebugInfo('Starting Google authentication...');
    try {
      await signInWithGoogle();
      setDebugInfo('Google sign in successful! Redirecting...');
    } catch (err: any) {
      setDebugInfo(getFriendlyErrorMessage(err));
    }
  };

  const handleAppleSignIn = async () => {
    clearError();
    setDebugInfo('Starting Apple authentication...');
    try {
      await signInWithApple();
      setDebugInfo('Apple sign in successful! Redirecting...');
    } catch (err: any) {
      setDebugInfo(getFriendlyErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Overlay for extra contrast */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Ccircle cx='40' cy='40' r='2'/%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3Ccircle cx='60' cy='20' r='1'/%3E%3Ccircle cx='20' cy='60' r='1'/%3E%3Ccircle cx='60' cy='60' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        
        {/* Main Form Card */}
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <img 
                        src="/thepropslist_logo_v1.svg" 
                        alt="The Props List Logo" 
                        className="w-16 h-16"
                    />
                    <h1 className="text-3xl font-bold text-white">The Props List</h1>
                </div>
                <p className="text-white/80 text-sm font-medium">Theater Props Management Tool</p>
            </div>
            {/* Debug Info */}
            {debugInfo && (
              <div className={`mb-6 p-4 rounded-xl backdrop-blur-sm ${
                debugInfo.includes('successful') || debugInfo.includes('Redirecting') 
                  ? 'bg-emerald-500/20 border border-emerald-300/30' 
                  : 'bg-blue-500/20 border border-blue-300/30'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    debugInfo.includes('successful') || debugInfo.includes('Redirecting')
                      ? 'bg-emerald-400 animate-pulse' 
                      : 'bg-blue-400'
                  }`}></div>
                  <p className={`text-sm font-medium ${
                    debugInfo.includes('successful') || debugInfo.includes('Redirecting')
                      ? 'text-emerald-100' 
                      : 'text-blue-100'
                  }`}>{debugInfo}</p>
                </div>
              </div>
            )}
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                  <p className="text-red-100 text-sm font-medium">{getFriendlyErrorMessage(error)}</p>
                </div>
              </div>
            )}
            {/* Password Reset Success Message */}
            {showPasswordResetMessage && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-300/30 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                  <p className="text-green-100 text-sm font-medium">
                    ✅ Password reset successful! Please use your NEW password to sign in.
                  </p>
                </div>
              </div>
            )}
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-white/60 hover:text-white/90 transition-colors duration-200"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                Sign In
              </button>
            </form>
            {/* Links for sign up and forgot password */}
            <div className="flex flex-col items-center mt-6 space-y-2">
              <Link to="/signup" className="text-white hover:text-blue-200 hover:underline text-sm font-medium transition-colors">Don't have an account? Sign up</Link>
              <Link to="/forgot-password" className="text-white hover:text-blue-200 hover:underline text-sm font-medium transition-colors">Forgot password?</Link>
            </div>
            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-white/20" />
              <span className="px-4 text-white/60 text-sm">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white/80 hover:bg-white/90 transition-colors text-pb-primary font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-pb-primary/40 focus:ring-offset-2 focus:ring-offset-white/40 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <span className="inline-block w-5 h-5">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <g>
                    <path d="M21.805 10.023h-9.765v3.954h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.125s2.75-6.125 6.125-6.125c1.922 0 3.211.766 3.953 1.43l2.703-2.633c-1.711-1.57-3.93-2.539-6.656-2.539-5.508 0-9.984 4.477-9.984 9.977s4.477 9.977 9.984 9.977c5.758 0 9.57-4.055 9.57-9.766 0-.656-.07-1.164-.156-1.488z" fill="#4285F4" />
                    <path d="M3.17 6.609l3.25 2.383c.883-1.07 2.367-2.344 4.62-2.344 1.32 0 2.57.508 3.523 1.445l2.672-2.602c-1.711-1.57-3.93-2.539-6.656-2.539-3.828 0-7.07 2.344-8.672 5.719z" fill="#EA4335" />
                    <path d="M12.04 22.96c2.672 0 5.086-.883 6.781-2.406l-3.125-2.578c-.844.602-2.016 1.023-3.656 1.023-2.82 0-5.211-1.906-6.07-4.453l-3.203 2.477c1.578 3.32 5.07 5.937 9.273 5.937z" fill="#34A853" />
                    <path d="M21.805 10.023h-9.765v3.954h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.125s2.75-6.125 6.125-6.125c1.922 0 3.211.766 3.953 1.43l2.703-2.633c-1.711-1.57-3.93-2.539-6.656-2.539-5.508 0-9.984 4.477-9.984 9.977s4.477 9.977 9.984 9.977c5.758 0 9.57-4.055 9.57-9.766 0-.656-.07-1.164-.156-1.488z" fill="#4285F4" />
                    <path d="M3.17 6.609l3.25 2.383c.883-1.07 2.367-2.344 4.62-2.344 1.32 0 2.57.508 3.523 1.445l2.672-2.602c-1.711-1.57-3.93-2.539-6.656-2.539-3.828 0-7.07 2.344-8.672 5.719z" fill="#EA4335" />
                    <path d="M12.04 22.96c2.672 0 5.086-.883 6.781-2.406l-3.125-2.578c-.844.602-2.016 1.023-3.656 1.023-2.82 0-5.211-1.906-6.07-4.453l-3.203 2.477c1.578 3.32 5.07 5.937 9.273 5.937z" fill="#34A853" />
                  </g>
                </svg>
              </span>
              Sign in with Google
            </button>
            {/* Apple Sign In */}
            <button
              type="button"
              onClick={handleAppleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-black/80 hover:bg-black/90 transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-white/40 text-lg disabled:opacity-60 disabled:cursor-not-allowed mt-3"
              disabled={loading}
            >
              <span className="inline-block w-5 h-5">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </span>
              Sign in with Apple
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 