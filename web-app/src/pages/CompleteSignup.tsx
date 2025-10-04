import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { Loader2, Lock, User } from 'lucide-react';

export default function CompleteSignup() {
  const { isEmailLinkInUrl, completeEmailVerification, finalizeSignup, loading, error, clearError, user } = useWebAuth();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = window.localStorage.getItem('propsbible_signup_email') || '';
    setEmail(stored);
    if (isEmailLinkInUrl(window.location.href) && stored) {
      clearError();
      setDebugInfo('Verifying email link...');
      completeEmailVerification(stored).then(() => {
        setDebugInfo('Email verified. Set your name and password to finish.');
      }).catch((e: any) => {
        setDebugInfo(`Verification failed: ${e?.message || 'Unknown error'}`);
      });
    }
  }, [isEmailLinkInUrl, completeEmailVerification, clearError]);

  useEffect(() => {
    if (user) {
      // If already signed in and profile exists, redirect home
      const t = setTimeout(() => navigate('/', { replace: true }), 800);
      return () => clearTimeout(t);
    }
  }, [user, navigate]);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !password) {
      setDebugInfo('Please enter your name and a password.');
      return;
    }
    if (password.length < 8) {
      setDebugInfo('Password must be at least 8 characters long.');
      return;
    }
    try {
      clearError();
      setDebugInfo('Finalizing your account...');
      await finalizeSignup(displayName, password);
      setDebugInfo('All set! Redirecting...');
      setTimeout(() => navigate('/', { replace: true }), 600);
    } catch (e: any) {
      setDebugInfo(`Failed to finish: ${e?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Finish Creating Your Account</h2>
          <p className="text-white/70 text-sm">Email verified for {email || 'your address'}. Set your details below.</p>
        </div>
        {debugInfo && (
          <div className="mb-6 p-4 rounded-xl backdrop-blur-sm bg-blue-500/20 border border-blue-300/30">
            <p className="text-sm font-medium text-blue-100">{debugInfo}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm">
            <p className="text-red-100 text-sm font-medium">{String(error)}</p>
          </div>
        )}
        <form onSubmit={handleFinish} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">Create a Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
            Finish Signup
          </button>
        </form>
      </div>
    </div>
  );
}


