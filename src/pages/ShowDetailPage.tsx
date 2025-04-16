import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where, getDoc, updateDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import type { Show, Scene, Act } from '../types';
import { Pencil, ArrowLeft, UserMinus } from 'lucide-react';

export function ShowDetailPage({ onEdit }: { onEdit: (show: Show) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [propStats, setPropStats] = useState({
    totalProps: 0,
    totalValue: 0,
    totalWeight: 0
  });

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'shows', id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Ensure acts is always an array and has the correct structure
        const acts = Array.isArray(data.acts) ? data.acts : [];
        const formattedActs = acts.map(act => ({
          id: act.id || 0,
          name: act.name || '',
          description: act.description || '',
          scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any) => ({
            id: scene.id || 0,
            name: scene.name || '',
            description: scene.description || ''
          })) : []
        }));

        setShow({
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          acts: formattedActs,
          userId: data.userId || '',
          createdAt: data.createdAt || new Date().toISOString(),
          collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
          stageManager: data.stageManager || '',
          propsSupervisor: data.propsSupervisor || '',
          productionCompany: data.productionCompany || '',
          venues: Array.isArray(data.venues) ? data.venues : [],
          isTouringShow: Boolean(data.isTouringShow),
          contacts: Array.isArray(data.contacts) ? data.contacts : [],
          imageUrl: data.imageUrl || '',
          logoImage: data.logoImage || undefined,
          stageManagerEmail: data.stageManagerEmail || '',
          stageManagerPhone: data.stageManagerPhone || '',
          propsSupervisorEmail: data.propsSupervisorEmail || '',
          propsSupervisorPhone: data.propsSupervisorPhone || '',
          productionContactName: data.productionContactName || '',
          productionContactEmail: data.productionContactEmail || '',
          productionContactPhone: data.productionContactPhone || ''
        } as Show);
      } else {
        navigate('/shows');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // Add effect to fetch prop statistics
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(
      query(collection(db, 'props'), where('showId', '==', id)),
      (snapshot) => {
        const stats = snapshot.docs.reduce((acc, doc) => {
          const prop = doc.data();
          return {
            totalProps: acc.totalProps + 1,
            totalValue: acc.totalValue + (prop.price || 0),
            totalWeight: acc.totalWeight + (prop.weight || 0)
          };
        }, { totalProps: 0, totalValue: 0, totalWeight: 0 });
        
        setPropStats(stats);
      }
    );

    return () => unsubscribe();
  }, [id]);

  const handleDelete = async () => {
    if (!show || !window.confirm('Are you sure you want to delete this show?')) return;
    
    try {
      await updateDoc(doc(db, 'shows', show.id), {
        deleted: true,
        deletedAt: new Date().toISOString()
      });
      navigate('/shows');
    } catch (error) {
      console.error('Error deleting show:', error);
      alert('Failed to delete show. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading show details...</p>
        </div>
      </div>
    );
  }

  if (!show) return null;

  // Ensure we have arrays even if they're undefined
  const acts = Array.isArray(show.acts) ? show.acts : [];
  const venues = Array.isArray(show.venues) ? show.venues : [];
  const contacts = Array.isArray(show.contacts) ? show.contacts : [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/shows')}
        className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Shows
      </button>

      <div className="gradient-border p-8 rounded-lg">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-6">
            {show.imageUrl ? (
              <img
                src={show.imageUrl}
                alt={`${show.name} logo`}
                className="w-24 h-24 rounded-lg object-cover border border-[var(--border-color)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center">
                <span className="text-4xl font-semibold text-[var(--text-secondary)]">
                  {show.name[0]}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{show.name}</h1>
              <p className="text-[var(--text-secondary)]">{show.description}</p>
            </div>
          </div>
          <button
            onClick={() => onEdit(show)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--highlight-color)] transition-colors"
            title="Edit show"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Production Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Stage Manager</h3>
                <p className="text-[var(--text-primary)]">{show.stageManager || 'Not specified'}</p>
                {show.stageManagerEmail && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    <a href={`mailto:${show.stageManagerEmail}`} className="hover:text-primary">
                      {show.stageManagerEmail}
                    </a>
                  </p>
                )}
                {show.stageManagerPhone && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    <a href={`tel:${show.stageManagerPhone}`} className="hover:text-primary">
                      {show.stageManagerPhone}
                    </a>
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Props Supervisor</h3>
                <p className="text-[var(--text-primary)]">{show.propsSupervisor || 'Not specified'}</p>
                {show.propsSupervisorEmail && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    <a href={`mailto:${show.propsSupervisorEmail}`} className="hover:text-primary">
                      {show.propsSupervisorEmail}
                    </a>
                  </p>
                )}
                {show.propsSupervisorPhone && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    <a href={`tel:${show.propsSupervisorPhone}`} className="hover:text-primary">
                      {show.propsSupervisorPhone}
                    </a>
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Production Company</h3>
                <p className="text-[var(--text-primary)]">{show.productionCompany || 'Not specified'}</p>
                {show.productionContactName && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    Contact: {show.productionContactName}
                  </p>
                )}
                {show.productionContactEmail && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    <a href={`mailto:${show.productionContactEmail}`} className="hover:text-primary">
                      {show.productionContactEmail}
                    </a>
                  </p>
                )}
                {show.productionContactPhone && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    <a href={`tel:${show.productionContactPhone}`} className="hover:text-primary">
                      {show.productionContactPhone}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Venue Information</h2>
            <div className="space-y-4">
              {show.isTouringShow ? (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Touring Venues</h3>
                  <div className="space-y-3">
                    {venues.map((venue, index) => (
                      <div key={index} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="font-medium text-[var(--text-primary)]">{venue.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{venue.address}</p>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {venue.startDate} - {venue.endDate}
                        </div>
                        {venue.notes && (
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">{venue.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)]">Venue</h3>
                  <p className="text-[var(--text-primary)]">{venues[0]?.name || 'Not specified'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Props Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Props</h3>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{propStats.totalProps}</p>
            </div>
            <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Value</h3>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                ${propStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Weight</h3>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {propStats.totalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Acts and Scenes</h2>
          <div className="space-y-6">
            {acts.length > 0 ? (
              acts.map((act) => (
                <div key={act.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3">
                    Act {act.id}
                    {act.name && <span className="text-[var(--text-secondary)] ml-2">- {act.name}</span>}
                  </h3>
                  {act.description && (
                    <p className="text-[var(--text-secondary)] mb-3">{act.description}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.isArray(act.scenes) && act.scenes.map((scene) => (
                      <div key={scene.id} className="p-3 bg-[var(--input-bg)] rounded-lg">
                        <p className="font-medium text-[var(--text-primary)]">
                          Scene {scene.id}: {scene.name || 'Untitled Scene'}
                        </p>
                        {scene.description && (
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{scene.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[var(--text-secondary)]">No acts defined for this show.</p>
            )}
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Key Contacts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {contacts.map((contact, index) => (
                <div key={index} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <h3 className="font-medium text-[var(--text-primary)]">{contact.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{contact.role}</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-[var(--text-secondary)]">{contact.email}</p>
                    {contact.phone && (
                      <p className="text-[var(--text-secondary)]">{contact.phone}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collaborators Section */}
        {show.collaborators && show.collaborators.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Collaborators
            </h2>
            <div className="space-y-4">
              {show.collaborators.map((collaborator, index) => (
                <div key={index} className="p-4 bg-[var(--bg-secondary)] rounded-lg border-l-4 border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)]">{collaborator.email}</h3>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          collaborator.role === 'editor' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                        }`}>
                          {collaborator.role === 'editor' ? 'Editor' : 'Viewer'}
                        </span>
                        {collaborator.addedAt && (
                          <span className="ml-2 text-xs text-[var(--text-secondary)]">
                            Added {new Date(collaborator.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {collaborator.addedBy && (
                      <div className="text-right text-xs text-[var(--text-secondary)]">
                        <p>Added by</p>
                        <p>{collaborator.addedBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Collaborators can view or edit props based on their assigned role.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 