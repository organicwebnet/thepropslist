import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useParams, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import type { Show } from '../types/Show';
import { Pencil, UserPlus } from 'lucide-react';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import { buildInviteEmailDocTo } from '../services/EmailService';

const ShowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService } = useFirebase();
  const { user } = useWebAuth();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueAddresses, setVenueAddresses] = useState<any[]>([]);
  const [rehearsalAddresses, setRehearsalAddresses] = useState<any[]>([]);
  const [storageAddresses, setStorageAddresses] = useState<any[]>([]);

  // Job roles (for collaborator job function, not permissions)
  const JOB_ROLES = [
    { value: 'propmaker', label: 'Prop Maker' },
    { value: 'senior-propmaker', label: 'Senior Prop Maker' },
    { value: 'props-carpenter', label: 'Props Carpenter' },
    { value: 'show-carpenter', label: 'Show Carpenter' },
    { value: 'painter', label: 'Painter' },
    { value: 'buyer', label: 'Buyer' },
    { value: 'props-supervisor', label: 'Props Supervisor' },
    { value: 'art-director', label: 'Art Director' },
    { value: 'set-dresser', label: 'Set Dresser' },
    { value: 'stage-manager', label: 'Stage Manager' },
    { value: 'assistant-stage-manager', label: 'Assistant Stage Manager' },
    { value: 'designer', label: 'Designer' },
    { value: 'assistant-designer', label: 'Assistant Designer' },
    { value: 'crew', label: 'Crew' },
  ] as const;

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteJobRole, setInviteJobRole] = useState<string>('propmaker');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'props_supervisor' | 'god'>('viewer');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const unsubscribe = firebaseService.listenToDocument<Show>(
      `shows/${id}`,
      (doc) => {
        if (doc && doc.data) {
          setShow({ ...doc.data, id: doc.id });
          setError(null);
        } else {
          setShow(null);
          setError('Show not found.');
        }
        setLoading(false);
      },
      () => {
        setError('Failed to load show details.');
        setShow(null);
        setLoading(false);
      }
    );
    return () => unsubscribe && unsubscribe();
  }, [id, firebaseService]);

  useEffect(() => {
    if (show && show.venueIds?.length) {
      firebaseService.getDocuments('addresses', { where: [['type', '==', 'venue']] })
        .then(docs => setVenueAddresses(docs.filter(doc => show.venueIds?.includes(doc.id)).map(doc => ({ ...doc.data, id: doc.id }))));
    }
    if (show && show.rehearsalAddressIds?.length) {
      firebaseService.getDocuments('addresses', { where: [['type', '==', 'rehearsal']] })
        .then(docs => setRehearsalAddresses(docs.filter(doc => show.rehearsalAddressIds?.includes(doc.id)).map(doc => ({ ...doc.data, id: doc.id }))));
    }
    if (show && show.storageAddressIds?.length) {
      firebaseService.getDocuments('addresses', { where: [['type', '==', 'storage']] })
        .then(docs => setStorageAddresses(docs.filter(doc => show.storageAddressIds?.includes(doc.id)).map(doc => ({ ...doc.data, id: doc.id }))));
    }
  }, [show]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64">
      <svg className="animate-spin h-10 w-10 text-pb-primary mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
      <div className="text-pb-gray mt-2">Loading show details...</div>
    </div>
  );
  if (error) return (
    <div className="text-red-500 text-center mt-8">
      {error}<br/>
      <Link to="/shows" className="text-pb-primary underline">Back to Shows</Link>
    </div>
  );
  if (!show) return null;

  // Helper for rendering lists
  const renderList = (
    items: any[] | undefined,
    label: string,
    getItem: (item: any, idx: number) => React.ReactNode
  ) => (
    Array.isArray(items) && items.length > 0 && (
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">{label}</h2>
        <ul className="list-disc list-inside text-pb-gray">
          {items.map((item, idx) => getItem(item, idx))}
        </ul>
      </div>
    )
  );

  return ( 
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="w-full max-w-6xl mx-auto bg-pb-darker/60 rounded-xl shadow-lg p-8 my-8 relative">
          {/* Edit Button */}
          <button
            onClick={() => id && window.location.assign(`/shows/${id}/edit`)}
            className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white shadow transition focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
            aria-label="Edit Show"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:gap-8 mb-6">
            {show.logoImage?.url ? (
              <img
                src={show.logoImage.url}
                alt={show.name ? `${show.name} Logo` : 'Show Logo'}
                className="w-32 h-32 object-cover rounded-lg mb-4 md:mb-0 bg-pb-darker border border-pb-primary/30"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center rounded-lg mb-4 md:mb-0 bg-pb-darker border border-pb-primary/30 text-pb-gray text-xs">
                No Logo
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{show.name}</h1>
              {show.status && (
                <span className="inline-block px-3 py-1 rounded-full bg-pb-primary/20 text-pb-primary text-xs font-semibold mb-2">{show.status}</span>
              )}
              {show.description && <p className="text-pb-gray mb-2">{show.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-pb-primary/80 mb-2">
                {show.startDate && (
                  <span>Start: {show.startDate.toDate ? show.startDate.toDate().toLocaleDateString() : String(show.startDate)}</span>
                )}
                {show.endDate && (
                  <span>End: {show.endDate.toDate ? show.endDate.toDate().toLocaleDateString() : String(show.endDate)}</span>
                )}
                {show.isTouringShow && <span className="text-pb-accent">Touring Show</span>}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-pb-primary/20 text-pb-primary hover:bg-pb-primary/30"
            >
              <UserPlus className="w-4 h-4" /> Invite team
            </button>
            <button
              onClick={() => window.location.assign(`/shows/${show.id}/team`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-pb-primary/20 text-pb-primary hover:bg-pb-primary/30"
            >
              Manage team
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Production</h2>
              <div className="text-pb-gray text-sm mb-1">Company: {show.productionCompany}</div>
              <div className="text-pb-gray text-sm mb-1">Stage Manager: {show.stageManager} {show.stageManagerEmail && (<span className="ml-2 text-xs">({show.stageManagerEmail})</span>)}</div>
              <div className="text-pb-gray text-sm mb-1">Props Supervisor: {show.propsSupervisor} {show.propsSupervisorEmail && (<span className="ml-2 text-xs">({show.propsSupervisorEmail})</span>)}</div>
              <div className="text-pb-gray text-sm mb-1">Contact: {show.productionContactName} {show.productionContactEmail && (<span className="ml-2 text-xs">({show.productionContactEmail})</span>)}</div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Meta</h2>
              <div className="text-pb-gray text-sm mb-1">Created: {show.createdAt ? (show.createdAt.toDate ? show.createdAt.toDate().toLocaleDateString() : String(show.createdAt)) : '-'}</div>
              <div className="text-pb-gray text-sm mb-1">Updated: {show.updatedAt ? (show.updatedAt.toDate ? show.updatedAt.toDate().toLocaleDateString() : String(show.updatedAt)) : '-'}</div>
              <div className="text-pb-gray text-sm mb-1">Owner/User ID: {show.userId}</div>
            </div>
          </div>

          {/* Venue Information */}
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Venue(s)</h2>
            <div className="space-y-4">
              {venueAddresses.length === 0 ? <p className="text-[var(--text-primary)]">Not specified</p> : venueAddresses.map(addr => (
                <div key={addr.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="font-medium text-[var(--text-primary)]">{addr.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{[addr.street1, addr.street2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Rehearsal Spaces */}
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Rehearsal Space(s)</h2>
            <div className="space-y-4">
              {rehearsalAddresses.length === 0 ? <p className="text-[var(--text-primary)]">Not specified</p> : rehearsalAddresses.map(addr => (
                <div key={addr.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="font-medium text-[var(--text-primary)]">{addr.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{[addr.street1, addr.street2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Storage Spaces */}
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Storage Space(s)</h2>
            <div className="space-y-4">
              {storageAddresses.length === 0 ? <p className="text-[var(--text-primary)]">Not specified</p> : storageAddresses.map(addr => (
                <div key={addr.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="font-medium text-[var(--text-primary)]">{addr.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{[addr.street1, addr.street2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
          {renderList(show.venues, 'Venues', (venue, idx) => <li key={idx}>{venue.name || venue}</li>)}
          {renderList(show.contacts, 'Contacts', (contact, idx) => <li key={idx}>{contact.name || contact}</li>)}
          {renderList(show.collaborators, 'Collaborators', (collab, idx) => <li key={idx}>{collab.name || collab.email || collab}</li>)}
          {renderList(show.acts, 'Acts', (act, idx) => <li key={idx}>{act.name || act}</li>)}
          {renderList(show.rehearsalAddresses, 'Rehearsal Addresses', (addr, idx) => <li key={idx}>{addr.address || addr}</li>)}
          {renderList(show.storageAddresses, 'Storage Addresses', (addr, idx) => <li key={idx}>{addr.address || addr}</li>)}
          {show.team && Array.isArray(show.team) && show.team.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white mb-1">Team</h2>
              <ul className="list-disc list-inside text-pb-gray">
                {show.team.map((member: any, idx: number) => (
                  <li key={idx}>{member.uid} ({member.role})</li>
                ))}
              </ul>
            </div>
          )}
          <Link to="/shows" className="inline-block mt-4 text-pb-primary underline">← Back to Shows</Link>
        </div>

        {/* Invite teammate modal */}
        {inviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="w-full max-w-md rounded-lg bg-[#12121a] border border-pb-primary/20 shadow-xl">
              <div className="px-5 py-4 border-b border-pb-primary/20 flex items-center justify-between">
                <h3 className="text-white text-lg font-semibold">Invite teammate</h3>
                <button
                  onClick={() => {
                    if (!inviteSubmitting) setInviteOpen(false);
                  }}
                  className="text-pb-gray hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setInviteError(null);
                  if (!show?.id) return;
                  if (!inviteEmail || !inviteEmail.includes('@')) {
                    setInviteError('Please enter a valid email');
                    return;
                  }
                  // Prevent inviting an email that already has an Auth account
                  try {
                    const methods = await fetchSignInMethodsForEmail(getAuth(), inviteEmail);
                    if (Array.isArray(methods) && methods.length > 0) {
                      setInviteError('This email is already registered. Ask them to sign in and open the invite link, or add them directly as a collaborator.');
                      return;
                    }
                  } catch (authCheckErr) {
                    console.warn('Email check failed', authCheckErr);
                  }
                  setInviteSubmitting(true);
                  const token = crypto.randomUUID();
                  try {
                    const inviteUrl = `${window.location.origin}/join/${token}`;
                    await firebaseService.setDocument('invitations', token, {
                      showId: show.id,
                      role: inviteRole,
                      jobRole: inviteJobRole,
                      inviterId: user?.uid || show.userId,
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                      email: inviteEmail,
                      name: inviteName || null,
                    });

                    // Enqueue email for MailerSend extension (web-app only path)
                    let mailQueued = false;
                    try {
                      const emailDoc = buildInviteEmailDocTo(inviteEmail, {
                        showName: show.name,
                        inviteUrl,
                        inviteeName: inviteName || null,
                        role: inviteRole,
                        jobRoleLabel: JOB_ROLES.find(r=>r.value===inviteJobRole)?.label || inviteJobRole,
                      });
                      // MailerSend extension is configured to watch 'emails' collection
                      await firebaseService.addDocument('emails', emailDoc);
                      mailQueued = true;
                    } catch (mailErr) {
                      console.warn('Failed to enqueue MailerSend email; invite link still created', mailErr);
                    }
                    // User feedback
                    if (mailQueued) {
                      alert('Invite created and email queued. Watch your inbox.');
                    } else {
                      alert('Invite link created, but email could not be queued. You can copy and share the link manually.');
                    }

                    setInviteOpen(false);
                    setInviteName('');
                    setInviteEmail('');
                    setInviteJobRole('propmaker');
                    setInviteRole('viewer');
                  } catch (err: any) {
                    console.error(err);
                    setInviteError(err?.message || 'Failed to create invite');
                  } finally {
                    setInviteSubmitting(false);
                  }
                }}
                className="px-5 py-4 space-y-4"
              >
                {inviteError && (
                  <div className="p-2 rounded border border-red-500/30 text-red-300 bg-red-500/10 text-sm">{inviteError}</div>
                )}
                <div>
                  <label className="block text-sm text-pb-gray mb-1">Name</label>
                  <input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    type="text"
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                    placeholder="e.g. Alex Props"
                  />
                </div>
                <div>
                  <label className="block text-sm text-pb-gray mb-1">Email</label>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    required
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                    placeholder="invitee@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-pb-gray mb-1">Job role</label>
                  <select
                    value={inviteJobRole}
                    onChange={(e) => setInviteJobRole(e.target.value)}
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                  >
                    {JOB_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-pb-gray mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="props_supervisor">Props Supervisor</option>
                    <option value="god">Admin</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !inviteSubmitting && setInviteOpen(false)}
                    className="px-4 py-2 rounded border border-pb-primary/30 text-pb-gray hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="px-4 py-2 rounded bg-pb-primary text-white hover:bg-pb-accent disabled:opacity-50"
                  >
                    {inviteSubmitting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShowDetailPage; 