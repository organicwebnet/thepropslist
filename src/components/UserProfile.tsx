import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { User as UserIcon, Settings, Camera, Mail, Phone, MapPin, Building, Save, Loader2, X, Sun, Moon, Type, RefreshCw, LogOut, LinkIcon } from 'lucide-react';
import type { UserProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UserProfileModalProps {
  onClose: () => void;
}

type TabType = 'basic' | 'appearance' | 'additional';

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user, signOut } = useAuth();
  const { service: firebaseService, isInitialized } = useFirebase();
  const [profile, setProfile] = useState<UserProfile & { googleLinked?: boolean }>({
    displayName: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || '',
    phone: '',
    location: '',
    organization: '',
    role: '',
    bio: '',
    googleLinked: user?.providerData.some(p => p.providerId === 'google.com') || false
  });
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !isInitialized || !firebaseService) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const db = firebaseService.firestore();
        const profileDocRef = doc(db, 'userProfiles', user.uid);
        const profileDoc = await getDoc(profileDocRef);
        const existingData = profileDoc.exists() ? profileDoc.data() : {};

        const googleData = user.providerData.find(p => p.providerId === 'google.com');
        const appleData = user.providerData.find(p => p.providerId === 'apple.com');
        const hasGoogleProvider = !!googleData;

        setProfile(prev => ({
          ...prev,
          ...existingData,
          displayName: existingData.displayName || googleData?.displayName || user.displayName || '',
          email: user.email || '',
          photoURL: existingData.photoURL || googleData?.photoURL || user.photoURL || '',
          googleLinked: hasGoogleProvider || existingData.googleLinked || false
        }));
        
        if (!profileDoc.exists() && googleData) {
          await setDoc(profileDocRef, {
            displayName: googleData.displayName || '',
            email: googleData.email || '',
            photoURL: googleData.photoURL || '',
            provider: googleData.providerId,
            googleLinked: true,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        }

      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isInitialized, firebaseService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isInitialized || !firebaseService) return;

    setSaving(true);
    setError(null);

    try {
      const auth = firebaseService.auth();
      const db = firebaseService.firestore();

      await updateProfile(auth.currentUser!, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      await setDoc(doc(db, 'userProfiles', user.uid), {
        ...profile,
        lastUpdated: new Date().toISOString()
      });

      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !isInitialized || !firebaseService) return;
    
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    try {
      setLoading(true);
      const tempURL = URL.createObjectURL(file);
      setProfile(prev => ({ ...prev, photoURL: tempURL }));
      
      const storage = firebaseService.storage();
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      URL.revokeObjectURL(tempURL);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLink = async () => {
    if (!user || !isInitialized || !firebaseService) {
      setError("User not logged in or Firebase not ready.");
      return;
    }
    try {
      setLoading(true);
      setError('');
      
      const auth = firebaseService.auth();
      if (!auth.currentUser) {
        throw new Error("Current user not found in auth instance.");
      }

      const provider = new GoogleAuthProvider();
      const result = await linkWithPopup(auth.currentUser, provider);
      
      const linkedUser = result.user;
      const googleProviderData = linkedUser.providerData.find(p => p.providerId === 'google.com');
      
      setProfile(prev => ({
        ...prev,
        displayName: googleProviderData?.displayName || prev.displayName,
        photoURL: googleProviderData?.photoURL || prev.photoURL,
        googleLinked: true
      }));
      const db = firebaseService.firestore();
      await setDoc(doc(db, 'userProfiles', user.uid), {
        googleLinked: true,
        lastUpdated: new Date().toISOString(),
        displayName: profile.displayName || googleProviderData?.displayName || '',
        photoURL: profile.photoURL || googleProviderData?.photoURL || ''
      }, { merge: true });

    } catch (error: any) {
      console.error('Error linking Google account:', error);
      if (error.code === 'auth/credential-already-in-use') {
        setError('This Google account is already linked to another user.');
      } else {
        setError(error?.message || 'Failed to link Google account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSaving(true);
    setError(null);
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error("Sign out error:", error);
      setError("Failed to sign out. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-800">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-color)] relative modal-content">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Profile & Settings</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="border-b border-[var(--border-color)]">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile Info</span>
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
                  activeTab === 'appearance'
                    ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Appearance</span>
              </button>
              <button
                onClick={() => setActiveTab('additional')}
                className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
                  activeTab === 'additional'
                    ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Additional Info</span>
              </button>
            </nav>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {!profile.googleLinked && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link Account</label>
                  <button 
                    type="button"
                    onClick={handleGoogleLink}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <LinkIcon className="h-4 w-4" /> Link Google Account
                  </button>
                  {error?.includes('Google') && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Profile Picture
                </label>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile.displayName}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center border-4 border-primary">
                        <UserIcon className="h-16 w-16 text-sky-400" />
                      </div>
                    )}
                    <div 
                      className="absolute bottom-0 right-0 p-2 bg-primary rounded-full shadow-lg cursor-pointer hover:bg-primary-dark transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-secondary)] cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-lg border ${
                      theme === 'light'
                        ? 'border-[var(--highlight-color)] bg-[var(--highlight-bg)]'
                        : 'border-[var(--border-color)] hover:border-[var(--highlight-color)]'
                    } transition-all`}
                  >
                    <div className="bg-[var(--bg-primary)] rounded-md p-3 mb-2">
                      <Sun className="h-6 w-6 text-[var(--text-primary)] mx-auto" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-[var(--highlight-color)] bg-[var(--highlight-bg)]'
                        : 'border-[var(--border-color)] hover:border-[var(--highlight-color)]'
                    } transition-all`}
                  >
                    <div className="bg-[var(--bg-secondary)] rounded-md p-3 mb-2">
                      <Moon className="h-6 w-6 text-[var(--text-primary)] mx-auto" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">Dark</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'additional' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-200 mb-6">Additional Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location
                    </label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                        placeholder="Enter your location"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Organization
                    </label>
                    <div className="flex items-center space-x-2">
                      <Building className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile.organization}
                        onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                        placeholder="Enter your organization"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                    >
                      <option value="">Select your role</option>
                      <option value="props_master">Props Master</option>
                      <option value="props_artisan">Props Artisan</option>
                      <option value="stage_manager">Stage Manager</option>
                      <option value="director">Director</option>
                      <option value="producer">Producer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                      rows={4}
                      placeholder="Tell us about yourself"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={saving}
              className="px-6 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-md hover:from-primary-dark hover:to-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}