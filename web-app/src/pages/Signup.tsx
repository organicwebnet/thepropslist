import React, { useState, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, LogIn, Mail, Lock, User } from 'lucide-react';

export default function Signup() {
  const { signUp, loading, error, clearError, signInWithGoogle, startCodeVerification, verifyCode } = useWebAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [code, setCode] = useState('');
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

  const handleGoogleSignUp = async () => {
    try {
      clearError();
      setDebugInfo('Opening Google sign-in...');
      await signInWithGoogle();
      setDebugInfo('Account created! Redirecting...');
      setTimeout(() => navigate('/', { replace: true }), 500);
    } catch (err: any) {
      setDebugInfo(`Google sign-in error: ${err.code || 'Unknown error'} - ${err.message || 'No message'}`);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      clearError();
      if (!email) {
        setDebugInfo('Please enter your email first.');
        return;
      }
      setDebugInfo('Sending verification code...');
      await startCodeVerification(email);
      setStep('code');
      setDebugInfo('Verification code sent. Check your inbox.');
      setResendCooldown(30);
    } catch (err: any) {
      setDebugInfo(`Failed to send code: ${err.code || 'Unknown error'} - ${err.message || 'No message'}`);
    }
  };

  const handleResendLink = async () => {
    if (resendCooldown > 0) return;
    try {
      clearError();
      setDebugInfo('Resending verification code...');
      await startCodeVerification(email);
      setDebugInfo('Code re-sent. It can take a minute to arrive.');
      setResendCooldown(30);
    } catch (err: any) {
      setDebugInfo(`Failed to resend: ${err.code || 'Unknown error'} - ${err.message || 'No message'}`);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

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
        {step === 'email' && (
          <form onSubmit={handleSendLink} className="space-y-6">
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
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              Send verification code
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const ok = await verifyCode(email, code);
            if (ok) {
              setStep('password');
              setDebugInfo('Email verified. Create your password.');
            } else {
              setDebugInfo('Invalid or expired code. Please try again or resend.');
            }
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/90">Enter verification code</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="w-full pr-4 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium text-center tracking-widest text-xl"
                  placeholder="123456"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-white/80 hover:text-white text-sm"
              >
                Change email
              </button>
              <button
                type="button"
                onClick={handleResendLink}
                className="inline-flex items-center justify-center gap-2 py-2 px-3 bg-white/15 hover:bg-white/20 transition-colors text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Verify code
            </button>
            <p className="text-white/70 text-sm">If the email hasn’t arrived, check your Spam/Junk folder and filters, or try resending.</p>
          </form>
        )}

        {step === 'password' && (
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
              Create account
            </button>
          </form>
        )}
        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-white/20 flex-1" />
          <span className="text-white/60 text-xs uppercase tracking-wider">or</span>
          <div className="h-px bg-white/20 flex-1" />
        </div>

        {/* Google sign up */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white text-gray-900 hover:bg-gray-100 transition-colors font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading}
        >
          <LogIn className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="flex flex-col items-center mt-6 space-y-2">
          <Link to="/login" className="text-pb-primary hover:underline text-sm font-medium">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
} 