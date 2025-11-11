import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Linking, Platform, useWindowDimensions, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Check, Edit, Trash2, Plus, Upload, Calendar, X, ChevronDown, ChevronUp, AlertTriangle, MessageSquare, LifeBuoy, Image as ImageIconWeb, Paperclip, ArrowLeft, Package, Info as InfoIcon, Activity, Wrench, Clock } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Prop, PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, DimensionUnit } from '../shared/types/props.ts';
import { usePropLifecycle } from '../hooks/usePropLifecycle.ts';
import { Show } from '../types/index.ts';
import { MaintenanceRecordForm } from '../components/lifecycle/MaintenanceRecordForm.tsx';
import { PropStatusUpdate } from '../components/lifecycle/PropStatusUpdate.tsx';
import { StatusDropdownMobile } from '../components/lifecycle/StatusDropdownMobile.tsx';
import { lifecycleStatusLabels, lifecycleStatusPriority, MaintenanceRecord, PropLifecycleStatus } from '../types/lifecycle.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { PropForm } from '../components/PropForm.tsx';
import { NativePropForm } from '../components/NativePropForm.tsx';
import { DigitalAssetGrid } from '../components/DigitalAssetGrid.tsx';
import { ImageCarousel } from '../components/ImageCarousel.tsx';
import { StatusHistory } from '../components/lifecycle/StatusHistory.tsx';
import { MaintenanceHistory } from '../components/lifecycle/MaintenanceHistory.tsx';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import type { CardData } from '../shared/types/taskManager';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useShows } from '../contexts/ShowsContext';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../shared/permissions';
import { User } from 'firebase/auth';
import { lightTheme, darkTheme } from '../styles/theme.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../styles/globalStyles';

