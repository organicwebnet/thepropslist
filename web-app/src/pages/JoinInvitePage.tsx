import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';

type InviteDoc = {
  showId: string;
  inviterId?: string;
  role: string;
  presetName?: string;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt?: string;
  expiresAt?: string;
  collaborator?: {
    name?: string;
    email?: string;
    phone?: string;
    googleProfileUrl?: string;
    avatarUrl?: string;
  };
};

const JoinInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { service } = useFirebase();
  const [invite, setInvite] = useState<InviteDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [googleProfileUrl, setGoogleProfileUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'google' | 'password'>('google');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      console.log('[JoinInvite] token:', token);
      try {
        const docSnap = await service.getDocument<InviteDoc>('invitations', token);
        console.log('[JoinInvite] docSnap:', docSnap);
        if (!docSnap || !docSnap.data) {
          // Debug: try list a few invites to confirm read access
          try {
            const sample = await service.getDocuments<InviteDoc>('invitations', { limit: 3 });
            console.log('[JoinInvite] sample invitations count:', sample.length, sample.map(s => s.id));
          } catch (e) {
            console.warn('[JoinInvite] listing invitations failed', e);
          }
          setError('Invite not found or has been revoked. Please ask your inviter to regenerate the link.');
          setLoading(false);
          return;
        }
        const data = docSnap.data as InviteDoc;
        setInvite(data);
        if (data?.collaborator) {
          setName(data.collaborator.name || '');
          setEmail(data.collaborator.email || '');
          setPhone(data.collaborator.phone || '');
          setGoogleProfileUrl(data.collaborator.googleProfileUrl || '');
          setAvatarUrl(data.collaborator.avatarUrl || '');
        }
        setLoading(false);
      } catch (e) {
        setError('Failed to load invite.');
        setLoading(false);
      }
    };
    run();
  }, [service, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !token) return;
    setSubmitting(true);
    try {
      // Ensure the invited user has an auth account
      const auth = getAuth();
      let currentUser = auth.currentUser;
      if (!currentUser) {
        if (activeTab === 'password') {
          if (!email) throw new Error('Email is required.');
          if (password.length < 6) throw new Error('Password must be at least 6 characters.');
          if (password !== confirmPassword) throw new Error('Passwords do not match.');
          await createUserWithEmailAndPassword(auth, email, password);
          currentUser = auth.currentUser;
        } else {
          throw new Error('Please sign in with Google or create a password.');
        }
      }
      await service.setDocument('invitations', token, {
        ...invite,
        collaborator: { name, email, phone, googleProfileUrl, avatarUrl },
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: currentUser?.uid || null,
      }, { merge: true });
      // After joining, go to home if signed in, otherwise login
      if (getAuth().currentUser) {
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const profile = res?.user;
      if (profile) {
        setName(profile.displayName || name);
        setEmail(profile.email || email);
        setAvatarUrl(profile.photoURL || avatarUrl);
      }
    } catch (e) {
      console.warn('Google sign-in failed', e);
    }
  };

  return (
      <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center px-4 py-10">
        {loading ? (
          <div className="text-white">Loading invite...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : !invite ? null : (
          <div className="w-full max-w-lg bg-pb-darker/60 rounded-xl shadow-lg p-6">
            <h1 className="text-xl font-bold text-white mb-2">Join show</h1>
            <div className="text-pb-gray mb-4">You are invited to join this production as <span className="text-pb-primary font-semibold">{invite.role}</span>.</div>
            <div className="mb-4 flex border-b border-pb-primary/20">
              <button type="button" onClick={() => setActiveTab('google')} className={`px-3 py-2 text-sm ${activeTab === 'google' ? 'text-white border-b-2 border-pb-primary' : 'text-pb-gray'}`}>Sign in with Google</button>
              <button type="button" onClick={() => setActiveTab('password')} className={`px-3 py-2 text-sm ${activeTab === 'password' ? 'text-white border-b-2 border-pb-primary' : 'text-pb-gray'}`}>Email & Password</button>
            </div>
            {activeTab === 'google' && (
              <div className="mb-3">
                <div className="mb-3 rounded border border-pb-primary/30 bg-pb-darker/40 p-3 text-sm text-pb-gray">
                  Sign in with Google to verify your email. Only your name (editable) and optional phone are needed here.
                </div>
                <button type="button" onClick={handleGoogle} className="px-3 py-2 rounded bg-white text-[#1a1a1a] font-semibold shadow hover:bg-gray-100 flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.3h147.2c-6.3 34-25 62.8-53.3 82.1v68h86.1c50.4-46.4 81.5-114.8 81.5-195z"/><path fill="#34A853" d="M272 544.3c72.9 0 134.1-24.1 178.8-65.9l-86.1-68c-23.9 16.1-54.5 25.7-92.7 25.7-71 0-131.2-47.9-152.8-112.2H31.9v70.4C76.4 486.6 168.1 544.3 272 544.3z"/><path fill="#4A90E2" d="M119.2 324c-10.9-32.7-10.9-68.1 0-100.8V152.7H31.9c-43.9 87.8-43.9 193.9 0 281.7l87.3-70.4z"/><path fill="#FBBC05" d="M272 107.7c39.6-.6 77.7 14 106.7 41.5l79.5-79.5C405.9 24.7 344.7 0 272 0 168.1 0 76.4 57.7 31.9 152.7l87.3 70.4C140.8 155 201 107.1 272 107.7z"/></svg>
                  Sign in with Google
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-pb-gray mb-1">Full name</label>
                <input className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              {activeTab === 'password' && (
                <div>
                  <label className="block text-sm text-pb-gray mb-1">Email</label>
                  <input type="email" className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              )}
              {activeTab === 'password' && (
                <>
                  <div>
                    <label className="block text-sm text-pb-gray mb-1">Create password</label>
                    <input type="password" className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-pb-gray mb-1">Confirm password</label>
                    <input type="password" className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm text-pb-gray mb-1">Phone (optional)</label>
                <input className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              {activeTab === 'password' && (
                <>
                  <div>
                    <label className="block text-sm text-pb-gray mb-1">Google profile URL (optional)</label>
                    <input className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={googleProfileUrl} onChange={e => setGoogleProfileUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-pb-gray mb-1">Avatar URL (optional)</label>
                    <input className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Link to={`/shows/${invite.showId}`} className="px-4 py-2 rounded bg-pb-darker/60 text-pb-gray border border-pb-primary/20">Cancel</Link>
                <button disabled={submitting} className="px-4 py-2 rounded bg-pb-primary text-white font-semibold hover:bg-pb-secondary disabled:opacity-60">{submitting ? 'Joining...' : 'Join show'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
  );
};

export default JoinInvitePage;


