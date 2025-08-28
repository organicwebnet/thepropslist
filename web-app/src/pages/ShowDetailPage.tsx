import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useParams, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import type { Show } from '../types/Show';
import { Pencil } from 'lucide-react';

const ShowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService } = useFirebase();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueAddresses, setVenueAddresses] = useState<any[]>([]);
  const [rehearsalAddresses, setRehearsalAddresses] = useState<any[]>([]);
  const [storageAddresses, setStorageAddresses] = useState<any[]>([]);

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
      (err: Error) => {
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
        <div className="w-full max-w-3xl mx-auto bg-pb-darker/60 rounded-xl shadow-lg p-8 my-8 relative">
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
      </div>
    </DashboardLayout>
  );
};

export default ShowDetailPage; 