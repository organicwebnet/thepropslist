import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { VideoPlayer } from '../components/VideoPlayer';
import { PropForm } from '../components/PropForm';
import { Package, Edit, Trash2, Calendar, AlertTriangle, ArrowLeft, InfoIcon, Activity, Wrench, Clock } from 'lucide-react';
import { DigitalAssetGrid } from '../components/DigitalAssetGrid';
import { ImageCarousel } from '../components/ImageCarousel';
import type { Prop, PropFormData, Show } from '../types';
import { PropLifecycle } from '../components/lifecycle/PropLifecycle';
import { usePropLifecycle } from '../hooks/usePropLifecycle';
import { PropLifecycleStatus, MaintenanceRecord, lifecycleStatusPriority } from '../types/lifecycle';
import { PropStatusUpdate } from '../components/lifecycle/PropStatusUpdate';
import { MaintenanceRecordForm } from '../components/lifecycle/MaintenanceRecordForm';
import { StatusHistory } from '../components/lifecycle/StatusHistory';
import { MaintenanceHistory } from '../components/lifecycle/MaintenanceHistory';

interface PropDetailPageProps {
  onEdit?: (id: string, data: PropFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function PropDetailPage({ onEdit, onDelete }: PropDetailPageProps) {
  const [prop, setProp] = useState<Prop | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Always call the Hook, but pass undefined if no ID
  const lifecycle = usePropLifecycle({ propId: id || undefined });

  // Change the tab state to include three options
  const [activeTab, setActiveTab] = useState<'details' | 'statusUpdates' | 'maintenanceRecords'>('details');

  // Handle prop lifecycle status update
  const handleStatusUpdate = async (status: PropLifecycleStatus, notes: string, notifyTeam: boolean, damageImages?: File[]) => {
    console.log('=== PROP DETAIL PAGE DEBUG ===');
    console.log('1. Prop ID:', id);
    console.log('2. Lifecycle hook:', lifecycle);
    console.log('3. Current prop data:', prop);
    
    if (!id || !lifecycle?.updatePropStatus) {
      console.error('4. Missing required data - ID or lifecycle:', { id, lifecycle });
      return;
    }
    
    try {
      console.log('5. Calling lifecycle.updatePropStatus with:', {
        status,
        notes,
        notifyTeam,
        damageImages
      });
      
      await lifecycle.updatePropStatus(status, notes, notifyTeam, damageImages);
      
      // Refresh the prop data after update
      const propRef = doc(db, 'props', id);
      console.log('6. Fetching updated prop data for ID:', id);
      
      const propSnap = await getDoc(propRef);
      if (propSnap.exists()) {
        const updatedProp = { id: propSnap.id, ...propSnap.data() } as Prop;
        console.log('7. Successfully fetched updated prop data:', updatedProp);
        setProp(updatedProp);
      } else {
        console.error('8. Prop document not found after update');
      }
    } catch (err) {
      console.error('9. Error updating prop status:', err);
      setError('Failed to update prop status');
    }
  };

  // Handle adding maintenance record
  const handleAddMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!id || !lifecycle?.addMaintenanceRecord) return;
    
    try {
      await lifecycle.addMaintenanceRecord(record);
      
      // Refresh the prop data after update
      const propRef = doc(db, 'props', id);
      const propSnap = await getDoc(propRef);
      if (propSnap.exists()) {
        setProp({ id: propSnap.id, ...propSnap.data() } as Prop);
      }
    } catch (err) {
      console.error('Error adding maintenance record:', err);
      setError('Failed to add maintenance record');
    }
  };

  useEffect(() => {
    async function fetchPropAndShow() {
      if (!auth.currentUser) {
        console.error('No authenticated user');
        setError('Please sign in to view prop details');
        setLoading(false);
        return;
      }

      if (!id) {
        console.error('No prop ID provided');
        setError('No prop ID provided');
        setLoading(false);
        navigate('/props');
        return;
      }

      try {
        console.log('Current user:', auth.currentUser.uid);
        console.log('Fetching prop with ID:', id);
        
        // Check if we should be in edit mode (from URL)
        const urlParams = new URLSearchParams(window.location.search);
        const editParam = urlParams.get('edit');
        console.log('Edit param from URL:', editParam);
        setIsEditing(editParam === 'true');

        const propRef = doc(db, 'props', id);
        const propSnap = await getDoc(propRef);

        if (propSnap.exists()) {
          const propData = propSnap.data();
          console.log('Prop data found:', propData);
          
          // Verify the prop belongs to the current user
          if (propData.userId !== auth.currentUser.uid) {
            console.error('Prop does not belong to current user');
            setError('You do not have permission to view this prop');
            setLoading(false);
            return;
          }

          setProp({ id: propSnap.id, ...propData } as Prop);
          console.log('Successfully set prop data:', { id: propSnap.id, ...propData });

          // Fetch the show data
          const showRef = doc(db, 'shows', propData.showId);
          console.log('Fetching show with ID:', propData.showId);
          const showSnap = await getDoc(showRef);
          
          if (showSnap.exists()) {
            const showData = showSnap.data();
            const fullShowData = { id: showSnap.id, ...showData } as Show;
            console.log('Successfully fetched show data:', fullShowData);
            setShow(fullShowData);
          } else {
            console.error('No show found for prop');
            setError('Show not found for this prop');
          }
        } else {
          console.error('No prop found with ID:', id);
          setError('Prop not found');
          navigate('/props');
        }
      } catch (err) {
        console.error('Error fetching prop:', err);
        setError('Failed to load prop details');
      } finally {
        setLoading(false);
      }
    }

    fetchPropAndShow();
  }, [id, navigate]);