export default function PropDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { service } = useFirebase();
  const { user } = useAuth();
  const { selectedShow } = useShows();
  const { hasPermission } = usePermissions();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // default is false; toggled only by user action
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [isAddingMaintenance, setIsAddingMaintenance] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [mentionedInCards, setMentionedInCards] = useState<CardData[]>([]);

  const firebaseJsUser = user as User | null;
  const lifecycle = usePropLifecycle({ propId: id || undefined, currentUser: firebaseJsUser });

  const [activeTab, setActiveTab] = useState<'details' | 'statusUpdates' | 'maintenanceRecords'>('details');

  const handleStatusUpdate = async (status: PropLifecycleStatus, notes: string, notifyTeam: boolean, damageImages?: File[]) => {
    if (!id || !lifecycle?.updatePropStatus) return;
    try {
      await lifecycle.updatePropStatus(status, notes);
      const propDoc = await service.getDocument<Prop>('props', id);
      if (propDoc && propDoc.data) {
        setProp({ ...propDoc.data, id: propDoc.id });
      }
      setIsAddingStatus(false);
    } catch (err: any) {
      setError(`Failed to update prop status: ${err.message}`);
    }
  };

  const handleAddMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!id || !lifecycle?.addMaintenanceRecord) return;
    try {
      await lifecycle.addMaintenanceRecord(record);
      const propDoc = await service.getDocument<Prop>('props', id);
      if (propDoc && propDoc.data) {
        setProp({ ...propDoc.data, id: propDoc.id });
      }
      setIsAddingMaintenance(false);
    } catch (err: any) {
      console.error('Error adding maintenance record:', err);
      setError(`Failed to add maintenance record: ${err.message}`);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchProp = async () => {
      if (!id || !service || !user) {
        setError('Prop ID missing or service/user not available.');
        setLoading(false);
        return;
      }

      if (!selectedShow?.id) {
        setError('Please select a show to view prop details.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Try collection query approach (same as props list) with same show filter
        const propDocs = await service.getDocuments<Prop>('props', {
          where: [['showId', '==', selectedShow?.id]]
        });

        if (isMounted) {
          // Find the specific prop by ID
          const propDoc = propDocs?.find(doc => doc.id === id);
          if (propDoc) {
            const firestoreData = propDoc.data;
            const propData = { 
              ...firestoreData,
              id: propDoc.id, 
              createdAt: firestoreData.createdAt,
              updatedAt: firestoreData.updatedAt,
              lastModifiedAt: firestoreData.lastModifiedAt,
              lastUsedAt: firestoreData.lastUsedAt,
              purchaseDate: firestoreData.purchaseDate,
              rentalDueDate: firestoreData.rentalDueDate,
              nextMaintenanceDue: firestoreData.nextMaintenanceDue,
              lastUpdated: firestoreData.lastUpdated,
            } as Prop;

            setProp(propData);
            setError(null);
            setImageLoadError(false);
          } else {
            // Fallback to getDocument
            const propDoc = await service.getDocument<Prop>('props', id);
            
            if (propDoc && propDoc.data) {
              const firestoreData = propDoc.data;
              const propData = { 
                ...firestoreData,
                id: propDoc.id, 
                createdAt: firestoreData.createdAt,
                updatedAt: firestoreData.updatedAt,
                lastModifiedAt: firestoreData.lastModifiedAt,
                lastUsedAt: firestoreData.lastUsedAt,
                purchaseDate: firestoreData.purchaseDate,
                rentalDueDate: firestoreData.rentalDueDate,
                nextMaintenanceDue: firestoreData.nextMaintenanceDue,
                lastUpdated: firestoreData.lastUpdated,
              } as Prop;

              setProp(propData);
              setError(null);
            } else {
              setError('Prop not found.');
              setProp(null);
            }
          }
          setLoading(false);
          // After prop loaded, scan task cards for mentions
          if (propDoc) {
            try {
              // Find all boards for this show
              const boards = await service.getCollection<any>('todo_boards', { where: [['showId', '==', selectedShow?.id]] });
              const allCards: CardData[] = [];
              for (const b of boards) {
                const lists = await service.getDocuments<any>(`todo_boards/${b.id}/lists`);
                for (const l of lists) {
                  const cards = await service.getDocuments<CardData>(`todo_boards/${b.id}/lists/${l.id}/cards`);
                  cards.forEach(c => {
                    const data = c.data as any;
                    const title: string = data?.title || '';
                    const desc: string = data?.description || '';
                    const idRegex = new RegExp(`\\(prop:${propDoc.id}\\)`);
                    if (idRegex.test(title) || idRegex.test(desc)) {
                      allCards.push({ ...data, id: c.id, listId: l.id, boardId: b.id });
                    }
                  });
                }
              }
              if (isMounted) setMentionedInCards(allCards);
            } catch (e) {
              console.error('Failed to fetch mentioned-in tasks:', e);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching prop:', err);
          setError('Failed to load prop details.');
          setLoading(false);
        }
      }
    };

    fetchProp();

    return () => {
      isMounted = false;
    };
  }, [id, user, service, selectedShow]);

  const handleEditSubmit = async (data: PropFormData) => {
    if (!prop) return;
    
    // Check permission before editing
    try {
      if (!hasPermission(Permission.EDIT_PROPS)) {
        Alert.alert('Permission Denied', 'You do not have permission to edit props.');
        setIsEditing(false);
        return;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('Error', 'Unable to verify permissions. Please try again.');
      setIsEditing(false);
      return;
    }
    
    try {
      await service.updateDocument('props', prop.id, {
         ...data,
         lastModifiedAt: new Date().toISOString()
       });
      const updatedProp = { ...prop, ...data } as Prop;
      setProp(updatedProp);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating prop:', err);
      setError(`Failed to update prop: ${err.message}`);
    }
  };

  const handleDeleteProp = async () => {
    if (!prop) return;
    
    // Check permission before deleting
    try {
      if (!hasPermission(Permission.DELETE_PROPS)) {
        Alert.alert('Permission Denied', 'You do not have permission to delete props.');
        return;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('Error', 'Unable to verify permissions. Please try again.');
      return;
    }
    
    Alert.alert(
      'Delete Prop',
      'Are you sure you want to delete this prop? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || !service?.deleteDocument || !user) {
              Alert.alert("Error", "Cannot delete prop. Service unavailable or not logged in.");
              return;
            }
            try {
              setLoading(true);
              await service.deleteDocument('props', id);
              router.back();
            } catch (error) {
              console.error("Error deleting prop:", error);
              Alert.alert("Error", "Failed to delete prop.");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Helper to format dimensions safely
  const formatDimensions = () => {
    if (!prop) return null;
    const { length, width, height, depth, unit } = prop; 
    const parts = [length, width, height, depth].filter(d => d != null && d > 0);
    if (parts.length === 0) return null;
    return `${parts.join(' x ')} ${unit || ''}`.trim();
  };
  const dimensionsText = formatDimensions(); // Define dimensionsText here

  if (loading) {
    return <View style={globalStyles.centered}><Text>Loading...</Text></View>;
  }

  if (error) {
    return <View style={[globalStyles.centered, globalStyles.padding16]}><Text style={globalStyles.colorRed}>Error: {error}</Text></View>;
  }

  if (!prop) {
    return <View style={globalStyles.centered}><Text>Prop not found.</Text></View>;
  }

  if (isEditing) {
    const initialFormData = prop as unknown as PropFormData;
    if (Platform.OS === 'web') {
      return <PropForm initialData={initialFormData} onSubmit={handleEditSubmit} onCancel={() => setIsEditing(false)} />;
    }
    const handleNativeSubmit = async (data: PropFormData): Promise<boolean> => {
      try {
        await handleEditSubmit(data);
        setIsEditing(false);
        return true;
      } catch (e) {
        Alert.alert('Error', 'Failed to save changes.');
        return false;
      }
    };
    return (
      <NativePropForm
        initialData={initialFormData}
        onFormSubmit={handleNativeSubmit}
        submitButtonText="Save Changes"
      />
    );
  }

  if (isAddingStatus) {
    return (
      <PropStatusUpdate
        currentStatus={prop.status}
        onStatusUpdate={handleStatusUpdate}
      />
    );
  }
  
  if (isAddingMaintenance) {
    return (
      <MaintenanceRecordForm
        onSubmit={handleAddMaintenanceRecord}
      />
    );
  }

  if (Platform.OS === 'web') {
    return (
      <div className="space-y-8">
        <button
          onClick={() => router.navigate('/props')}
          className="inline-flex items-center text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Props
        </button>

        <div className="gradient-border p-6 space-y-8">
          {prop.images && prop.images.length > 0 ? (
            <div className="mb-8">
              <ImageCarousel images={prop.images} altText={prop.name} />
            </div>
          ) : (
            <div className="w-full mb-8 aspect-video rounded-lg bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-gray-800 flex items-center justify-center">
              <Package className="h-12 w-12 text-primary/50" />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{prop.name}</h1>
            <div className="flex items-center space-x-2">
              {hasPermission(Permission.EDIT_PROPS) && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                  title="Edit prop"
                >
                  <Edit className="h-5 w-5" />
                </button>
              )}
              {hasPermission(Permission.DELETE_PROPS) && (
                <button
                  onClick={handleDeleteProp}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete prop"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Mentioned in Tasks */}
          <div className="mt-4 p-4 border border-[var(--border-color)] rounded-lg">
            <h3 className="text-lg font-medium text-white mb-2">Mentioned in Tasks</h3>
            {mentionedInCards.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No task references yet.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {mentionedInCards.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`/(tabs)/taskBoard/${c.boardId}?selectedCardId=${c.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      {c.title || 'Untitled Card'}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-b border-[var(--border-color)]">
            <div className="flex -mb-px">
              <button
                className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
                onClick={() => setActiveTab('details')}
              >
                <InfoIcon className="h-4 w-4" />
                Details
              </button>
              <button
                className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'statusUpdates'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
                onClick={() => setActiveTab('statusUpdates')}
              >
                <Activity className="h-4 w-4" />
                Status Updates
              </button>
              <button
                className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'maintenanceRecords'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
                onClick={() => setActiveTab('maintenanceRecords')}
              >
                <Wrench className="h-4 w-4" />
                Maintenance Records
              </button>
            </div>
          </div>

          {activeTab === 'details' && (
            <div className="flex flex-col lg:flex-row justify-between gap-8">
              <div className="flex-grow space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex flex-col">
                      <dt className="text-sm text-gray-400 mb-1">Category</dt>
                      <dd className="text-base font-medium text-white">{prop.category}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm text-gray-400 mb-1">Quantity</dt>
                      <dd className="text-base font-medium text-white">{prop.quantity}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm text-gray-400 mb-1">Total Value</dt>
                      <dd className="text-base font-medium text-white">£{(prop.price * prop.quantity).toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Physical Properties</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {(prop.length || prop.width || prop.height || prop.depth) && (
                      <div className="flex flex-col col-span-2">
                        <dt className="text-sm text-gray-400 mb-1">Dimensions</dt>
                        <dd className="text-base font-medium text-white">
                          {[
                            prop.length && `L: ${prop.length}`,
                            prop.width && `W: ${prop.width}`,
                            prop.height && `H: ${prop.height}`,
                            prop.depth && `D: ${prop.depth}`
                          ].filter(Boolean).join(' × ')} {prop.unit}
                        </dd>
                      </div>
                    )}
                    {prop.weight && (
                      <div className="flex flex-col">
                        <dt className="text-sm text-gray-400 mb-1">Weight</dt>
                        <dd className="text-base font-medium text-white">{prop.weight} {prop.weightUnit}</dd>
                      </div>
                    )}
                    {prop.travelWeight && (
                      <div className="flex flex-col">
                        <dt className="text-sm text-gray-400 mb-1">Travel Weight</dt>
                        <dd className="text-base font-medium text-white">{prop.travelWeight} {prop.weightUnit}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Usage Information</h3>
                  <dl className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col">
                      <dt className="text-sm text-gray-400 mb-1">Scene Usage</dt>
                      <dd className="text-base font-medium text-white">
                        {prop.isMultiScene ? (
                          'Used in multiple scenes'
                        ) : (
                          `First used in Act ${prop.act}, Scene ${prop.scene}`
                        )}
                      </dd>
                    </div>
                    {prop.usageInstructions && (
                      <div className="flex flex-col">
                        <dt className="text-sm text-gray-400 mb-1">Usage Instructions</dt>
                        <dd className="text-base text-white">{prop.usageInstructions}</dd>
                      </div>
                    )}
                    {prop.maintenanceNotes && (
                      <div className="flex flex-col">
                        <dt className="text-sm text-gray-400 mb-1">Maintenance Notes</dt>
                        <dd className="text-base text-white">{prop.maintenanceNotes}</dd>
                      </div>
                    )}
                    {prop.safetyNotes && (
                      <div className="flex flex-col">
                        <dt className="text-sm text-gray-400 mb-1">Safety Notes</dt>
                        <dd className="text-base text-white">{prop.safetyNotes}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {prop.requiresPreShowSetup && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Setup Information</h3>
                    <dl className="grid grid-cols-1 gap-4">
                      {prop.preShowSetupDuration && (
                        <div className="flex flex-col">
                          <dt className="text-sm text-gray-400 mb-1">Setup Duration</dt>
                          <dd className="text-base font-medium text-white">
                            {prop.preShowSetupDuration} minutes
                          </dd>
                        </div>
                      )}
                      {prop.preShowSetupNotes && (
                        <div className="flex flex-col">
                          <dt className="text-sm text-gray-400 mb-1">Setup Instructions</dt>
                          <dd className="text-base text-white">{prop.preShowSetupNotes}</dd>
                        </div>
                      )}
                      {prop.preShowSetupVideo && (
                        <div className="flex flex-col">
                          <dt className="text-sm text-gray-400 mb-1">Setup Video</dt>
                          <dd>
                            <VideoPlayer
                              url={prop.preShowSetupVideo}
                              title="Setup Instructions"
                            />
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-1/3 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Source Information</h3>
                  <dl className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col">
                      <dt className="text-sm text-gray-400 mb-1">Source</dt>
                      <dd className="text-base font-medium text-white flex items-center gap-2">
                        {prop.source === 'bought' ? (
                          <>Purchased from {prop.sourceDetails}</>
                        ) : prop.source === 'made' ? (
                          <>Made by {prop.sourceDetails}</>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4" />
                            {prop.source === 'rented' ? 'Rented from' : 'Borrowed from'} {prop.sourceDetails}
                            {prop.rentalDueDate && (
                              <span className="text-yellow-500">
                                Due: {new Date(prop.rentalDueDate).toLocaleDateString()}
                              </span>
                            )}
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                {prop.digitalAssets && prop.digitalAssets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Digital Assets</h3>
                    <DigitalAssetGrid assets={prop.digitalAssets} />
                  </div>
                )}

                {(prop.hasOwnShippingCrate || prop.requiresSpecialTransport) && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Transport Information</h3>
                    <dl className="grid grid-cols-1 gap-4">
                      {prop.hasOwnShippingCrate && prop.shippingCrateDetails && (
                        <div className="flex flex-col">
                          <dt className="text-sm text-gray-400 mb-1">Shipping Crate Details</dt>
                          <dd className="text-base text-white">{prop.shippingCrateDetails}</dd>
                        </div>
                      )}
                      {prop.requiresSpecialTransport && prop.transportNotes && (
                        <div className="flex flex-col">
                          <dt className="text-sm text-gray-400 mb-1">Transport Notes</dt>
                          <dd className="text-base text-white">{prop.transportNotes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'statusUpdates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status Updates
                </h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  !prop.status ? 'text-[var(--highlight-color)] bg-[var(--highlight-bg)]' :
                  prop.status === 'confirmed' ? 'text-green-500 bg-green-500/10' :
                  prop.status === 'cut' ? 'text-gray-500 bg-gray-500/10' :
                  lifecycleStatusPriority[prop.status] === 'critical' ? 'text-red-500 bg-red-500/10' :
                  lifecycleStatusPriority[prop.status] === 'high' ? 'text-orange-500 bg-orange-500/10' :
                  lifecycleStatusPriority[prop.status] === 'medium' ? 'text-yellow-500 bg-yellow-500/10' :
                  'text-[var(--highlight-color)] bg-[var(--highlight-bg)]'
                }`}>
                  {prop.status ? prop.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Set'}
                </div>
              </div>
              
              {prop.status === 'out_for_repair' && prop.maintenanceHistory && prop.maintenanceHistory.length > 0 && (
                <div className="p-4 bg-[var(--highlight-bg)] border border-[var(--highlight-color)]/20 rounded-lg">
                  <div className="flex items-center gap-2 text-[var(--text-primary)] mb-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Repair Timeline</span>
                  </div>
                  {(() => {
                    const latestRepair = [...prop.maintenanceHistory]
                      .filter(record => record.type === 'repair' && (record.estimatedReturnDate || record.repairDeadline))
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    
                    if (latestRepair) {
                      const returnDateStr = latestRepair.estimatedReturnDate;
                      const deadlineStr = latestRepair.repairDeadline;
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      let isReturnOverdue = false;
                      let isDeadlinePast = false;
                      
                      if (returnDateStr) {
                        const estimatedDate = new Date(returnDateStr);
                        isReturnOverdue = estimatedDate < today;
                      }
                      
                      if (deadlineStr) {
                        const deadlineDate = new Date(deadlineStr);
                        isDeadlinePast = deadlineDate < today;
                      }
                      
                      return (
                        <div className="space-y-2">
                          {deadlineStr && (
                            <div className={`flex items-start gap-2 ${isDeadlinePast ? "text-red-400" : ""}`}>
                              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">
                                  Must be fixed by: {new Date(deadlineStr).toLocaleDateString()}
                                  {isDeadlinePast && " (Past due)"}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  Stage manager requires this prop back by this date
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {returnDateStr && (
                            <div>
                              <p className="text-[var(--text-primary)]">
                                Expected to return from repair on <span className={isReturnOverdue ? "text-red-400 font-medium" : "font-medium"}>
                                  {new Date(returnDateStr).toLocaleDateString()}
                                </span>
                                {isReturnOverdue && " (Overdue)"}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Being repaired by: {latestRepair.performedBy}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <p className="text-[var(--text-secondary)]">
                        No timeline information available
                      </p>
                    );
                  })()}
                </div>
              )}
              
              <button onClick={() => setIsAddingStatus(true)} className="text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80">Update Status</button>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Status History</h3>
                <StatusHistory history={prop.statusHistory || []} />
              </div>
            </div>
          )}

          {activeTab === 'maintenanceRecords' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Records
                </h2>
                {prop.nextMaintenanceDue && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      Next service: {new Date(prop.nextMaintenanceDue).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              <button onClick={() => setIsAddingMaintenance(true)} className="text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80">Add Record</button>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Maintenance History</h3>
                <MaintenanceHistory records={prop.maintenanceHistory || []} />
              </div>
            </div>
          )}

          {prop.hasBeenModified && (
            <div className="p-4 bg-[var(--highlight-bg)] border border-[var(--highlight-color)]/20 rounded-lg">
              <div className="flex items-center space-x-2 text-[var(--text-primary)] mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Modified Prop</span>
              </div>
              <p className="text-gray-300">{prop.modificationDetails}</p>
              {prop.lastModifiedAt && (
                <p className="text-sm text-gray-400 mt-2">
                  Modified on {new Date(prop.lastModifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.containerMobile} contentContainerStyle={styles.scrollContentMobile}>
          <View style={styles.backButtonMobile}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButtonTextMobile}>← Back to Props</Text>
            </TouchableOpacity>
          </View>

          {/* Image Section */}
          {prop.images && prop.images.length > 0 && !imageLoadError ? (
            <Image 
              source={{ uri: prop.images[0].url }} 
              style={styles.imageMobile} 
              resizeMode="contain"
              onError={(e) => {
                console.log("Image failed to load, showing placeholder");
                setImageLoadError(true);
              }}
            />
          ) : (
            <View style={styles.imagePlaceholderMobile}>
              <Text style={styles.placeholderTextMobile}>
                {imageLoadError ? 'Image failed to load' : 'No Image'}
              </Text>
            </View>
          )}

          {/* Header Section */}
          <View style={styles.headerMobile}>
            <Text style={styles.titleMobile}>{prop.name}</Text>
            <View style={styles.actionsMobile}>
              {hasPermission(Permission.EDIT_PROPS) && (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Feather name="edit" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              {hasPermission(Permission.DELETE_PROPS) && (
                <TouchableOpacity onPress={handleDeleteProp} style={{ marginLeft: 12 }}>
                  <Feather name="trash-2" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Status Dropdown */}
          <View style={styles.statusDropdownContainerMobile}>
            <StatusDropdownMobile
              currentStatus={prop.status || 'confirmed'}
              onStatusChange={async (newStatus) => {
                await handleStatusUpdate(newStatus, '', false);
              }}
              disabled={!hasPermission(Permission.EDIT_PROPS)}
            />
          </View>

          {/* Mentioned in Tasks (Mobile) */}
          <View style={styles.sectionMobile}>
            <Text style={styles.sectionTitleMobile}>Mentioned in Tasks</Text>
            {mentionedInCards.length === 0 ? (
              <Text style={{ color: '#aaa' }}>No task references yet.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {mentionedInCards.map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => router.navigate(`/taskBoard/${c.boardId}?selectedCardId=${c.id}`)}>
                    <Text style={{ color: '#60a5fa' }}>{c.title || 'Untitled Card'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Basic Information Section */}
          <View style={styles.sectionMobile}>
            <Text style={styles.sectionTitleMobile}>Basic Information</Text>
            <View style={styles.sectionContentMobile}>
              <View style={styles.detailRowMobile}>
                <Text style={styles.detailLabelMobile}>Category</Text>
                <Text style={styles.detailValueMobile}>{prop.category}</Text>
              </View>
              {prop.description && (
                <View style={styles.detailRowMobile}>
                  <Text style={styles.detailLabelMobile}>Description</Text>
                  <Text style={styles.detailValueMobile}>{prop.description}</Text>
                </View>
              )}
              <View style={styles.detailRowMobile}>
                <Text style={styles.detailLabelMobile}>Quantity</Text>
                <Text style={styles.detailValueMobile}>{prop.quantity}</Text>
              </View>
              {prop.price != null && (
                <View style={styles.detailRowMobile}>
                  <Text style={styles.detailLabelMobile}>Price</Text>
                  <Text style={styles.detailValueMobile}>£{prop.price.toFixed(2)}</Text>
                </View>
              )}
              {prop.quantity > 1 && prop.price && (
                <View style={styles.detailRowMobile}>
                  <Text style={styles.detailLabelMobile}>Total Value</Text>
                  <Text style={styles.detailValueMobile}>£{(prop.price * prop.quantity).toFixed(2)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Physical Properties Section */}
          {(prop.length || prop.width || prop.height || prop.depth || prop.weight || prop.travelWeight) && (
            <View style={styles.sectionMobile}>
              <Text style={styles.sectionTitleMobile}>Physical Properties</Text>
              <View style={styles.sectionContentMobile}>
                {dimensionsText && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Dimensions</Text>
                    <Text style={styles.detailValueMobile}>{dimensionsText}</Text>
                  </View>
                )}
                {prop.weight && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Weight</Text>
                    <Text style={styles.detailValueMobile}>{prop.weight} {prop.weightUnit}</Text>
                  </View>
                )}
                {prop.travelWeight && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Travel Weight</Text>
                    <Text style={styles.detailValueMobile}>{prop.travelWeight} {prop.weightUnit}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Usage Information Section */}
          {(prop.act || prop.scene || prop.usageInstructions || prop.maintenanceNotes || prop.safetyNotes) && (
            <View style={styles.sectionMobile}>
              <Text style={styles.sectionTitleMobile}>Usage Information</Text>
              <View style={styles.sectionContentMobile}>
                {(prop.act || prop.scene) && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Scene Usage</Text>
                    <Text style={styles.detailValueMobile}>
                      {prop.isMultiScene ? 'Used in multiple scenes' : `Act ${prop.act}, Scene ${prop.scene}`}
                    </Text>
                  </View>
                )}
                {prop.usageInstructions && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Usage Instructions</Text>
                    <Text style={styles.detailValueMobile}>{prop.usageInstructions}</Text>
                  </View>
                )}
                {prop.maintenanceNotes && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Maintenance Notes</Text>
                    <Text style={styles.detailValueMobile}>{prop.maintenanceNotes}</Text>
                  </View>
                )}
                {prop.safetyNotes && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Safety Notes</Text>
                    <Text style={styles.detailValueMobile}>{prop.safetyNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Source Information Section */}
          <View style={styles.sectionMobile}>
            <Text style={styles.sectionTitleMobile}>Source Information</Text>
            <View style={styles.sectionContentMobile}>
              <View style={styles.detailRowMobile}>
                <Text style={styles.detailLabelMobile}>Source</Text>
                <Text style={styles.detailValueMobile}>
                  {prop.source === 'bought' ? `Purchased from ${prop.sourceDetails}` :
                   prop.source === 'made' ? `Made by ${prop.sourceDetails}` :
                   prop.source === 'rented' ? `Rented from ${prop.sourceDetails}` :
                   `${prop.source.charAt(0).toUpperCase() + prop.source.slice(1)} from ${prop.sourceDetails}`}
                </Text>
              </View>
              {prop.rentalDueDate && (
                <View style={styles.detailRowMobile}>
                  <Text style={styles.detailLabelMobile}>Rental Due Date</Text>
                  <Text style={styles.detailValueMobile}>{new Date(prop.rentalDueDate).toLocaleDateString()}</Text>
                </View>
              )}
              {prop.purchaseDate && (
                <View style={styles.detailRowMobile}>
                  <Text style={styles.detailLabelMobile}>Purchase Date</Text>
                  <Text style={styles.detailValueMobile}>{new Date(prop.purchaseDate).toLocaleDateString()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Setup Information Section */}
          {prop.requiresPreShowSetup && (
            <View style={styles.sectionMobile}>
              <Text style={styles.sectionTitleMobile}>Setup Information</Text>
              <View style={styles.sectionContentMobile}>
                {prop.preShowSetupDuration && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Setup Duration</Text>
                    <Text style={styles.detailValueMobile}>{prop.preShowSetupDuration} minutes</Text>
                  </View>
                )}
                {prop.preShowSetupNotes && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Setup Instructions</Text>
                    <Text style={styles.detailValueMobile}>{prop.preShowSetupNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Transport Information Section */}
          {(prop.hasOwnShippingCrate || prop.requiresSpecialTransport) && (
            <View style={styles.sectionMobile}>
              <Text style={styles.sectionTitleMobile}>Transport Information</Text>
              <View style={styles.sectionContentMobile}>
                {prop.hasOwnShippingCrate && prop.shippingCrateDetails && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Shipping Crate</Text>
                    <Text style={styles.detailValueMobile}>{prop.shippingCrateDetails}</Text>
                  </View>
                )}
                {prop.requiresSpecialTransport && prop.transportNotes && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Transport Notes</Text>
                    <Text style={styles.detailValueMobile}>{prop.transportNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Additional Information Section */}
          {(prop.notes || prop.location || prop.condition) && (
            <View style={styles.sectionMobile}>
              <Text style={styles.sectionTitleMobile}>Additional Information</Text>
              <View style={styles.sectionContentMobile}>
                {prop.location && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Location</Text>
                    <Text style={styles.detailValueMobile}>{prop.location}</Text>
                  </View>
                )}
                {prop.condition && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Condition</Text>
                    <Text style={styles.detailValueMobile}>{prop.condition}</Text>
                  </View>
                )}
                {prop.notes && (
                  <View style={styles.detailRowMobile}>
                    <Text style={styles.detailLabelMobile}>Notes</Text>
                    <Text style={styles.detailValueMobile}>{prop.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    );
  }
}

const styles = StyleSheet.create({
  containerMobile: { flex: 1, padding: 16, backgroundColor: 'rgba(30,30,30,0.7)' },
  scrollContentMobile: { paddingBottom: 20 },
  backButtonMobile: { marginBottom: 16, padding: 8, alignSelf: 'flex-start' },
  backButtonTextMobile: { color: '#BB86FC', fontSize: 16 },
  imageMobile: { width: '100%', height: 250, marginBottom: 16, backgroundColor: 'rgba(30,30,30,0.7)', borderRadius: 8 },
  imagePlaceholderMobile: { width: '100%', height: 250, marginBottom: 16, backgroundColor: 'rgba(30,30,30,0.7)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  placeholderTextMobile: { color: '#aaa', fontSize: 16 },
  headerMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titleMobile: { fontSize: 24, fontWeight: 'bold', color: '#fff', flexShrink: 1, marginRight: 8 },
  actionsMobile: { flexDirection: 'row' },
  actionButtonMobile: { marginLeft: 12, padding: 8 },
  actionButtonTextMobile: { color: '#BB86FC', fontSize: 16 },
  statusBadgeMobile: { 
    backgroundColor: 'rgba(139, 69, 19, 0.3)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    alignSelf: 'flex-start', 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.5)'
  },
  statusTextMobile: { color: '#D2B48C', fontSize: 14, fontWeight: '600' },
  statusDropdownContainerMobile: {
    marginBottom: 16,
    alignSelf: 'flex-end',
  },
  sectionMobile: { 
    backgroundColor: 'rgba(40,40,40,0.8)', 
    borderRadius: 8, 
    padding: 16, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  sectionTitleMobile: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#BB86FC', 
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(187, 134, 252, 0.3)',
    paddingBottom: 8
  },
  sectionContentMobile: { marginTop: 8 },
  detailRowMobile: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  detailsSectionMobile: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#333', marginTop: 16 },
  detailLabelMobile: { 
    fontSize: 14, 
    color: '#aaa', 
    fontWeight: '500',
    flex: 1,
    marginRight: 12
  },
  detailValueMobile: { 
    fontSize: 14, 
    color: '#fff', 
    flex: 2,
    textAlign: 'right'
  },
});
