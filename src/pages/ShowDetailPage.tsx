import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Platform, FlatList, TextInput, Modal } from 'react-native';
import { Link, useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Show, Act, Scene, Venue, Contact, ShowCollaborator } from '../types/index.ts';
import { Prop } from '../shared/types/props.ts';
import { useFirebase } from '../contexts/FirebaseContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Pencil, UserMinus, Plus, Trash2 } from 'lucide-react';
import { FontAwesome5, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { darkTheme, lightTheme } from '../styles/theme.ts';
import type { FirebaseDocument } from '../shared/services/firebase/types.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

export default function ShowDetailPage({ onEdit }: { onEdit?: (show: Show) => void }) {
  const { service: firebaseService } = useFirebase();
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propStats, setPropStats] = useState({ totalProps: 0, totalValue: 0, totalWeight: 0 });

  useEffect(() => {
    if (!id || !firebaseService) return;
    setLoading(true);

    const unsubscribeShow = firebaseService.listenToDocument<Show>(
      `shows/${id}`,
      (doc: FirebaseDocument<Show> | null) => {
        if (doc && doc.data) {
          setShow({ ...doc.data, id: doc.id } as Show);
          setError(null);
        } else {
          setShow(null);
          setError('Show not found.');
        }
      },
      (err: Error) => {
        setError('Failed to load show details.');
        setShow(null);
        setLoading(false);
      }
    );

    const unsubscribeProps = firebaseService.listenToCollection<Prop>(
      'props',
      (docs: FirebaseDocument<Prop>[]) => {
        let totalValue = 0;
        let totalWeight = 0;
        docs.forEach((doc: FirebaseDocument<Prop>) => {
          const propData = doc.data;
          if (propData) {
            totalValue += (propData.price || 0) * (propData.quantity || 1);
            totalWeight += (propData.weight || 0) * (propData.quantity || 1);
          }
        });
        setPropStats({ totalProps: docs.length, totalValue, totalWeight });
        setLoading(false);
      },
      (err: Error) => {
        setLoading(false);
      },
      { where: [['showId', '==', id]] }
    );

    return () => {
      if (unsubscribeShow) unsubscribeShow();
      if (unsubscribeProps) unsubscribeProps();
    };
  }, [id, firebaseService]);

  const handleEdit = () => {
    if (Platform.OS === 'web') {
      if (onEdit && show) {
          onEdit(show)
      } else {
          if (id) {
            Alert.alert("Edit Show", "This feature (editing show details via a separate page) is not yet implemented.");
          }
      }
    } else {
        Alert.alert("Feature not available", "Editing shows is currently only supported on the web version.");
    }
  };

  const handleDelete = async () => {
    if (!id || !firebaseService || !show) return;

    const confirmDelete = async () => {
        try {
          await firebaseService.deleteShow(id); 
          router.push('/shows');
        } catch (err) {
          if (onEdit && show) {
            onEdit(show);
          } else {
            Alert.alert('Error', 'Failed to delete show.');
          }
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm(`Are you sure you want to delete "${show.name}"? This action cannot be undone.`)) {
            confirmDelete();
        }
    } else {
        Alert.alert(
          'Delete Show',
          `Are you sure you want to delete "${show.name}"? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: confirmDelete },
          ]
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ActivityIndicator size="large" color="var(--highlight-color)" />
      </div>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
        {Platform.OS === 'web' ? (
            <Link href="/shows" className="text-[var(--highlight-color)] hover:underline">
              Go back to Shows
            </Link>
        ) : (
            <TouchableOpacity onPress={() => router.push('/shows')}>
                <Text style={{ color: 'blue'}}>Go back to Shows</Text>
            </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!show) return null;

  const acts = Array.isArray(show.acts) ? show.acts : [];
  const venues = Array.isArray(show.venues) ? show.venues : [];
  const contacts = Array.isArray(show.contacts) ? show.contacts : [];

  if (Platform.OS !== 'web') {
    return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{color: 'orange', fontSize: 16, textAlign: 'center'}}>
                Show Detail Page is currently available on web only.
            </Text>
        </View>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6"
      >
        <Feather name="arrow-left" className="h-5 w-5 mr-2" />
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
            onClick={handleEdit}
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
                    {venues.map((venue: Venue) => (
                      <div key={venue.id || venue.name} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="font-medium text-[var(--text-primary)]">{venue.name}</p>
                        {venue.address && (
                          <p className="text-sm text-[var(--text-secondary)]">
                            {`${venue.address.street1 || ''}${venue.address.street2 ? `, ${venue.address.street2}` : ''}${venue.address.city ? `, ${venue.address.city}` : ''}${venue.address.postalCode ? `, ${venue.address.postalCode}` : ''}`.trim().replace(/^,|,$/g, '') || 'Address not specified'}
                          </p>
                        )}
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {venue.startDate && venue.endDate ? `${venue.startDate} - ${venue.endDate}` : 'Dates not specified'}
                        </div>
                        {venue.notes && (
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">Notes: {venue.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)]">Venue</h3>
                  {venues[0] ? (
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="font-medium text-[var(--text-primary)]">{venues[0].name}</p>
                        {venues[0].address && (
                          <p className="text-sm text-[var(--text-secondary)]">
                            {`${venues[0].address.street1 || ''}${venues[0].address.street2 ? `, ${venues[0].address.street2}` : ''}${venues[0].address.city ? `, ${venues[0].address.city}` : ''}${venues[0].address.postalCode ? `, ${venues[0].address.postalCode}` : ''}`.trim().replace(/^,|,$/g, '') || 'Address not specified'}
                          </p>
                        )}
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {venues[0].startDate && venues[0].endDate ? `${venues[0].startDate} - ${venues[0].endDate}` : 'Dates not specified'}
                        </div>
                        {venues[0].notes && (
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">Notes: {venues[0].notes}</p>
                        )}
                    </div>
                    ) : <p className="text-[var(--text-primary)]">Not specified</p> }
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
              acts.map((act: Act) => (
                <div key={act.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3">
                    Act {act.id as string | number}
                    {act.name && <span className="text-[var(--text-secondary)] ml-2">- {act.name}</span>}
                  </h3>
                  {act.description && (
                    <p className="text-[var(--text-secondary)] mb-3">{act.description}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.isArray(act.scenes) && act.scenes.map((scene: Scene) => (
                      <div key={scene.id} className="p-3 bg-[var(--input-bg)] rounded-lg">
                        <p className="font-medium text-[var(--text-primary)]">
                          Scene {scene.id as string | number}: {scene.name || 'Untitled Scene'}
                        </p>
                        {scene.setting && (
                          <p className="text-sm text-[var(--text-secondary)]">Setting: {scene.setting}</p>
                        )}
                        {scene.description && (
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{scene.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[var(--text-secondary)]">No acts or scenes defined for this show yet.</p>
            )}
          </div>
        </div>

        {Array.isArray(show.collaborators) && show.collaborators.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Collaborators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {show.collaborators.map((collaborator: ShowCollaborator) => (
                <div key={collaborator.email} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="font-medium text-[var(--text-primary)]">{collaborator.email}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Role: {collaborator.role}</p>
                  <p className="text-xs text-gray-400 mt-1">Added by: {collaborator.addedBy} on {typeof collaborator.addedAt === 'string' ? collaborator.addedAt : collaborator.addedAt?.toDate().toLocaleDateString()}</p>
                  {user?.email === collaborator.addedBy && (
                     <button 
                        className="mt-2 text-xs text-red-500 hover:text-red-700"
                      >
                       <UserMinus className="inline h-3 w-3 mr-1"/> Remove
                     </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(contacts) && contacts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Key Contacts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((contact: Contact) => (
                <div key={contact.id || contact.email} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="font-medium text-[var(--text-primary)]">{contact.name} <span className="text-sm text-[var(--text-secondary)]">({contact.role})</span></p>
                  {contact.email && <p className="text-sm text-[var(--text-secondary)]"><a href={`mailto:${contact.email}`} className="hover:text-primary">{contact.email}</a></p>}
                  {contact.phone && <p className="text-sm text-[var(--text-secondary)]"><a href={`tel:${contact.phone}`} className="hover:text-primary">{contact.phone}</a></p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-end space-x-4">
          <button
            onClick={() => router.push(`/props/add?showId=${id}`)}
            className="px-6 py-2.5 bg-[var(--highlight-color)] text-white font-semibold rounded-lg shadow-md hover:bg-opacity-90 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Prop
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Show
          </button>
        </div>

        {show.collaborators && show.collaborators.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Collaborators
            </h2>
            <div className="space-y-4">
              {show.collaborators.map((collaborator: ShowCollaborator) => (
                <div key={collaborator.email} className="p-4 bg-[var(--bg-secondary)] rounded-lg border-l-4 border-primary">
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
                            Added {typeof collaborator.addedAt === 'string' ? collaborator.addedAt : collaborator.addedAt?.toDate().toLocaleDateString()}
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