  const handleEdit = async (data: PropFormData) => {
    if (!prop || !onEdit) return;

    try {
      await onEdit(prop.id, data);
      setProp({ ...prop, ...data });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating prop:', err);
      setError('Failed to update prop');
    }
  };

  const handleDelete = async () => {
    if (!prop || !onDelete) return;

    if (confirm('Are you sure you want to delete this prop?')) {
      try {
        await onDelete(prop.id);
        navigate('/props');
      } catch (err) {
        console.error('Error deleting prop:', err);
        setError('Failed to delete prop');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading prop details...</p>
        </div>
      </div>
    );
  }

  if (error || !prop) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Prop not found'}</p>
        <button
          onClick={() => navigate('/props')}
          className="mt-4 inline-flex items-center text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Props
        </button>
      </div>
    );
  }

  if (isEditing) {
    console.log('=== EDIT MODE DEBUG ===');
    console.log('1. Entering edit mode section');
    console.log('2. Current prop data:', prop);
    console.log('3. Current show data:', show);
    console.log('4. isEditing state:', isEditing);
    
    return (
      <div className="space-y-6">
        <button
          onClick={() => setIsEditing(false)}
          className="inline-flex items-center text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Details
        </button>

        <PropForm
          onSubmit={async (data) => {
            console.log('=== FORM SUBMISSION DEBUG ===');
            console.log('1. Form submitted with data:', data);
            console.log('2. Current prop state:', prop);
            console.log('3. Current show state:', show);
            await handleEdit(data);
          }}
          initialData={prop}
          mode="edit"
          onCancel={() => setIsEditing(false)}
          show={show || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => navigate('/props')}
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
            <button
              onClick={() => {
                console.log('Edit button clicked');
                console.log('Current prop data:', prop);
                console.log('Current show data:', show);
                setIsEditing(true);
              }}
              className="p-2 text-gray-400 hover:text-primary transition-colors"
              title="Edit prop"
            >
              <Edit className="h-5 w-5" />
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete prop"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Updated Tab Navigation with three tabs */}
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

        {/* Tab Content */}
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
                    <dt className="text-sm text-gray-400 mb-1">Price</dt>
                    <dd className="text-base font-medium text-white">£{prop.price.toFixed(2)}</dd>
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
            
            {/* Display estimated return date for props out for repair */}
            {prop.status === 'out_for_repair' && prop.maintenanceHistory && prop.maintenanceHistory.length > 0 && (
              <div className="p-4 bg-[var(--highlight-bg)] border border-[var(--highlight-color)]/20 rounded-lg">
                <div className="flex items-center gap-2 text-[var(--text-primary)] mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Repair Timeline</span>
                </div>
                {(() => {
                  // Find the most recent repair record with an estimated return date
                  const latestRepair = [...prop.maintenanceHistory]
                    .filter(record => record.type === 'repair' && (record.estimatedReturnDate || record.repairDeadline))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                  
                  if (latestRepair) {
                    const hasReturnDate = latestRepair.estimatedReturnDate !== undefined;
                    const hasDeadline = latestRepair.repairDeadline !== undefined;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    let isReturnOverdue = false;
                    let isDeadlinePast = false;
                    
                    if (hasReturnDate) {
                      const estimatedDate = new Date(latestRepair.estimatedReturnDate!);
                      isReturnOverdue = estimatedDate < today;
                    }
                    
                    if (hasDeadline) {
                      const deadlineDate = new Date(latestRepair.repairDeadline!);
                      isDeadlinePast = deadlineDate < today;
                    }
                    
                    return (
                      <div className="space-y-2">
                        {hasDeadline && (
                          <div className={`flex items-start gap-2 ${isDeadlinePast ? "text-red-400" : ""}`}>
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">
                                Must be fixed by: {new Date(latestRepair.repairDeadline!).toLocaleDateString()}
                                {isDeadlinePast && " (Past due)"}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)]">
                                Stage manager requires this prop back by this date
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {hasReturnDate && (
                          <div>
                            <p className="text-[var(--text-primary)]">
                              Expected to return from repair on <span className={isReturnOverdue ? "text-red-400 font-medium" : "font-medium"}>
                                {new Date(latestRepair.estimatedReturnDate!).toLocaleDateString()}
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
            
            <PropStatusUpdate 
              currentStatus={prop.status || 'confirmed'}
              onStatusUpdate={handleStatusUpdate}
            />
            
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
            
            <MaintenanceRecordForm 
              onSubmit={handleAddMaintenanceRecord}
            />
            
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
}