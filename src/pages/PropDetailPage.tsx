import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { VideoPlayer } from '../components/VideoPlayer';
import { PropForm } from '../components/PropForm';
import { Package, Edit, Trash2, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react';
import { DigitalAssetGrid } from '../components/DigitalAssetGrid';
import { ImageCarousel } from '../components/ImageCarousel';
import type { Prop, PropFormData, Show } from '../types';

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
        navigate('/');
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
          navigate('/');
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
        navigate('/');
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
          onClick={() => navigate('/')}
          className="mt-4 inline-flex items-center text-primary hover:text-primary/80"
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
          className="inline-flex items-center text-primary hover:text-primary/80"
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
        onClick={() => navigate('/')}
        className="inline-flex items-center text-primary hover:text-primary/80"
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

        {prop.hasBeenModified && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-500 mb-2">
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