import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import type { Show } from '../types/Show';

type Invitation = {
  id?: string;
  showId: string;
  role: string;
  inviterId?: string;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt?: string;
  expiresAt?: string;
  email: string;
  name?: string | null;
};

const TeamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [submitting, setSubmitting] = useState(false);

  const showId = id || show?.id || '';

  useEffect(() => {
    if (!id) return;
    const unsub = service.listenToDocument<Show>(`shows/${id}`,
      doc => {
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
    const unsub = service.listenToCollection<Invitation>('invitations', docs => {
      const list = docs
        .map(d => ({ ...(d.data as any), id: d.id }))
        .filter((d: any) => d.showId === id && (d.status === 'pending' || !d.status));
      setInvites(list);
    }, () => {}, { where: [['showId', '==', id as any]] });
    return () => { if (unsub) unsub(); };
  }, [service, id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail) return;
    setSubmitting(true);
    setError(null);
    try {
      const inviteData: Invitation = {
        showId: id,
        role: inviteRole,
        inviterId: user?.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        email: inviteEmail,
        name: inviteName || null,
      };
      const docId = await service.addDocument('invitations', inviteData);
      const inviteUrl = `${window.location.origin}/join/${docId}`;
      const emailDoc = {
        from: { email: 'info@thepropslist.uk', name: 'The Props List' },
        to: [{ email: inviteEmail, name: inviteName || 'Invitee' }],
        subject: `You’re invited to join ${show?.name || 'this show'} on The Props List`,
        html: `<div style="background:#0b0b12;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;border:1px solid #1f2937;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:#0f172a;border-bottom:1px solid #1f2937;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;">The Props List</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px 0;">Hello${inviteName ? ` ${inviteName}` : ''},</p>
              <p style="margin:0 0 16px 0;">You’ve been invited as <strong>${inviteRole}</strong> on <strong>${show?.name || 'this show'}</strong>.</p>
              <p style="margin:0 0 24px 0;">Click the button below to accept your invite.</p>
              <p style="margin:0 0 24px 0;">
                <a href="${inviteUrl}" style="display:inline-block;background:#06b6d4;color:#0b0b12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Accept invite</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:13px;">If the button doesn’t work, copy and paste this link into your browser:<br/>
              <span style="word-break:break-all;color:#cbd5e1;">${inviteUrl}</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#0f172a;border-top:1px solid #1f2937;color:#94a3b8;font-size:12px;">
              <div>Sent by The Props List • thepropslist.uk</div>
            </td>
          </tr>
        </table>
      </div>`,
        text: `Hello${inviteName ? ` ${inviteName}` : ''},\n\nYou’ve been invited as ${inviteRole} on ${show?.name || 'this show'}.\n\nAccept your invite: ${inviteUrl}\n\nIf the link doesn’t work, copy and paste it into your browser.\n\nThe Props List • thepropslist.uk`,
        replyTo: { email: 'info@thepropslist.uk', name: 'The Props List' },
      } as any;
      await service.addDocument('emails', emailDoc);
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('viewer');
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
      const emailDoc = {
        from: { email: 'info@thepropslist.uk', name: 'The Props List' },
        to: [{ email: inv.email, name: inv.name || 'Invitee' }],
        subject: `Reminder: join ${show?.name || 'this show'} on The Props List`,
        html: `<p>Hello${inv.name ? ` ${inv.name}` : ''},</p><p>This is a quick reminder to accept your invite to <b>${show?.name || 'this show'}</b>.</p><p><a href="${inviteUrl}">Accept invite</a></p>`,
        text: `Hello${inv.name ? ` ${inv.name}` : ''}, Reminder to accept your invite: ${inviteUrl}`,
        replyTo: { email: 'info@thepropslist.uk', name: 'The Props List' },
      } as any;
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
    } catch {}
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
            <form onSubmit={handleInvite} className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-pb-darker/50 p-4 rounded border border-pb-primary/20">
              <input placeholder="Full name" className="rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteName} onChange={e => setInviteName(e.target.value)} />
              <input type="email" placeholder="Email" required className="rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <select className="rounded bg-[#1A1A1A] border border-pb-primary/40 px-3 py-2 text-white" value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <div className="flex gap-2">
                <button disabled={submitting} className="px-3 py-2 rounded bg-pb-primary text-white font-semibold disabled:opacity-60">{submitting ? 'Sending…' : 'Send invite'}</button>
                <button type="button" onClick={() => setInviteOpen(false)} className="px-3 py-2 rounded bg-pb-darker/60 text-pb-gray border border-pb-primary/20">Cancel</button>
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
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
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


