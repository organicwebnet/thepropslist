import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, signOut } from 'firebase/auth';
import { db, auth, signInWithGoogle } from '../lib/firebase';
import { User, Settings, Camera, Mail, Phone, MapPin, Building, Save, Loader2, X, Sun, Moon, Type, RefreshCw, LogOut, LinkIcon } from 'lucide-react';
import type { UserProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useFont, FontOption } from '../contexts/FontContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UserProfileModalProps {
  onClose: () => void;
}

type TabType = 'basic' | 'appearance' | 'additional';

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile & { googleLinked?: boolean }>({
    displayName: auth.currentUser?.displayName || '',
    email: auth.currentUser?.email || '',
    photoURL: auth.currentUser?.photoURL || '',
    phone: '',
    location: '',
    organization: '',
    role: '',
    bio: '',
    googleLinked: false
  });
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // Get the user's provider data
        const googleData = currentUser.providerData.find(
          provider => provider.providerId === 'google.com'
        );
        const appleData = currentUser.providerData.find(
          provider => provider.providerId === 'apple.com'
        );

        // Log provider data for debugging
        console.log('Auth providers:', currentUser.providerData.map(p => p.providerId));
        
        // Check if Google account is linked
        const hasGoogleProvider = !!googleData;
        
        // Get existing profile from Firestore
        const profileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
        const existingData = profileDoc.exists() ? profileDoc.data() : {};

        // Merge provider data with existing profile data
        setProfile(prev => ({
          ...prev,
          ...existingData,
          displayName: existingData.displayName || 
                      appleData?.displayName || 
                      googleData?.displayName || 
                      currentUser.displayName || '',
          email: currentUser.email || '',
          photoURL: existingData.photoURL || 
                   appleData?.photoURL || 
                   googleData?.photoURL || 
                   currentUser.photoURL || '',
          googleLinked: hasGoogleProvider || existingData.googleLinked || false
        }));

        // If this is the first time setting up the profile, save the provider data
        if (!profileDoc.exists()) {
          const providerData = appleData || googleData;
          if (providerData) {
            await setDoc(doc(db, 'userProfiles', currentUser.uid), {
              displayName: providerData.displayName || '',
              email: providerData.email || '',
              photoURL: providerData.photoURL || '',
              provider: providerData.providerId,
              googleLinked: providerData.providerId === 'google.com',
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setError(null);

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      // Update Firestore profile
      await setDoc(doc(db, 'userProfiles', auth.currentUser.uid), {
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
    if (!file || !auth.currentUser) return;
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a temporary URL to show the image immediately
      const tempURL = URL.createObjectURL(file);
      setProfile(prev => ({ ...prev, photoURL: tempURL }));
      
      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `profile_images/${auth.currentUser.uid}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update profile with the permanent URL
      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      
      // Clean up temporary URL
      URL.revokeObjectURL(tempURL);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLink = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await signInWithGoogle();
      if (result.user) {
        // Update profile with Google data
        setProfile(prev => ({
          ...prev,
          displayName: result.user.displayName || prev.displayName,
          photoURL: result.user.photoURL || prev.photoURL,
          googleLinked: true
        }));
      }
    } catch (error: any) {
      console.error('Error linking Google account:', error);
      setError(error?.message || 'Failed to link Google account');
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-start justify-center p-4 z-[100] overflow-y-auto">
      <div className={`w-full max-w-4xl bg-${theme === 'dark' ? '[#1A1A1A]' : 'white'} rounded-lg shadow-2xl my-8 border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <User className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold gradient-text">Profile & Settings</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={async () => {
                  try {
                    await signOut(auth);
                    onClose();
                  } catch (error) {
                    console.error('Error signing out:', error);
                    setError('Failed to sign out. Please try again.');
                  }
                }}
                className="p-2 hover:bg-red-900/20 text-red-500 rounded-full transition-colors flex items-center gap-2"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <LogOut className="h-6 w-6" />
                <span className="text-sm">Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-800">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'border-primary text-sky-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile Info</span>
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium ${
                  activeTab === 'appearance'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Appearance</span>
              </button>
              <button
                onClick={() => setActiveTab('additional')}
                className={`py-4 px-1 inline-flex items-center space-x-2 border-b-2 text-sm font-medium ${
                  activeTab === 'additional'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
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
              {/* Sync with Google Button */}
              <div className="mb-6">
                {/* Show different buttons based on whether Google provider is available */}
                {profile.googleLinked ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const currentUser = auth.currentUser;
                        if (!currentUser) return;

                        const googleData = currentUser.providerData.find(
                          provider => provider.providerId === 'google.com'
                        );

                        if (!googleData) {
                          // Check if user's email ends with gmail.com but they didn't sign in with Google
                          if (currentUser.email?.endsWith('@gmail.com')) {
                            setError('Your account uses a Gmail address but was not signed in with Google. Please sign out and use the "Sign in with Google" option.');
                          } else {
                            setError('No Google account connected. Please sign out and sign in with Google to use this feature.');
                          }
                          return;
                        }

                        // Successfully found Google provider data
                        setProfile(prev => ({
                          ...prev,
                          displayName: googleData.displayName || prev.displayName,
                          photoURL: googleData.photoURL || prev.photoURL,
                        }));

                        // Show success message
                        const oldError = error;
                        setError('Successfully synced with Google account!');
                        
                        // After 3 seconds, clear the success message or restore previous error
                        setTimeout(() => {
                          setError(message => message === 'Successfully synced with Google account!' ? null : oldError);
                        }, 3000);
                      } catch (err) {
                        console.error('Error syncing with Google:', err);
                        setError('Failed to sync with Google account. Please try again.');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync with Google Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLink}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing Sign-in...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4" />
                        Link Google Account
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Profile Picture */}
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
                        <User className="h-16 w-16 text-sky-400" />
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

              {/* Name and Email */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                      className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              {/* Theme Selection */}
              <div>
                <h3 className="text-xl font-semibold text-gray-200 mb-6">Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-lg border ${
                      theme === 'light'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-800 hover:border-gray-700'
                    } transition-all`}
                  >
                    <div className="bg-white rounded-md p-3 mb-2">
                      <Sun className="h-6 w-6 text-gray-900 mx-auto" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-800 hover:border-gray-700'
                    } transition-all`}
                  >
                    <div className="bg-gray-900 rounded-md p-3 mb-2">
                      <Moon className="h-6 w-6 text-white mx-auto" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">Dark</span>
                  </button>
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Type className="h-5 w-5 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-200">Font</h3>
                </div>
                <div className="space-y-4 bg-[#0A0A0A] border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="font-system"
                      name="font"
                      value="system"
                      checked={font === 'system'}
                      onChange={(e) => setFont(e.target.value as FontOption)}
                      className="mr-3"
                    />
                    <label htmlFor="font-system" className="text-gray-300">
                      System Default
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="font-opendyslexic"
                      name="font"
                      value="opendyslexic"
                      checked={font === 'opendyslexic'}
                      onChange={(e) => setFont(e.target.value as FontOption)}
                      className="mr-3"
                    />
                    <label htmlFor="font-opendyslexic" className="text-gray-300">
                      OpenDyslexic (Dyslexia-friendly)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="font-arial"
                      name="font"
                      value="arial"
                      checked={font === 'arial'}
                      onChange={(e) => setFont(e.target.value as FontOption)}
                      className="mr-3"
                    />
                    <label htmlFor="font-arial" className="text-gray-300">
                      Arial
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="font-verdana"
                      name="font"
                      value="verdana"
                      checked={font === 'verdana'}
                      onChange={(e) => setFont(e.target.value as FontOption)}
                      className="mr-3"
                    />
                    <label htmlFor="font-verdana" className="text-gray-300">
                      Verdana
                    </label>
                  </div>
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
                        className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                        className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                        className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                      className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                      className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={4}
                      placeholder="Tell us about yourself"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
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