import React, { useState, useRef } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import DashboardLayout from '../PropsBibleHomepage';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProfilePage: React.FC = () => {
  const { user, userProfile, updateUserProfile, refreshProfile } = useWebAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roleOptions: { value: string; label: string }[] = [
    { value: 'propmaker', label: 'Props Maker' },
    { value: 'painter', label: 'Painter' },
    { value: 'buyer', label: 'Buyer' },
    { value: 'senior-propmaker', label: 'Senior Props Maker' },
    { value: 'props-supervisor', label: 'Props Supervisor' },
    { value: 'art-director', label: 'Art Director' },
    { value: 'set-dresser', label: 'Set Dresser' },
    { value: 'stage-manager', label: 'Stage Manager' },
    { value: 'assistant-stage-manager', label: 'Assistant Stage Manager' },
    { value: 'designer', label: 'Designer' },
    { value: 'assistant-designer', label: 'Assistant Designer' },
  ];
  const [role, setRole] = useState<string>(userProfile?.role || 'propmaker');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateUserProfile({ displayName, photoURL, role });
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
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
    setError(null);
    try {
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      await updateUserProfile({ photoURL: url });
      await refreshProfile();
    } catch (err: any) {
      setError('Failed to upload photo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6 text-white">Profile Details</h1>
        <form onSubmit={handleSave} className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-[120px,1fr] gap-6 items-center">
            <div className="relative w-24 h-24">
              <img
                src={photoURL || '/public/icon.png'}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-pb-primary bg-pb-darker"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 bg-pb-primary text-white rounded-full p-1 shadow hover:bg-pb-secondary"
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
              >
                ✏️
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="text-pb-gray text-sm">Profile Photo</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-pb-gray text-xs mb-1">Name</label>
            <input
              className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
            </div>
            <div>
            <span className="block text-pb-gray text-xs mb-1">Email</span>
            <span className="text-lg font-semibold text-white">{userProfile?.email || user?.email || 'N/A'}</span>
            </div>
            <div>
              <label className="block text-pb-gray text-xs mb-1">Role</label>
              <select
                className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {roleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
            <span className="block text-pb-gray text-xs mb-1">Last Login</span>
            <span className="text-lg font-semibold text-white">{userProfile?.lastLogin ? new Date(userProfile.lastLogin).toLocaleString() : 'N/A'}</span>
            </div>
            <div>
            <span className="block text-pb-gray text-xs mb-1">Created At</span>
            <span className="text-lg font-semibold text-white">{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
          {userProfile?.groups && (
            <div className="mb-4">
              <span className="block text-pb-gray text-xs mb-1">Groups</span>
              <span className="text-sm text-white bg-pb-primary/10 rounded p-2 block font-mono">
                {JSON.stringify(userProfile.groups, null, 2)}
              </span>
            </div>
          )}
          {error && <div className="mb-2 text-red-400 font-semibold">{error}</div>}
          <button
            type="submit"
            className="px-4 py-2 rounded bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary transition-colors"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage; 