import React, { useState, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, LogIn, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Signup() {
  const { finalizeSignup, loading, error, clearError, signInWithGoogle, signInWithApple, startCodeVerification, verifyCode } = useWebAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Check if user has verified email when component mounts
  useEffect(() => {
    const verifiedEmail = window.localStorage.getItem('propsbible_signup_email');
    if (verifiedEmail && step === 'email') {
      setEmail(verifiedEmail);
      setStep('password');
      setDebugInfo('Email already verified. Please complete your account setup.');
    }
  }, [step]);

  // Reset form when user changes email
  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    // Clear any existing verified email if user changes the email
    const storedEmail = window.localStorage.getItem('propsbible_signup_email');
    if (storedEmail && storedEmail !== newEmail) {
      window.localStorage.removeItem('propsbible_signup_email');
      setStep('email');
      setDebugInfo('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setDebugInfo('Creating account...');
    if (!email || !password || !confirmPassword || !displayName) {
      setDebugInfo('All fields are required');
      return;
    }
    if (password.length < 8) {
      setDebugInfo('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setDebugInfo('Passwords do not match');
      return;
    }
    try {
      await finalizeSignup(displayName, password);
      setDebugInfo('Account created! Redirecting...');
      setTimeout(() => navigate('/', { replace: true }), 1000);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setDebugInfo(`❌ ${err.message || 'Sign up failed. Please try again.'}`);
    }
  };

  const handleGoogleSignUp = async () => {
    clearError();
    setDebugInfo('Starting Google authentication...');
    try {
      await signInWithGoogle();
      setDebugInfo('Google sign up successful! Redirecting...');
    } catch (err: any) {
      setDebugInfo(`Google sign up error: ${err.code || 'Unknown error'} - ${err.message || 'No message'}`);
    }
  };

  const handleAppleSignUp = async () => {
    clearError();
    setDebugInfo('Starting Apple authentication...');
    try {
      await signInWithApple();
      setDebugInfo('Apple sign up successful! Redirecting...');
    } catch (err: any) {
      setDebugInfo(`Apple sign up error: ${err.code || 'Unknown error'} - ${err.message || 'No message'}`);
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
      setDebugInfo('✅ Verification code sent! Check your email (including spam folder).');
      setResendCooldown(10);
    } catch (err: any) {
      console.error('Send code error:', err);
      setDebugInfo(`❌ Failed to send code: ${err.message || 'Unknown error'}`);
    }
  };

  const handleResendLink = async () => {
    if (resendCooldown > 0) return;
    try {
      clearError();
      setDebugInfo('Resending verification code...');
      await startCodeVerification(email);
      setDebugInfo('✅ Code re-sent successfully! Check your email (including spam folder).');
      setResendCooldown(10);
    } catch (err: any) {
      console.error('Resend code error:', err);
      setDebugInfo(`❌ Failed to resend: ${err.message || 'Unknown error'}`);
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
                    <h1 className="text-3xl font-bold text-white">Create Account</h1>
                </div>
                <p className="text-white/80 text-sm font-medium">Sign up to start using The Props List</p>
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
                  <p className="text-red-100 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}
            {/* Form */}
            {step === 'email' && (
              <form onSubmit={handleSendLink} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                      placeholder="your@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
                {/* Submit Button */}
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
                {/* Code Field */}
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
                    className="text-white/70 hover:text-white text-sm transition-colors"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendLink}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-60 disabled:cursor-not-allowed"
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
                <p className="text-white/60 text-sm">If the email hasn't arrived, check your Spam/Junk folder and filters, or try resending. The resend button will generate a new code.</p>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Verify user has completed email verification */}
                {!window.localStorage.getItem('propsbible_signup_email') && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                      <p className="text-red-100 text-sm font-medium">Email verification required. Please start over.</p>
                    </div>
                  </div>
                )}
                
                {/* Show current email and allow changing */}
                <div className="mb-4 p-3 bg-blue-500/20 border border-blue-300/30 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Creating account for:</p>
                      <p className="text-blue-200 text-sm">{email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        window.localStorage.removeItem('propsbible_signup_email');
                        setStep('email');
                        setEmail('');
                        setDebugInfo('');
                      }}
                      className="text-blue-300 hover:text-blue-100 text-sm transition-colors underline"
                    >
                      Change email
                    </button>
                  </div>
                </div>
                {/* Display Name Field */}
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
                {/* Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                      placeholder="Create a password (min 8 characters)"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-3.5 bg-white/15 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/40 focus:border-white/40 text-white placeholder-white/50 backdrop-blur-sm transition-all duration-200 font-medium"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-pb-primary hover:bg-pb-secondary transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-pb-primary/20 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading || !window.localStorage.getItem('propsbible_signup_email')}
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  Create Account
                </button>
              </form>
            )}
            {/* Links for sign up and forgot password */}
            <div className="flex flex-col items-center mt-6 space-y-2">
              <Link to="/login" className="text-white hover:text-blue-200 hover:underline text-sm font-medium transition-colors">Already have an account? Sign in</Link>
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
              onClick={handleGoogleSignUp}
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
              Continue with Google
            </button>
            {/* Apple Sign In */}
            <button
              type="button"
              onClick={handleAppleSignUp}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-black/80 hover:bg-black/90 transition-colors text-white font-bold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-white/40 text-lg disabled:opacity-60 disabled:cursor-not-allowed mt-3"
              disabled={loading}
            >
              <span className="inline-block w-5 h-5">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </span>
              Continue with Apple
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}