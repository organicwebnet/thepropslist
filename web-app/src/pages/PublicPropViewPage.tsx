import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { Prop } from '../../shared/types/props';
import { ArrowLeft, MapPin, Info, Hash, BadgeInfo, Package, FileText, ExternalLink, X, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';

function formatDate(value: any): string {
  if (!value) return 'N/A';
  if (typeof value === 'object' && value.seconds) {
    try {
      if (typeof value.toDate === 'function') {
        return value.toDate().toLocaleString();
      }
      return new Date(value.seconds * 1000).toLocaleString();
    } catch {
      return JSON.stringify(value);
    }
  }
  if (typeof value === 'string') return value;
  return String(value);
}

const PublicPropViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService, isInitialized, error: firebaseError } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('No prop ID provided');
      setLoading(false);
      return;
    }

    if (!isInitialized) {
      console.log('Firebase not initialized yet, waiting...');
      return;
    }

    if (firebaseError) {
      console.error('Firebase error:', firebaseError);
      setError('Firebase connection error');
      setLoading(false);
      return;
    }

    const fetchProp = async () => {
      try {
        setLoading(true);
        console.log('Fetching prop with ID:', id);
        console.log('Firebase service available:', !!firebaseService);
        console.log('Firebase initialized:', isInitialized);
        
        const propData = await firebaseService.getDocument('props', id);
        console.log('Prop data received:', propData);
        
        if (propData) {
          // The propData is a FirebaseDocument with { id, data, exists, ref }
          // We need to extract the actual prop data from propData.data
          const actualPropData = propData.data || propData;
          const fullProp = { id, ...actualPropData } as Prop;
          setProp(fullProp);
          console.log('Prop set successfully');
          console.log('Full prop object:', fullProp);
          console.log('Prop name:', fullProp.name);
          console.log('Prop description:', fullProp.description);
          console.log('Prop category:', fullProp.category);
        } else {
          console.log('No prop data found for ID:', id);
          setError('Prop not found');
        }
      } catch (err) {
        console.error('Error fetching prop:', err);
        setError('Failed to load prop details');
      } finally {
        setLoading(false);
      }
    };

    fetchProp();
  }, [id, firebaseService, isInitialized, firebaseError]);

  // Keyboard navigation for fullscreen
  useEffect(() => {
    if (!isFullscreen || !prop?.images) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(prev => 
          prev === 0 ? prop.images.length - 1 : prev - 1
        );
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => 
          prev === prop.images.length - 1 ? 0 : prev + 1
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, prop?.images]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Initializing connection...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading prop details...</p>
        </div>
      </div>
    );
  }

  if (error || !prop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Prop Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested prop could not be found.'}</p>
          <p className="text-sm text-gray-500">
            This link may have expired or the prop may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const renderField = (label: string, value: any, icon?: React.ReactNode) => {
    if (value === null || value === undefined || value === '') return null;
    // Allow 0 for quantity and other numeric fields
    if (value === 0 && label !== 'Quantity') return null;
    
    return (
      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
        {icon && <div className="text-gray-500 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 mb-1">{label}</div>
          <div className="text-sm text-gray-600">{formatDate(value)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Prop Details</h1>
                <p className="text-sm text-gray-500">Read-only view</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Accessed via QR code
              </div>
              <Link 
                to="/login" 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Carousel */}
          <div className="space-y-6">
            {prop.images && prop.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main Image */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative group">
                  <img 
                    src={prop.images[currentImageIndex].url} 
                    alt={`${prop.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-auto max-h-96 object-cover cursor-pointer"
                    onClick={() => setIsFullscreen(true)}
                  />
                  {/* Click to fullscreen overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white bg-opacity-90 rounded-full p-2">
                      <ExternalLink className="w-6 h-6 text-gray-700" />
                    </div>
                  </div>
                  {/* Image counter */}
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {prop.images.length}
                  </div>
                </div>

                {/* Thumbnails */}
                {prop.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {prop.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentImageIndex 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img 
                          src={image.url} 
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Image caption */}
                {prop.images[currentImageIndex].caption && (
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-sm text-gray-600">{prop.images[currentImageIndex].caption}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No images available</p>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Basic Information
              </h2>
              <div className="space-y-3">
                {renderField('Name', prop.name, <FileText className="w-4 h-4" />)}
                {renderField('Description', prop.description)}
                {renderField('Category', prop.category, <BadgeInfo className="w-4 h-4" />)}
                {renderField('Status', prop.status)}
                {renderField('Quantity', prop.quantity)}
                {renderField('Location', prop.location, <MapPin className="w-4 h-4" />)}
                {renderField('Current Location', prop.currentLocation, <MapPin className="w-4 h-4" />)}
              </div>
            </div>

            {/* Show Assignment */}
            {(prop.act || prop.scene || prop.sceneName) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Show Assignment
                </h2>
                <div className="space-y-3">
                  {renderField('Act', prop.act)}
                  {renderField('Scene', prop.scene)}
                  {renderField('Scene Name', prop.sceneName)}
                </div>
              </div>
            )}

            {/* Physical Details */}
            {(prop.length || prop.width || prop.height || prop.weight || prop.materials || prop.color) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Physical Details
                </h2>
                <div className="space-y-3">
                  {prop.length && prop.width && prop.height && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Package className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">Dimensions</div>
                        <div className="text-sm text-gray-600">
                          {prop.length} × {prop.width} × {prop.height}
                          {prop.depth && ` × ${prop.depth}`}
                        </div>
                      </div>
                    </div>
                  )}
                  {renderField('Weight', prop.weight)}
                  {renderField('Materials', Array.isArray(prop.materials) ? prop.materials.join(', ') : prop.materials)}
                  {renderField('Color', prop.color)}
                </div>
              </div>
            )}

            {/* Additional Details */}
            {(prop.manufacturer || prop.model || prop.serialNumber || prop.condition || prop.notes) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
                <div className="space-y-3">
                  {renderField('Manufacturer', prop.manufacturer)}
                  {renderField('Model', prop.model)}
                  {renderField('Serial Number', prop.serialNumber)}
                  {renderField('Condition', prop.condition)}
                  {renderField('Notes', prop.notes)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {isFullscreen && prop.images && prop.images.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation buttons */}
            {prop.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => 
                    prev === 0 ? prop.images.length - 1 : prev - 1
                  )}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => 
                    prev === prop.images.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Main image */}
            <img 
              src={prop.images[currentImageIndex].url} 
              alt={`${prop.name} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
              {currentImageIndex + 1} / {prop.images.length}
            </div>

            {/* Image caption */}
            {prop.images[currentImageIndex].caption && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded text-sm max-w-md text-center">
                {prop.images[currentImageIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPropViewPage;
