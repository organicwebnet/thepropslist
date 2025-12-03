import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { Show } from '../types/Show';
import { Pencil, UserPlus, MoreVertical } from 'lucide-react';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { showNeedsAttention, getMissingShowDetails } from '../utils/showUtils';
import ShowActionsModal from '../components/ShowActionsModal';
import { ShowUserControls } from '../components/ShowUserControls';
import { JOB_ROLES } from '../constants/roleOptions';

const ShowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { service: firebaseService } = useFirebase();
  const { user } = useWebAuth();
  const { canInviteTeamMembers } = usePermissions();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueAddresses, setVenueAddresses] = useState<any[]>([]);
  const [rehearsalAddresses, setRehearsalAddresses] = useState<any[]>([]);
  const [storageAddresses, setStorageAddresses] = useState<any[]>([]);

  // Use shared role options for consistency

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteJobRole, setInviteJobRole] = useState<string>('propmaker');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [showActionsOpen, setShowActionsOpen] = useState(false);


  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const unsubscribe = firebaseService.listenToDocument<Show>(
      `shows/${id}`,
      (doc) => {
        if (doc && doc.data) {
          const showData = { ...doc.data, id: doc.id };
          console.log('ShowDetailPage: Loaded show data:', showData);
          console.log('ShowDetailPage: Logo data:', showData.logoImage);
          console.log('ShowDetailPage: Acts data:', showData.acts);
          console.log('ShowDetailPage: Team data:', showData.team);
          console.log('ShowDetailPage: Team type:', typeof showData.team);
          console.log('ShowDetailPage: Team is array:', Array.isArray(showData.team));
          setShow(showData);
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

  // Auto-dismiss success notification after 2 seconds
  useEffect(() => {
    if (inviteSuccess) {
      const timer = setTimeout(() => {
        setInviteSuccess(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [inviteSuccess]);

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

  // Compute current user's role for this show
  const currentUid = user?.uid || '';
  const teamMap: Record<string, string> | null = (show.team && !Array.isArray(show.team)) ? (show.team as any) : null;
  const myRoleFromTeam = currentUid && teamMap ? teamMap[currentUid] : undefined as any;
  const myRoleFromCollab = (user?.email && Array.isArray(show.collaborators)) ? (show.collaborators as any[]).find((c: any) => c?.email === user?.email)?.role : undefined;
  const myRole = myRoleFromTeam || myRoleFromCollab || 'viewer';
  const canInvite = (myRole === 'god' || myRole === 'props_supervisor') || (user?.uid && user.uid === show.userId);


  return ( 
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="w-full max-w-6xl mx-auto bg-pb-darker/60 rounded-xl shadow-lg p-8 my-4 md:my-6 lg:my-8">
          {/* Header Section - Title and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            {/* Show Info */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {show.logoImage?.url ? (
                <img
                  src={show.logoImage.url}
                  alt={show.name ? `${show.name} Logo` : 'Show Logo'}
                  className="w-24 h-24 object-cover rounded-xl bg-pb-darker border border-pb-primary/30 flex-shrink-0"
                  onError={e => { 
                    console.error('Logo image failed to load:', show.logoImage);
                    (e.currentTarget as HTMLImageElement).style.display = 'none'; 
                  }}
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center rounded-xl bg-pb-darker border border-pb-primary/30 text-pb-gray text-xs flex-shrink-0">
                  No Logo
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-white">{show.name}</h1>
                  {showNeedsAttention(show) && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1" title={`Missing: ${getMissingShowDetails(show).join(', ')}`}>
                        <svg className="w-5 h-5 text-pb-warning" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-pb-warning font-medium">Needs attention</span>
                      </div>
                      <button
                        onClick={() => id && window.location.assign(`/shows/${id}/edit`)}
                        className="px-3 py-1.5 rounded-md bg-pb-warning text-black text-sm hover:opacity-90 flex items-center gap-2"
                        title={`Missing: ${getMissingShowDetails(show).join(', ')}`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Complete details ({getMissingShowDetails(show).length})
                      </button>
                    </div>
                  )}
                </div>
                {show.status && (
                  <span className="inline-block px-3 py-1 rounded-full bg-pb-primary/20 text-pb-primary text-sm font-semibold mb-3">{show.status}</span>
                )}
                {show.description && <p className="text-pb-gray/90 mb-3 leading-relaxed">{show.description}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => id && navigate(`/shows/${id}/edit`)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-medium shadow transition focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                aria-label="Edit Show"
              >
                <Pencil className="w-4 h-4" />
                Edit Show
              </button>
              
              <button
                onClick={() => setShowActionsOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-pb-darker/80 hover:bg-pb-primary/20 text-pb-gray hover:text-white border border-pb-primary/30 transition focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                aria-label="Show Actions"
              >
                <MoreVertical className="w-4 h-4" />
                Actions
              </button>
            </div>
          </div>

          {/* Team Management Section */}
          {canInvite && (
            <div className="mb-8 p-6 bg-pb-darker/40 rounded-xl border border-pb-primary/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Team Management</h2>
                  <p id="invite-description" className="text-pb-gray/80 text-sm">Invite team members and manage permissions for this show</p>
                </div>
                <div className="flex gap-3">
                  {/* Only show invite button for admin users */}
                  {canInviteTeamMembers && (
                    <button
                      onClick={() => {
                        if (!user) {
                          alert('Please sign in to send invites.');
                          window.location.assign('/login');
                          return;
                        }
                        setInviteOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pb-primary/80 text-white hover:bg-pb-primary transition-colors font-medium"
                      aria-label="Invite team members to this show"
                      aria-describedby="invite-description"
                    >
                      <UserPlus className="w-4 h-4" aria-hidden="true" />
                      Invite Team
                    </button>
                  )}
                  <button
                    onClick={() => window.location.assign(`/shows/${show.id}/team`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pb-accent/80 text-white hover:bg-pb-accent transition-colors font-medium"
                  >
                    Manage Team
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Missing Information System */}
          {showNeedsAttention(show) && (
            <div className="mb-8">
              <div className="bg-pb-warning/5 border border-pb-warning/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <svg className="w-6 h-6 text-pb-warning mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-pb-warning font-semibold text-lg">Missing information ({getMissingShowDetails(show).length})</h3>
                      <button
                        onClick={() => id && window.location.assign(`/shows/${id}/edit`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-pb-warning text-white rounded-lg hover:bg-pb-warning/80 transition-colors font-medium"
                      >
                        <Pencil className="w-4 h-4" />
                        Complete Details
                      </button>
                    </div>
                    <p className="text-pb-gray/90 text-sm mb-4">
                      Add more information to get the most out of your show and help your team work more effectively:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getMissingShowDetails(show).map((detail, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-pb-warning/10 border border-pb-warning/20 rounded-lg">
                          <div className="w-2 h-2 bg-pb-warning rounded-full flex-shrink-0"></div>
                          <div>
                            <div className="text-pb-warning font-medium text-sm capitalize">{detail}</div>
                            <div className="text-pb-gray/70 text-xs">
                              {detail === 'production information' && 'Add company, stage manager, and props supervisor details'}
                              {detail === 'venues' && 'Add venue locations where the show will be performed'}
                              {detail === 'acts and scenes' && 'Structure your show with acts and scenes for better organization'}
                              {detail === 'team members' && 'Invite team members and assign roles for collaboration'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Production Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Production Information</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-pb-primary mb-3">Company & Contacts</h3>
                  <div className="space-y-3">
                    {show.productionCompany && (
                      <div className="flex items-center gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">Company:</span>
                        <span className="text-white">{show.productionCompany}</span>
                      </div>
                    )}
                    {show.stageManager && (
                      <div className="flex items-start gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">Stage Manager:</span>
                        <div>
                          <span className="text-white">{show.stageManager}</span>
                          {show.stageManagerEmail && (
                            <div className="text-pb-gray/70 text-xs mt-1">
                              <a 
                                href={`mailto:${show.stageManagerEmail}`}
                                className="text-pb-primary hover:text-pb-accent transition-colors underline"
                              >
                                {show.stageManagerEmail}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {show.propsSupervisor && (
                      <div className="flex items-start gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">Props Supervisor:</span>
                        <div>
                          <span className="text-white">{show.propsSupervisor}</span>
                          {show.propsSupervisorEmail && (
                            <div className="text-pb-gray/70 text-xs mt-1">
                              <a 
                                href={`mailto:${show.propsSupervisorEmail}`}
                                className="text-pb-primary hover:text-pb-accent transition-colors underline"
                              >
                                {show.propsSupervisorEmail}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {show.productionContactName && (
                      <div className="flex items-start gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">Contact:</span>
                        <div>
                          <span className="text-white">{show.productionContactName}</span>
                          {show.productionContactEmail && (
                            <div className="text-pb-gray/70 text-xs mt-1">
                              <a 
                                href={`mailto:${show.productionContactEmail}`}
                                className="text-pb-primary hover:text-pb-accent transition-colors underline"
                              >
                                {show.productionContactEmail}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-pb-primary mb-3">Show Details</h3>
                  <div className="space-y-3">
                    {show.startDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">Start Date:</span>
                        <span className="text-white">
                          {(() => {
                            try {
                              if (show.startDate && typeof show.startDate.toDate === 'function') {
                                return show.startDate.toDate().toLocaleDateString();
                              } else if (show.startDate instanceof Date) {
                                return show.startDate.toLocaleDateString();
                              } else if (typeof show.startDate === 'string') {
                                return new Date(show.startDate).toLocaleDateString();
                              } else {
                                return 'Unknown';
                              }
                            } catch (e) {
                              return 'Unknown';
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    {show.endDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">End Date:</span>
                        <span className="text-white">
                          {(() => {
                            try {
                              if (show.endDate && typeof show.endDate.toDate === 'function') {
                                return show.endDate.toDate().toLocaleDateString();
                              } else if (show.endDate instanceof Date) {
                                return show.endDate.toLocaleDateString();
                              } else if (typeof show.endDate === 'string') {
                                return new Date(show.endDate).toLocaleDateString();
                              } else {
                                return 'Unknown';
                              }
                            } catch (e) {
                              return 'Unknown';
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    {show.isTouringShow && (
                      <div className="flex items-center gap-3">
                        <span className="text-pb-gray/80 text-sm font-medium w-20">Show Type:</span>
                        <span className="text-pb-accent font-medium">Touring Show</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Locations Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Locations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Venues */}
              <div className="bg-pb-darker/40 rounded-xl p-6 border border-pb-primary/20">
                <h3 className="text-lg font-semibold text-pb-primary mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Venues
                </h3>
                <div className="space-y-3">
                  {venueAddresses.length === 0 ? (
                    <p className="text-pb-gray/70 text-sm">No venues specified</p>
                  ) : venueAddresses.map(addr => (
                    <div key={addr.id} className="p-3 bg-pb-darker/60 rounded-lg border border-white/10">
                      <p className="font-medium text-white text-sm">{addr.name}</p>
                      <p className="text-xs text-pb-gray/80 mt-1">{[addr.street1, addr.street2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rehearsal Spaces */}
              <div className="bg-pb-darker/40 rounded-xl p-6 border border-pb-primary/20">
                <h3 className="text-lg font-semibold text-pb-primary mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Rehearsal Spaces
                </h3>
                <div className="space-y-3">
                  {rehearsalAddresses.length === 0 ? (
                    <p className="text-pb-gray/70 text-sm">No rehearsal spaces specified</p>
                  ) : rehearsalAddresses.map(addr => (
                    <div key={addr.id} className="p-3 bg-pb-darker/60 rounded-lg border border-white/10">
                      <p className="font-medium text-white text-sm">{addr.name}</p>
                      <p className="text-xs text-pb-gray/80 mt-1">{[addr.street1, addr.street2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Storage Spaces */}
              <div className="bg-pb-darker/40 rounded-xl p-6 border border-pb-primary/20">
                <h3 className="text-lg font-semibold text-pb-primary mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6l3-3 3 3V1" />
                  </svg>
                  Storage Spaces
                </h3>
                <div className="space-y-3">
                  {storageAddresses.length === 0 ? (
                    <p className="text-pb-gray/70 text-sm">No storage spaces specified</p>
                  ) : storageAddresses.map(addr => (
                    <div key={addr.id} className="p-3 bg-pb-darker/60 rounded-lg border border-white/10">
                      <p className="font-medium text-white text-sm">{addr.name}</p>
                      <p className="text-xs text-pb-gray/80 mt-1">{[addr.street1, addr.street2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Additional Information</h2>
            
            {/* Acts & Scenes - Full Width Section */}
            {show.acts && show.acts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-pb-primary mb-4">Acts & Scenes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {show.acts.map((act: any, actIdx: number) => {
                    try {
                      return (
                        <div key={actIdx} className="p-4 bg-pb-darker/40 rounded-lg border border-white/10">
                          <div className="text-white font-medium text-lg mb-3">
                            {typeof act === 'object' && act.name ? act.name : `Act ${actIdx + 1}`}
                          </div>
                          {act.scenes && Array.isArray(act.scenes) && act.scenes.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-pb-gray/80 text-sm font-medium mb-2">Scenes:</div>
                              {act.scenes.map((scene: string, sceneIdx: number) => (
                                <div key={sceneIdx} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-pb-primary rounded-full flex-shrink-0"></div>
                                  <span className="text-white/90 text-sm">
                                    {scene || `Scene ${sceneIdx + 1}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering act:', error, act);
                      return null;
                    }
                  })}
                </div>
              </div>
            )}

            {/* Team and Collaboration Info - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Team Members */}
                <ShowUserControls
                  showId={id!}
                  showOwnerId={show?.userId || ''}
                  showTeam={show?.team || {}}
                  onTeamUpdate={(updatedTeam) => {
                    setShow(prev => prev ? { ...prev, team: updatedTeam as any } : null);
                  }}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {show.collaborators && show.collaborators.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-pb-primary mb-3">Collaborators</h3>
                    <div className="space-y-2">
                      {show.collaborators.map((collab: any, idx: number) => (
                        <div key={idx} className="p-3 bg-pb-darker/40 rounded-lg border border-white/10">
                          <span className="text-white">{typeof collab === 'object' ? (collab.name || collab.email || 'Unknown') : String(collab)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contacts moved to right column */}
                {show.contacts && show.contacts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-pb-primary mb-3">Contacts</h3>
                    <div className="space-y-2">
                      {show.contacts.map((contact: any, idx: number) => (
                        <div key={idx} className="p-3 bg-pb-darker/40 rounded-lg border border-white/10">
                          <span className="text-white">{typeof contact === 'object' && contact.name ? contact.name : String(contact)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-pb-primary/20">
            <Link to="/shows" className="inline-flex items-center gap-2 text-pb-primary hover:text-pb-accent transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Shows
            </Link>
          </div>
        </div>

        {/* Success notification */}
        {inviteSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
            {inviteSuccess}
          </div>
        )}

        {/* Invite teammate modal */}
        {inviteOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <div className="w-full max-w-md rounded-lg bg-[#12121a] border border-pb-primary/20 shadow-xl">
              <div className="px-5 py-4 border-b border-pb-primary/20 flex items-center justify-between">
                <h3 id="invite-modal-title" className="text-white text-lg font-semibold">Invite teammate</h3>
                <button
                  onClick={() => {
                    if (!inviteSubmitting) {
                      setInviteOpen(false);
                      setInviteName('');
                      setInviteEmail('');
                      setInviteJobRole('propmaker');
                      setInviteError(null);
                    }
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
                  
                  // Input validation
                  const errors: string[] = [];
                  
                  if (!inviteEmail || !inviteEmail.includes('@')) {
                    errors.push('Please enter a valid email address');
                  }
                  
                  if (!inviteName || inviteName.trim().length < 2) {
                    errors.push('Please enter a name (at least 2 characters)');
                  }
                  
                  if (!inviteJobRole) {
                    errors.push('Please select a role');
                  }
                  
                  if (errors.length > 0) {
                    setInviteError(errors.join('. '));
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
                    // Email check failed, continue with invite creation
                  }
                  setInviteSubmitting(true);
                  try {
                    // Use Cloud Function for proper invitation creation
                    const createInvitation = httpsCallable(getFunctions(), 'createTeamInvitation');
                    
                    await createInvitation({
                      showId: show.id,
                      email: inviteEmail,
                      name: inviteName || null,
                      role: inviteJobRole,
                      jobRole: inviteJobRole,
                    });
                    
                    // Success - invitation created and email queued
                    setInviteSuccess('Invite sent successfully!');

                    setInviteOpen(false);
                    setInviteName('');
                    setInviteEmail('');
                    setInviteJobRole('propmaker');
                    setInviteError(null);
                  } catch (err: any) {
                    // User-friendly error messages
                    let errorMessage = 'Something went wrong. Please try again later.';
                    
                    if (err.code === 'permission-denied') {
                      errorMessage = 'You don\'t have permission to invite team members. Please contact your administrator.';
                    } else if (err.code === 'invalid-argument') {
                      errorMessage = 'Please check your email address and try again.';
                    } else if (err.code === 'not-found') {
                      errorMessage = 'Show not found. Please refresh the page and try again.';
                    } else if (err.code === 'unauthenticated') {
                      errorMessage = 'Please sign in to send invitations.';
                    } else if (err.message) {
                      errorMessage = err.message;
                    }
                    
                    setInviteError(errorMessage);
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
                  <label htmlFor="invite-name" className="block text-sm text-pb-gray mb-1">Name</label>
                  <input
                    id="invite-name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    type="text"
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                    placeholder="e.g. Alex Props"
                    aria-describedby="name-help"
                  />
                  <div id="name-help" className="text-xs text-pb-gray/70 mt-1">Enter the person's full name</div>
                </div>
                <div>
                  <label htmlFor="invite-email" className="block text-sm text-pb-gray mb-1">Email</label>
                  <input
                    id="invite-email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    required
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                    placeholder="invitee@example.com"
                    aria-describedby="email-help"
                  />
                  <div id="email-help" className="text-xs text-pb-gray/70 mt-1">We'll send the invitation to this email address</div>
                </div>
                <div>
                  <label htmlFor="invite-role" className="block text-sm text-pb-gray mb-1">Job role</label>
                  <select
                    id="invite-role"
                    value={inviteJobRole}
                    onChange={(e) => setInviteJobRole(e.target.value)}
                    className="w-full rounded bg-[#0e0e15] border border-pb-primary/20 px-3 py-2 text-white"
                    aria-describedby="role-help"
                  >
                    {JOB_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div id="role-help" className="text-xs text-pb-gray/70 mt-1">Select the role for this team member</div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!inviteSubmitting) {
                        setInviteOpen(false);
                        setInviteName('');
                        setInviteEmail('');
                        setInviteJobRole('propmaker');
                        setInviteError(null);
                      }
                    }}
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
        
        {/* Show Actions Modal */}
        {showActionsOpen && id && (
          <ShowActionsModal
            isOpen={showActionsOpen}
            onClose={() => setShowActionsOpen(false)}
            showId={id}
            showName={show.name}
            onShowArchived={() => {
              // Redirect to shows list after archiving
              navigate('/shows');
            }}
            onShowDeleted={() => {
              // Redirect to shows list after deletion
              navigate('/shows');
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShowDetailPage; 