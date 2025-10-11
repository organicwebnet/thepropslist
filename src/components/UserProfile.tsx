import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  updateProfile, 
  GoogleAuthProvider, 
  OAuthProvider,
  linkWithPopup, 
  unlink,
  User as FirebaseWebUser,
  type UserInfo as FirebaseWebUserInfo,
  deleteUser
} from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { User as UserIcon, Settings, Camera, Mail, Phone, MapPin, Building, Save, Loader2, X, Sun, Moon, Type, RefreshCw, LogOut, LinkIcon } from 'lucide-react';
import type { UserProfile } from '../types';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Define available fonts
const fontOptions = [
  { value: 'system', label: 'System Default' },
  { value: 'OpenDyslexic', label: 'OpenDyslexic', note: '(Dyslexia-friendly)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Verdana', label: 'Verdana' },
];

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
    fontPreference: 'system',
    googleLinked: (user as FirebaseAuthTypes.User)?.providerData.some((p: FirebaseAuthTypes.UserInfo) => p.providerId === GoogleAuthProvider.PROVIDER_ID) || false
  });
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);

  const providerData = useMemo(() => {
    if (!(user as FirebaseAuthTypes.User)?.providerData) return [];
    return (user as FirebaseAuthTypes.User).providerData.map((p: FirebaseAuthTypes.UserInfo) => ({
      providerId: p.providerId,
      uid: p.uid,
      displayName: p.displayName,
      email: p.email,
      photoURL: p.photoURL,
    }));
  }, [user]);

  const isGoogleLinked = useMemo(() =>
    (user as FirebaseAuthTypes.User)?.providerData.some((p: FirebaseAuthTypes.UserInfo) => p.providerId === GoogleAuthProvider.PROVIDER_ID) || false,
  [user]);

  const isAppleLinked = useMemo(() =>
    (user as FirebaseAuthTypes.User)?.providerData.some((p: FirebaseAuthTypes.UserInfo) => p.providerId === 'apple.com') || false,
  [user]);

  const fetchProfile = useCallback(async () => {
    const rnUser = user as FirebaseAuthTypes.User | null;
    if (!rnUser || !isInitialized || !firebaseService) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const db = firebaseService.getFirestoreJsInstance();
      const profileDocRef = doc(db, 'userProfiles', rnUser.uid);
      const profileDoc = await getDoc(profileDocRef);
      const existingData: Partial<UserProfile> = profileDoc.exists() ? profileDoc.data() : {};

      const googleData = rnUser.providerData.find((p: FirebaseAuthTypes.UserInfo) => p.providerId === GoogleAuthProvider.PROVIDER_ID);
      const appleData = rnUser.providerData.find((p: FirebaseAuthTypes.UserInfo) => p.providerId === 'apple.com');
      const hasGoogleProvider = !!googleData;

      setProfile(prev => ({
        ...prev,
        ...existingData,
        displayName: existingData.displayName || googleData?.displayName || rnUser.displayName || prev.displayName || '',
        email: rnUser.email || prev.email || '',
        photoURL: existingData.photoURL || googleData?.photoURL || rnUser.photoURL || prev.photoURL || '',
        googleLinked: existingData.googleLinked !== undefined ? existingData.googleLinked : hasGoogleProvider,
        fontPreference: existingData.fontPreference || prev.fontPreference || 'system',
        phone: existingData.phone || prev.phone || '',
        location: existingData.location || prev.location || '',
        organization: existingData.organization || prev.organization || '',
        role: existingData.role || prev.role || '',
        bio: existingData.bio || prev.bio || '',
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
  }, [user, isInitialized, firebaseService]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshUserProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !isInitialized || !firebaseService) return;

    setSaving(true);
    setError(null);

    try {
      const auth = firebaseService.auth;
      const db = firebaseService.getFirestoreJsInstance();

      const firebaseJsUser = auth.currentUser as FirebaseWebUser;
      await updateProfile(firebaseJsUser, {
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
      setProfile((prev: UserProfile & { googleLinked?: boolean }) => ({ ...prev, photoURL: tempURL }));
      
      const storage = firebaseService.storage;
      const storageRef = ref(storage as any, `profile_images/${user.uid}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setProfile((prev: UserProfile & { googleLinked?: boolean }) => ({ ...prev, photoURL: downloadURL }));
      URL.revokeObjectURL(tempURL);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    const rnUser = user as FirebaseAuthTypes.User | null;
    if (!firebaseService || !rnUser) return;
    try {
      const auth = firebaseService.auth;
      const webCurrentUser = auth.currentUser as FirebaseWebUser | null;
      if (!webCurrentUser) {
        setError("No current user to link.");
        return;
      }
      const googleAuthProvider = new GoogleAuthProvider();
      await linkWithPopup(webCurrentUser, googleAuthProvider);
      window.alert('Success, Account linked with Google successfully');
      refreshUserProfile();
    } catch (error: any) {
      window.alert(`Error: ${error.message || 'Failed to link with Google'}`);
    }
  };

  const handleUnlinkGoogle = async () => {
    const rnUser = user as FirebaseAuthTypes.User | null;
    if (!firebaseService || !rnUser) return;
    try {
      const auth = firebaseService.auth;
      const webCurrentUser = auth.currentUser as FirebaseWebUser | null;
      if (!webCurrentUser) {
        setError("No current user to unlink.");
        return;
      }
      const webGoogleProvider = webCurrentUser.providerData.find((p: FirebaseWebUserInfo) => p.providerId === GoogleAuthProvider.PROVIDER_ID);

      if (webGoogleProvider) {
        await unlink(webCurrentUser, GoogleAuthProvider.PROVIDER_ID);
        window.alert('Success, Google account unlinked successfully');
        refreshUserProfile();
      } else {
        const rnGoogleProvider = rnUser.providerData.find((p: FirebaseAuthTypes.UserInfo) => p.providerId === GoogleAuthProvider.PROVIDER_ID);
        if (rnGoogleProvider) {
             window.alert('Info: Google account appears linked via mobile. Please use the web flow to confirm or unlink.');
        } else {
            window.alert('Info, Google account not linked.');
        }
      }
    } catch (error: any) {
      window.alert(`Error: ${error.message || 'Failed to unlink Google account'}`);
    }
  };

  const handleLinkApple = async () => {
    const rnUser = user as FirebaseAuthTypes.User | null;
    if (!firebaseService || !rnUser) return;
    try {
      const auth = firebaseService.auth;
      const webCurrentUser = auth.currentUser as FirebaseWebUser | null;
      if (!webCurrentUser) {
        setError("No current user to link.");
        return;
      }
      const appleAuthProvider = new OAuthProvider('apple.com');
      await linkWithPopup(webCurrentUser, appleAuthProvider);
      window.alert('Success, Account linked with Apple successfully');
      refreshUserProfile();
    } catch (error: any) {
      window.alert(`Error: ${error.message || 'Failed to link with Apple'}`);
    }
  };

  const handleUnlinkApple = async () => {
    const rnUser = user as FirebaseAuthTypes.User | null;
    if (!firebaseService || !rnUser) return;
    try {
      const auth = firebaseService.auth;
      const webCurrentUser = auth.currentUser as FirebaseWebUser | null;
      if (!webCurrentUser) {
        setError("No current user to unlink.");
        return;
      }
      const webAppleProvider = webCurrentUser.providerData.find(p => p.providerId === 'apple.com');

      if (webAppleProvider) {
        await unlink(webCurrentUser, 'apple.com');
        window.alert('Success, Apple account unlinked successfully');
        refreshUserProfile();
      } else {
        const rnAppleProvider = rnUser.providerData.find((p: FirebaseAuthTypes.UserInfo) => p.providerId === 'apple.com');
        if (rnAppleProvider) {
             window.alert('Info: Apple account appears linked via mobile. Please use the web flow to confirm or unlink.');
        } else {
            window.alert('Info, Apple account not linked.');
        }
      }
    } catch (error: any) {
      window.alert(`Error: ${error.message || 'Failed to unlink Apple account'}`);
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

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      const user = firebaseService.auth.currentUser;
      if (user) {
        // This is a placeholder for a secure password update flow.
        // In a real app, you would re-authenticate the user before updating the password.
        setFeedback({ type: 'success', message: 'Password update functionality not fully implemented.' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message });
    }
  };

  const handleUpdateProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const { uri } = result.assets[0];
      setProfile((prev: UserProfile & { googleLinked?: boolean }) => ({ ...prev, photoURL: uri }));

      try {
        const user = firebaseService.auth.currentUser;
        if (user) {
          const storage = firebaseService.storage;
          const storageRef = ref(storage as any, `profileImages/${user.uid}`);
          
          // Convert URI to Blob
          const response = await fetch(uri);
          const blob = await response.blob();

          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          await updateProfile(user as any, {
            displayName: profile.displayName,
            photoURL: downloadURL
          });
          
          // Also update the user's profile document in Firestore if you have one
          const userDocRef = doc(firebaseService.firestore as any, 'userProfiles', user.uid);
          await setDoc(userDocRef, {
            displayName: profile.displayName,
            photoURL: downloadURL
          }, { merge: true });

          setFeedback({ type: 'success', message: 'Profile image updated successfully!' });
        }
      } catch (error: any) {
        setFeedback({ type: 'error', message: `Image upload failed: ${error.message}` });
      }
    }
  };

  const handleUpdateUser = async () => {
    try {
      const user = firebaseService.auth.currentUser;
      if (user) {
        await updateProfile(user as any, {
          displayName: profile.displayName,
          photoURL: profile.photoURL
        });

        // Also update the user's profile document in Firestore
        const userDocRef = doc(firebaseService.firestore as any, 'userProfiles', user.uid);
        await setDoc(userDocRef, {
          displayName: profile.displayName,
          photoURL: profile.photoURL
        }, { merge: true });

        setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message });
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      const user = firebaseService.auth.currentUser;
      if (user) {
        await deleteUser(user as any);
        setFeedback({ type: 'success', message: 'Account deactivated successfully.' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setFeedback({ type: 'success', message: 'Logged out successfully.' });
      // Navigation logic should be handled by the AuthContext listener
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message });
    }
  };

  const handleDeleteAccount = async () => {
    // This is a destructive action and should require re-authentication.
    Alert.alert(
      "Delete Account",
      "This is a destructive action and cannot be undone. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            const user = firebaseService.auth.currentUser;
            if (user) {
              await deleteUser(user as any);
              // After deletion, navigate away or show a confirmation message.
              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
            }
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        }}
      ]
    );
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
                className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'border-red-500 text-red-500'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-600'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile Info</span>
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 text-sm font-medium ${
                  activeTab === 'appearance'
                    ? 'border-red-500 text-red-500'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-600'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Appearance</span>
              </button>
              <button
                onClick={() => setActiveTab('additional')}
                className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 text-sm font-medium ${
                  activeTab === 'additional'
                    ? 'border-red-500 text-red-500'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-600'
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
                    onClick={handleLinkGoogle}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
                      onClick={handleUpdateProfileImage}
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
                      className="flex-1 bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent w-full"
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
                      className="flex-1 bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-secondary)] cursor-not-allowed w-full"
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

              {/* --- Font Section --- */}
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Type className="h-5 w-5" />Font</h3>
                <div className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
                  {fontOptions.map((font) => (
                    <label key={font.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="fontPreference"
                        value={font.value}
                        checked={profile.fontPreference === font.value}
                        onChange={(e) => setProfile({ ...profile, fontPreference: e.target.value as UserProfile['fontPreference'] })}
                        className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        {font.label}
                        {font.note && <span className="text-xs text-[var(--text-secondary)] ml-1">{font.note}</span>}
                      </span>
                    </label>
                  ))}
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
                        className="flex-1 bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent w-full"
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
                        className="flex-1 bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent w-full"
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
                        className="flex-1 bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent w-full"
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
                      className="w-full bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                    >
                      <option value="">Select your role</option>
                      <option value="propmaker">Props Maker</option>
                      <option value="painter">Painter</option>
                      <option value="buyer">Buyer</option>
                      <option value="senior-propmaker">Senior Props Maker</option>
                      <option value="props-supervisor">Props Supervisor</option>
                      <option value="art-director">Art Director</option>
                      <option value="set-dresser">Set Dresser</option>
                      <option value="stage-manager">Stage Manager</option>
                      <option value="assistant-stage-manager">Assistant Stage Manager</option>
                      <option value="designer">Designer</option>
                      <option value="assistant-designer">Assistant Designer</option>
                      <option value="props-carpenter">Props Carpenter</option>
                      <option value="show-carpenter">Show Carpenter</option>
                      <option value="crew">Crew</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full bg-gray-900 border border-[var(--border-color)] rounded-md px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent"
                      rows={4}
                      placeholder="Tell us about yourself"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end items-center space-x-4">
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
              className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
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
