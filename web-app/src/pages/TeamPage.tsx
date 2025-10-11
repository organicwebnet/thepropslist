import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useParams, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import type { Show } from '../types/Show';
import { buildInviteEmailDocTo, buildReminderEmailDoc } from '../services/EmailService';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useLimitChecker } from '../hooks/useLimitChecker';
import { ROLE_OPTIONS, JOB_ROLES } from '../constants/roleOptions';

type Invitation = {
  id?: string;
  showId: string;
  role: string;
  jobRole?: string;
  inviterId?: string;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt?: string;
  expiresAt?: string;
  email: string;
  name?: string | null;
};

const TeamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // const _navigate = useNavigate();
  const { service, user } = useFirebase() as any;
  const [show, setShow] = useState<Show | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteJobRole, setInviteJobRole] = useState<string>('propmaker');
  const [inviteRole, setInviteRole] = useState<string>('propmaker');
  const [submitting, setSubmitting] = useState(false);
  const { checkCollaboratorsLimitForShow } = useLimitChecker();
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Check limits on page load and when collaborators change
  useEffect(() => {
    const checkLimits = async () => {
      if (!id || !user?.uid) return;
      
      try {
        const limitCheck = await checkCollaboratorsLimitForShow(id);
        if (!limitCheck.withinLimit) {
          setLimitWarning(limitCheck.message || 'Collaborators limit reached');
        } else {
          setLimitWarning(null);
        }
      } catch (error) {
        console.error('Error checking collaborators limits:', error);
        // Don't show error to user, just log it
      }
    };

    checkLimits();
  }, [id, user?.uid, collaborators.length, checkCollaboratorsLimitForShow]);

  // const _showId = id || show?.id || '';

  useEffect(() => {
    if (!id) return;
    const unsub = service.listenToDocument(`shows/${id}`,
      (doc: any) => {
        const showData = { ...doc.data, id: doc.id } as Show;
        setShow(showData);
        setCollaborators(Array.isArray(showData.collaborators) ? showData.collaborators : []);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => { if (unsub) unsub(); };
  }, [service, id]);

  useEffect(() => {
    if (!id) return;
    const unsub = service.listenToCollection('invitations', (docs: any) => {
      const list = docs
        .map((d: any) => ({ ...(d.data as any), id: d.id }))
        .filter((d: any) => d.showId === id && (d.status === 'pending' || !d.status));
      setInvites(list);
    }, () => { /* ignore */ }, { where: [['showId', '==', id as any]] });
    return () => { if (unsub) unsub(); };
  }, [service, id]);

  // Use shared role options for consistency

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail) return;
    
    // Check collaborators limit before inviting
    try {
      const limitCheck = await checkCollaboratorsLimitForShow(id);
      if (!limitCheck.withinLimit) {
        setError(limitCheck.message || 'Collaborators limit reached');
        return;
      }
    } catch (limitError) {
      console.error('Error checking collaborators limits:', limitError);
      setError('Error checking limits. Please try again.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      // Prevent inviting an email that already has an Auth account
      try {
        const methods = await fetchSignInMethodsForEmail(getAuth(), inviteEmail);
        if (Array.isArray(methods) && methods.length > 0) {
          setError('This email is already registered. Ask them to sign in and open the invite link, or add them directly as a collaborator.');
          setSubmitting(false);
          return;
        }
      } catch (authCheckErr) {
        console.warn('Email check failed', authCheckErr);
      }
      const inviteData: Invitation = {
        showId: id,
        role: inviteRole,
        jobRole: inviteJobRole,
        inviterId: user?.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        email: inviteEmail,
        name: inviteName || null,
      };
      const docId = await service.addDocument('invitations', inviteData);
      const inviteUrl = `${window.location.origin}/join/${docId}`;
      const emailDoc = buildInviteEmailDocTo(inviteEmail, {
        showName: show?.name || 'this show',
        inviteUrl,
        inviteeName: inviteName || null,
        role: inviteRole,
        jobRoleLabel: JOB_ROLES.find(r => r.value === inviteJobRole)?.label || inviteJobRole,
      });
      await service.addDocument('emails', emailDoc);
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteJobRole('propmaker');
      setInviteRole('propmaker');
      alert('Invite email queued.');
    } catch (e: any) {
      setError(e.message || 'Failed to send invite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    try {
      const inviteUrl = `${window.location.origin}/join/${inv.id}`;
      const emailDoc = buildReminderEmailDoc(inv.email, {
        showName: show?.name || 'this show',
        inviteUrl,
        inviteeName: inv.name || null,
        role: inv.role || 'viewer',
      });
      await service.addDocument('emails', emailDoc);
      alert('Reminder email queued.');
    } catch (e) {
      alert('Failed to resend.');
    }
  };

  const handleRevoke = async (inv: Invitation) => {
    if (!inv.id) return;
    try {
      await service.setDocument('invitations', inv.id, { ...inv, status: 'revoked' } as any, { merge: true });
    } catch (err) { /* ignore */ }
  };

  const handleRoleChange = async (email: string, role: 'editor' | 'viewer') => {
    if (!show) return;
    const next = (show.collaborators || []).map((c: any) => c.email === email ? { ...c, role } : c);
    await service.updateDocument('shows', show.id, { collaborators: next } as any);
  };

  const handleRemove = async (email: string) => {
    if (!show) return;
    const next = (show.collaborators || []).filter((c: any) => c.email !== email);
    await service.updateDocument('shows', show.id, { collaborators: next } as any);
  };

  if (loading) return <DashboardLayout><div className="text-pb-gray">Loading team…</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="text-red-400">{error}</div></DashboardLayout>;
  if (!show) return <DashboardLayout><div className="text-pb-gray">Show not found.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* Limit Warning Banner */}
      {limitWarning && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-red-200 font-semibold mb-1">Subscription Limit Reached</div>
              <div className="text-red-100 text-sm mb-3">{limitWarning}</div>
              <a 
                href="/profile"
                className="inline-block px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg font-semibold transition-colors text-sm"
              >
                Upgrade Plan
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Team · {show.name}</h1>
            <p className="text-pb-gray text-sm">Manage collaborators and invitations.</p>
          </div>
          <Link to={`/shows/${show.id}`} className="text-pb-primary underline">← Back to show</Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Collaborators</h2>
            <button onClick={() => setInviteOpen(v => !v)} className="px-3 py-1.5 rounded bg-pb-primary text-white text-sm font-semibold">Invite teammate</button>
          </div>
          {inviteOpen && (
            <form onSubmit={handleInvite} className="mb-4 bg-pb-darker/50 p-4 rounded border border-pb-primary/20 space-y-4">
              <div>
                <label className="block text-sm text-pb-gray mb-1">Name</label>
                <input placeholder="e.g. Alex Props" className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteName} onChange={e => setInviteName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-pb-gray mb-1">Email</label>
                <input type="email" placeholder="invitee@example.com" required className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-pb-gray mb-1">Job role</label>
                <select className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteJobRole} onChange={e => setInviteJobRole(e.target.value)}>
                  {JOB_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-pb-gray mb-1">Role</label>
                <select className="w-full rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}>
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="px-3 py-2 rounded bg-pb-darker/60 text-pb-gray border border-pb-primary/20">Cancel</button>
                <button disabled={submitting} className="px-3 py-2 rounded bg-pb-primary text-white font-semibold disabled:opacity-60">{submitting ? 'Sending…' : 'Send invite'}</button>
              </div>
            </form>
          )}

          <div className="rounded border border-pb-primary/20 bg-pb-darker/40 divide-y divide-pb-primary/10">
            {(collaborators || []).length === 0 ? (
              <div className="p-4 text-pb-gray">No collaborators yet.</div>
            ) : (
              (collaborators || []).map((c: any) => (
                <div key={c.email} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{c.email}</div>
                    <div className="text-xs text-pb-gray">Added by {c.addedBy || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={c.role} onChange={e => handleRoleChange(c.email, e.target.value as any)} className="rounded bg-[#1A1A1A] border border-pb-primary/40 px-2 py-1 text-white text-sm">
                      {ROLE_OPTIONS.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                    <button onClick={() => handleRemove(c.email)} className="px-2 py-1 rounded bg-pb-darker/60 text-pb-gray border border-pb-primary/20 text-sm">Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Pending invites</h2>
          <div className="rounded border border-pb-primary/20 bg-pb-darker/40 divide-y divide-pb-primary/10">
            {invites.length === 0 ? (
              <div className="p-4 text-pb-gray">No pending invites.</div>
            ) : invites.map(inv => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{inv.name || 'Invitee'} &lt;{inv.email}&gt;</div>
                  <div className="text-xs text-pb-gray">Role: {inv.role} · Status: {inv.status || 'pending'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleResend(inv)} className="px-2 py-1 rounded bg-pb-primary text-white text-sm">Resend</button>
                  <button onClick={() => handleRevoke(inv)} className="px-2 py-1 rounded bg-pb-darker/60 text-pb-gray border border-pb-primary/20 text-sm">Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;


