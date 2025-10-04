import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useWebAuth } from '../contexts/WebAuthContext';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { } = useWebAuth(); // eslint-disable-line no-empty-pattern
  const code = searchParams.get('code');
  const email = searchParams.get('email');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeEmail, setCodeEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !email) {
      setError('Invalid or missing reset code or email');
      setCodeValid(false);
      return;
    }

    // Check if code is valid using the SAME system as verification codes
    const checkCode = async () => {
      try {
        const codeDoc = await getDoc(doc(db, 'pending_password_resets', email.toLowerCase()));
        
        if (!codeDoc.exists()) {
          setError('Invalid or expired reset code');
          setCodeValid(false);
          return;
        }

        const codeData = codeDoc.data();
        
        if (Date.now() > (codeData.expiresAt || 0)) {
          setError('This reset code has expired');
          setCodeValid(false);
          return;
        }

        // Verify the code hash (same as verification codes)
        const crypto = window.crypto || (window as any).msCrypto;
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (providedHash !== codeData.codeHash) {
          setError('Invalid reset code');
          setCodeValid(false);
          return;
        }

        setCodeValid(true);
        setCodeEmail(email);
      } catch (err) {
        console.error('Error checking code:', err);
        setError('Failed to validate reset code');
        setCodeValid(false);
      }
    };

    checkCode();
  }, [code, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || !email || !codeValid) {
      setError('Invalid reset code');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call Firebase function to update password
      const functions = getFunctions();
      const updatePasswordFunction = httpsCallable(functions, 'updateUserPasswordWithCode');
      
      await updatePasswordFunction({
        email: email,
        code: code,
        newPassword: password
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Handle specific Firebase function errors
      if (err.code === 'functions/not-found') {
        setError('Invalid or expired reset code. Please request a new one.');
      } else if (err.code === 'functions/deadline-exceeded') {
        setError('Reset code has expired. Please request a new one.');
      } else if (err.code === 'functions/permission-denied') {
        setError('Invalid reset code. Please check the link and try again.');
      } else if (err.code === 'functions/invalid-argument') {
        setError(err.message || 'Invalid input. Please check your password and try again.');
      } else {
        setError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (codeValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="text-center">
            <Loader2 className="animate-spin w-8 h-8 text-white mx-auto mb-4" />
            <p className="text-white/70">Validating reset code...</p>
          </div>
        </div>
      </div>
    );
  }

  if (codeValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Reset Code</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <Link 
              to="/forgot-password" 
              className="inline-block bg-pb-primary hover:bg-pb-secondary text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Request New Reset Code
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successfully!</h2>
            <p className="text-white/70 mb-4">Your password has been updated successfully.</p>
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm font-medium">
                ⚠️ Important: Please use your NEW password to sign in. Do not use your old password.
              </p>
            </div>
            <Link 
              to="/login?reset=success" 
              className="inline-block bg-pb-primary hover:bg-pb-secondary text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Reset Your Password</h2>
          <p className="text-white/70 text-sm">
            {codeEmail ? `Enter a new password for ${codeEmail}` : 'Enter your new password'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm">
            <p className="text-red-100 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type={showPasswords.password ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                placeholder="Enter new password"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                disabled={loading}
              >
                {showPasswords.password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type={showPasswords.confirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                disabled={loading}
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Reset Password'}
          </button>
        </form>

        <div className="flex flex-col items-center mt-6 space-y-2">
          <Link to="/login" className="text-pb-primary hover:underline text-sm font-medium">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
