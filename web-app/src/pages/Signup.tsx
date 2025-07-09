import React, { useState } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, LogIn, Mail, Lock, User } from 'lucide-react';

export default function Signup() {
  const { signUp, loading, error, clearError } = useWebAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setDebugInfo('Creating account...');
    if (!email || !password || !displayName) {
      setDebugInfo('All fields are required');
      return;
    }
    try {
      await signUp(email, password, displayName);
      setDebugInfo('Account created! Redirecting...');
      setTimeout(() => navigate('/', { replace: true }), 1000);
    } catch (err: any) {
      setDebugInfo(`Sign up error: ${err.code || 'Unknown error'} - ${err.message || 'No message'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-white/70 text-sm">Sign up to start using Props Bible</p>
        </div>
        {debugInfo && (
          <div className="mb-6 p-4 rounded-xl backdrop-blur-sm bg-blue-500/20 border border-blue-300/30">
            <p className="text-sm font-medium text-blue-100">{debugInfo}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm">
            <p className="text-red-100 text-sm font-medium">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
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
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            Sign Up
          </button>
        </form>
        <div className="flex flex-col items-center mt-6 space-y-2">
          <Link to="/login" className="text-pb-primary hover:underline text-sm font-medium">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
} 