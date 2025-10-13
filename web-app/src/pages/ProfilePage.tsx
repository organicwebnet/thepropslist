import React, { useState, useRef, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSubscription } from '../hooks/useSubscription';
import { updatePassword, updateEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { stripeService, type StripePlan } from '../services/StripeService';
import { calculateDiscount } from '../shared/types/pricing';
import Avatar from '../components/Avatar';
import { PricingModalErrorBoundary } from '../components/PricingModalErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../PropsBibleHomepage';
import { 
  User, 
  Lock, 
  Camera, 
  Save, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff,
  CreditCard,
  Crown,
  Star,
  Zap,
  X
} from 'lucide-react';
import { ROLE_OPTIONS } from '../constants/roleOptions';

const ProfilePage: React.FC = () => {
  const { user, userProfile, updateUserProfile, signOut, loading } = useWebAuth();
  const { plan, status, limits, perShowLimits, currentPeriodEnd } = useSubscription();
  const navigate = useNavigate();
  
  // User Details State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('propmaker');
  const [photoURL, setPhotoURL] = useState('');
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  
  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  // UI State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription'>('profile');
  
  // Subscription State
  const [billingLoading, setBillingLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<StripePlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountCodeValid, setDiscountCodeValid] = useState<boolean | null>(null);
  const [discountCodeError, setDiscountCodeError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use shared role options for consistency
  const roleOptions = ROLE_OPTIONS;

  // Initialize form data when userProfile loads
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setEmail(userProfile.email || user?.email || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setRole(userProfile.role || 'propmaker');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile, user]);

  // Load pricing configuration
  useEffect(() => {
    const loadPricingConfig = async () => {
      setPricingLoading(true);
      try {
        console.log('Loading pricing configuration from Stripe...');
        const config = await stripeService.getPricingConfig();
        console.log('Pricing config loaded:', config);
        setPricingConfig(config.plans);
        
        // Check if we have any plans with price IDs
        const plansWithPrices = config.plans.filter(plan => plan.priceId.monthly || plan.priceId.yearly);
        console.log('Plans with prices:', plansWithPrices.length);
        
        if (plansWithPrices.length === 0) {
          setSubscriptionError('No pricing plans configured in Stripe. Please set up products and prices in your Stripe dashboard.');
        }
      } catch (error) {
        console.error('Failed to load pricing config:', error);
        setSubscriptionError('Failed to load pricing information. Please check your Stripe configuration.');
      } finally {
        setPricingLoading(false);
      }
    };

    loadPricingConfig();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setSubscriptionError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    clearMessages();
    
    try {
      await updateUserProfile({
        displayName, 
        phoneNumber, 
        role: role as 'admin' | 'user' | 'viewer' | 'god' | 'editor' | 'props_supervisor' | 'art_director', 
        photoURL 
      });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !currentPassword) {
      setError('Current password is required to update email');
      return;
    }
    
    setSaving(true);
    clearMessages();
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update email
      await updateEmail(user, email);
      
      // Update profile
      await updateUserProfile({ email });
      setSuccess('Email updated successfully!');
      setCurrentPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user || !currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    clearMessages();
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    setSaving(true);
    clearMessages();
    
    try {
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      await updateUserProfile({ photoURL: url });
      setSuccess('Profile photo updated successfully!');
    } catch (err: any) {
      setError('Failed to upload photo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'close account') {
      setError('Please type "close account" to confirm');
      return;
    }
    
    if (!user || !deletePassword) {
      setError('Password is required to delete account');
      return;
    }
    
    setSaving(true);
    clearMessages();
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      // Delete user account
      await deleteUser(user);
      
      // Sign out and redirect
      await signOut();
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setBillingLoading(true);
      setSubscriptionError(null);
      const fn = httpsCallable<any, { url: string }>(getFunctions(), 'createBillingPortalSession');
      const res = await fn({});
      const url = res?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setSubscriptionError('Failed to open billing portal');
      }
    } catch (e: any) {
      setSubscriptionError(e?.message || 'Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleStartCheckout = async (planId: string, billingInterval: 'monthly' | 'yearly' = 'monthly') => {
    try {
      setCheckoutLoading(true);
      setSubscriptionError(null);
      const url = await stripeService.createCheckoutSession(planId, billingInterval, discountCode || undefined);
      window.location.href = url;
    } catch (e: any) {
      setSubscriptionError(e?.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const validateDiscountCode = async (code: string, planId: string) => {
    if (!code.trim()) {
      setDiscountCodeValid(null);
      setDiscountCodeError(null);
      return;
    }

    try {
      // Import the discount service
      const { discountCodesService } = await import('../services/DiscountCodesService');
      const validation = await discountCodesService.validateDiscountCode(code, planId);
      
      setDiscountCodeValid(validation.valid);
      setDiscountCodeError(validation.error || null);
    } catch (error) {
      setDiscountCodeValid(false);
      setDiscountCodeError('Failed to validate discount code');
    }
  };

  // Get plan icons
  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return User;
      case 'starter': return Star;
      case 'standard': return Zap;
      case 'pro': return Crown;
      default: return User;
    }
  };

  // Check if user is still in onboarding

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-10 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary"></div>
          <span className="ml-3 text-pb-gray">Loading profile...</span>
        </div>
      </div>
    );
  }

  // Show error state if user is not authenticated
  if (!user) {
    return (
      <div className="w-full max-w-6xl mx-auto py-10 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-white">Access Denied</h1>
          <p className="text-pb-gray mb-6">You need to be logged in to access your profile.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-pb-primary text-white rounded-lg hover:bg-pb-secondary transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-6xl mx-auto py-10 px-4">

      <h1 className="text-3xl font-bold mb-8 text-white">Account Settings</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-pb-darker/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'profile'
              ? 'bg-pb-primary text-white'
              : 'text-pb-gray hover:text-white'
          }`}
        >
          Profile Details
                </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'subscription'
              ? 'bg-pb-primary text-white'
              : 'text-pb-gray hover:text-white'
          }`}
        >
          Subscription
                </button>
              </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-400">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center"
          >
            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
            <span className="text-green-400">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Details Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Profile Photo Section */}
          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Profile Photo
            </h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
              <Avatar
                src={photoURL}
                alt="Profile"
                name={displayName}
                size="xl"
                className="border-2 border-pb-primary"
              />
              <button
                type="button"
                  className="absolute bottom-0 right-0 bg-pb-primary text-white rounded-full p-2 shadow hover:bg-pb-secondary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
              >
                  <Camera className="w-4 h-4" />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
              <div>
                <p className="text-pb-gray text-sm">Upload a profile photo to personalize your account</p>
                <p className="text-pb-gray text-xs mt-1">JPG, PNG or GIF. Max size 5MB.</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <form onSubmit={handleSaveProfile} className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h2>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-pb-gray text-sm mb-2">Full Name *</label>
            <input
                  type="text"
                  className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
              value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            </div>
              
            <div>
                <label className="block text-pb-gray text-sm mb-2">Phone Number</label>
                <input
                  type="tel"
                  className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
            </div>
              
            <div>
                <label className="block text-pb-gray text-sm mb-2">Role *</label>
              <select
                  className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                value={role}
                  onChange={(e) => setRole(e.target.value)}
              >
                {roleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
              
            <div>
                <label className="block text-pb-gray text-sm mb-2">Email Address *</label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    className="flex-1 p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleUpdateEmail}
                    disabled={saving || email === user?.email}
                    className="px-4 py-3 rounded-lg bg-pb-primary text-white font-medium hover:bg-pb-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
                {email !== user?.email && (
                  <p className="text-amber-400 text-xs mt-1">Enter your current password below to update email</p>
                )}
              </div>
            </div>
            
            <button
              type="submit"
              className="mt-6 px-6 py-3 rounded-lg bg-pb-primary text-white font-medium shadow hover:bg-pb-secondary transition-colors flex items-center"
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Password Section */}
          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Change Password
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-pb-gray text-sm mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pb-gray hover:text-white"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-pb-gray text-sm mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pb-gray hover:text-white"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
            <div>
                <label className="block text-pb-gray text-sm mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-pb-gray hover:text-white"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleUpdatePassword}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="mt-4 px-6 py-3 rounded-lg bg-pb-primary text-white font-medium shadow hover:bg-pb-secondary transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4 mr-2" />
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          {/* Account Deletion */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center">
              <Trash2 className="w-5 h-5 mr-2" />
              Danger Zone
            </h2>
            <p className="text-pb-gray mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </motion.div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Current Subscription */}
          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Current Subscription
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-pb-gray">Plan</div>
                <div className="text-2xl font-bold text-white capitalize">{plan}</div>
                <div className="text-sm text-pb-gray">Status: {status}</div>
              </div>
              
              <div>
                <div className="text-sm text-pb-gray">Usage Limits</div>
                <div className="space-y-1 text-sm text-white">
                  <div>Shows: {limits.shows}</div>
                  <div>Boards: {limits.boards}</div>
                  <div>Packing Boxes: {limits.packingBoxes}</div>
                  <div>Collaborators: {limits.collaboratorsPerShow}</div>
                  <div>Props: {limits.props}</div>
                  <div>Archived Shows: {limits.archivedShows === 0 ? 'None' : limits.archivedShows}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-pb-gray">Per-Show Limits</div>
                <div className="space-y-1 text-sm text-white">
                  <div>Boards per Show: {perShowLimits.boards}</div>
                  <div>Packing Boxes per Show: {perShowLimits.packingBoxes}</div>
                  <div>Collaborators per Show: {perShowLimits.collaborators}</div>
                  <div>Props per Show: {perShowLimits.props}</div>
                </div>
              </div>
            </div>
            
            {currentPeriodEnd && (
              <div className="mt-4 p-3 bg-pb-primary/10 rounded-lg">
                <div className="text-sm text-pb-gray">Next billing date</div>
                <div className="text-white font-medium">
                  {new Date(currentPeriodEnd * 1000).toLocaleDateString()}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex space-x-4">
              <button
                onClick={handleManageSubscription}
                disabled={billingLoading}
                className="px-6 py-3 rounded-lg bg-pb-primary text-white font-medium hover:bg-pb-secondary transition-colors disabled:opacity-50"
              >
                {billingLoading ? 'Opening...' : 'Manage Subscription'}
              </button>
              
              <button
                onClick={async () => {
                  // Refresh pricing data to ensure we have the latest from Stripe
                  try {
                    setPricingLoading(true);
                    setSubscriptionError(null);
                    console.log('Refreshing pricing configuration...');
                    const config = await stripeService.refreshPricingConfig();
                    console.log('Refreshed pricing config:', config);
                    setPricingConfig(config.plans);
                    
                    // Check if we have any plans with price IDs
                    const plansWithPrices = config.plans.filter(plan => plan.priceId.monthly || plan.priceId.yearly);
                    if (plansWithPrices.length === 0) {
                      setSubscriptionError('No pricing plans configured in Stripe. Please set up products and prices in your Stripe dashboard.');
                    }
                  } catch (error) {
                    console.error('Failed to refresh pricing config:', error);
                    setSubscriptionError('Failed to load pricing information. Please check your Stripe configuration.');
                  } finally {
                    setPricingLoading(false);
                  }
                  setShowPricingModal(true);
                }}
                disabled={pricingLoading}
                className="px-6 py-3 rounded-lg border border-pb-primary text-pb-primary font-medium hover:bg-pb-primary hover:text-white transition-colors disabled:opacity-50"
              >
                {pricingLoading ? 'Loading...' : 'View All Plans'}
              </button>
            </div>
            
            {subscriptionError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {subscriptionError}
              </div>
            )}
          </div>

          {/* Pricing Information */}
          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Available Plans
            </h2>
            
            <div className="text-pb-gray text-sm mb-4">
              Pricing is dynamically loaded from Stripe. Changes to your Stripe products and prices will automatically reflect here.
            </div>
            
            {pricingLoading ? (
              <div className="text-center py-8">
                <div className="text-pb-gray">Loading pricing information...</div>
              </div>
            ) : pricingConfig.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingConfig.map((plan) => {
                  const PlanIcon = getPlanIcon(plan.id);
                  const hasPriceId = plan.priceId.monthly || plan.priceId.yearly;
                  
                  return (
                    <div key={plan.id} className={`p-4 rounded-lg border ${hasPriceId ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <PlanIcon className="w-4 h-4 mr-2 text-white" />
                          <span className="text-sm font-medium text-white">{plan.name}</span>
                        </div>
                        {hasPriceId ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="text-xs text-pb-gray">
                        {hasPriceId ? 'Available for purchase' : 'Price not configured in Stripe'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-pb-gray mb-2">No pricing plans configured</div>
                <div className="text-sm text-pb-gray">
                  Please set up products and prices in your Stripe dashboard to enable subscriptions.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-pb-darker rounded-2xl border border-red-500/20 p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-red-400">Delete Account</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-pb-gray hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-pb-gray mb-4">
                  This action cannot be undone. This will permanently delete your account and remove all your data.
                </p>
                
                <div className="mb-4">
                  <label className="block text-pb-gray text-sm mb-2">
                    Type "close account" to confirm:
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-red-500"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="close account"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-pb-gray text-sm mb-2">
                    Enter your password:
                  </label>
                  <input
                    type="password"
                    className="w-full p-3 rounded-lg bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-red-500"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-pb-gray text-pb-gray hover:text-white transition-colors"
                >
                  Cancel
                </button>
          <button
                  onClick={handleDeleteAccount}
                  disabled={saving || deleteConfirmation !== 'close account' || !deletePassword}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <PricingModalErrorBoundary onRetry={() => {
            // Retry loading pricing config
            const retryLoadPricing = async () => {
              try {
                setPricingLoading(true);
                const config = await stripeService.refreshPricingConfig();
                setPricingConfig(config.plans);
              } catch (error) {
                console.error('Failed to retry pricing config:', error);
              } finally {
                setPricingLoading(false);
              }
            };
            retryLoadPricing();
          }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-pb-darker rounded-2xl border border-pb-primary/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pricing-modal-title"
              aria-describedby="pricing-modal-description"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="pricing-modal-title" className="text-2xl font-semibold text-white">Choose Your Plan</h3>
                <button
                  onClick={() => setShowPricingModal(false)}
                  className="text-pb-gray hover:text-white"
                  aria-label="Close pricing modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p id="pricing-modal-description" className="text-pb-gray mb-6">
                Select a subscription plan that fits your production needs. All plans include core features with different limits and support levels.
              </p>

              {/* Discount Code Input */}
              <div className="mb-6">
                <label 
                  htmlFor="discount-code-input"
                  className="block text-sm font-medium text-pb-gray mb-2"
                >
                  Have a discount code?
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="discount-code-input"
                    type="text"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      // Validate against the first available plan
                      const firstPlan = pricingConfig.find(p => p.priceId.monthly || p.priceId.yearly);
                      if (firstPlan) {
                        validateDiscountCode(e.target.value.toUpperCase(), firstPlan.id);
                      }
                    }}
                    placeholder="Enter discount code"
                    aria-describedby="discount-code-help discount-code-status"
                    aria-invalid={discountCodeValid === false}
                    className={`flex-1 px-3 py-2 bg-pb-darker/50 border rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/20 ${
                      discountCodeValid === true ? 'border-green-500' : 
                      discountCodeValid === false ? 'border-red-500' : 
                      'border-pb-gray/30'
                    }`}
                  />
                  {discountCodeValid === true && (
                    <CheckCircle 
                      className="w-5 h-5 text-green-400" 
                      aria-label="Discount code is valid"
                    />
                  )}
                  {discountCodeValid === false && (
                    <AlertTriangle 
                      className="w-5 h-5 text-red-400" 
                      aria-label="Discount code is invalid"
                    />
                  )}
                </div>
                <div id="discount-code-help" className="text-xs text-pb-gray mt-1">
                  Enter your discount code to apply savings to your subscription
                </div>
                <div 
                  id="discount-code-status"
                  role="status"
                  aria-live="polite"
                  className="mt-1"
                >
                  {discountCodeError && (
                    <p className="text-red-400 text-sm" role="alert">{discountCodeError}</p>
                  )}
                  {discountCodeValid && (
                    <p className="text-green-400 text-sm">Discount code applied!</p>
                  )}
                </div>
              </div>
              
              {pricingLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="text-pb-gray">Loading pricing information...</div>
                </div>
              ) : pricingConfig.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <div className="text-pb-gray mb-4">No pricing plans available</div>
                  <div className="text-sm text-pb-gray">
                    Please configure your Stripe products and prices to enable subscriptions.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {pricingConfig.map((planData) => {
                    const PlanIcon = getPlanIcon(planData.id);
                    const hasPriceId = planData.priceId.monthly || planData.priceId.yearly;
                    
                    return (
                      <div
                        key={planData.id}
                        className={`relative rounded-xl p-6 border-2 transition-all ${
                          planData.popular
                            ? 'border-pb-primary bg-pb-primary/10'
                            : 'border-pb-gray/30 bg-pb-darker/50'
                        }`}
                        role="article"
                        aria-labelledby={`plan-${planData.id}-title`}
                        aria-describedby={`plan-${planData.id}-description`}
                      >
                        {planData.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-pb-primary text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                              Most Popular
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center mb-4">
                          <div className={`w-12 h-12 ${planData.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                            <PlanIcon className="w-6 h-6 text-white" />
                          </div>
                          <h4 id={`plan-${planData.id}-title`} className="text-xl font-semibold text-white">{planData.name}</h4>
                          <p id={`plan-${planData.id}-description`} className="text-sm text-pb-gray mb-2">{planData.description}</p>
                          <div className="mt-2">
                            <span className="text-3xl font-bold text-white">£{planData.price.monthly}</span>
                            <span className="text-pb-gray">/month</span>
                          </div>
                          {planData.price.yearly > 0 && planData.price.monthly > 0 && (() => {
                            const { savings, discountPercent } = calculateDiscount(planData.price.monthly, planData.price.yearly);
                            return (
                              <div className="text-sm text-pb-gray">
                                or £{planData.price.yearly}/year 
                                {savings > 0 && (
                                  <span className="text-green-400 font-medium">
                                    {' '}(save ${savings} - {discountPercent}% off)
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        <ul className="space-y-2 mb-6">
                          {planData.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-pb-gray">
                              <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        
                        <div className="space-y-2">
                          {planData.priceId.monthly && (
                            <button
                              onClick={() => {
                                handleStartCheckout(planData.id, 'monthly');
                                setShowPricingModal(false);
                              }}
                              disabled={planData.id === plan || checkoutLoading}
                              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                                planData.id === plan || checkoutLoading
                                  ? 'bg-pb-gray/30 text-pb-gray cursor-not-allowed'
                                  : planData.popular
                                  ? 'bg-pb-primary text-white hover:bg-pb-secondary'
                                  : 'border border-pb-primary text-pb-primary hover:bg-pb-primary hover:text-white'
                              }`}
                              aria-label={`Subscribe to ${planData.name} plan monthly for £${planData.price.monthly} per month`}
                            >
                              {checkoutLoading ? 'Loading...' : planData.id === plan 
                                ? 'Current Plan' 
                                : `Monthly - £${planData.price.monthly}`
                              }
                            </button>
                          )}
                          
                          {planData.priceId.yearly && (
                            <button
                              onClick={() => {
                                handleStartCheckout(planData.id, 'yearly');
                                setShowPricingModal(false);
                              }}
                              disabled={planData.id === plan || checkoutLoading}
                              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                                planData.id === plan || checkoutLoading
                                  ? 'bg-pb-gray/30 text-pb-gray cursor-not-allowed'
                                  : 'border border-green-500 text-green-400 hover:bg-green-500 hover:text-white'
                              }`}
                              aria-label={`Subscribe to ${planData.name} plan yearly for £${planData.price.yearly} per year`}
                            >
                              {checkoutLoading ? 'Loading...' : planData.id === plan 
                                ? 'Current Plan' 
                                : (() => {
                                    const { savings, discountPercent } = calculateDiscount(planData.price.monthly, planData.price.yearly);
                                    return savings > 0 
                                      ? `Yearly - £${planData.price.yearly} (Save £${savings} - ${discountPercent}% off)`
                                      : `Yearly - £${planData.price.yearly}`;
                                  })()
                              }
                            </button>
                          )}
                          
                          {!hasPriceId && (
                            <div className="w-full py-2 px-4 rounded-lg bg-pb-gray/20 text-pb-gray text-center">
                              Not Available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
          </PricingModalErrorBoundary>
        )}
      </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage; 