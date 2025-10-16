import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { Prop } from '../../shared/types/props';
import { MapPin, Info, Hash, BadgeInfo, Package, FileText, ExternalLink, X, ChevronLeft, ChevronRight, LogIn, Play } from 'lucide-react';


const PublicPropViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService, isInitialized, error: firebaseError } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({});

  // Collect video URLs from multiple sources (pre-show, videos[], digitalAssets)
  const videoUrls = useMemo(() => {
    if (!prop) return [];
    const urls: string[] = [];
    const add = (u?: string) => { if (u && typeof u === 'string' && u.trim()) urls.push(u.trim()); };
    add((prop as any)?.preShowSetupVideo);
    if (Array.isArray((prop as any)?.videos)) {
      (prop as any).videos.forEach((v: any) => add(v?.url || v));
    }
    if (Array.isArray((prop as any)?.digitalAssets)) {
      (prop as any).digitalAssets.forEach((v: any) => add(v?.url || v));
    }
    return Array.from(new Set(urls));
  }, [prop?.preShowSetupVideo, (prop as any)?.videos, (prop as any)?.digitalAssets]);

  useEffect(() => {
    if (!id) {
      setError('No prop ID provided');
      setLoading(false);
      return;
    }

    if (!isInitialized) {
      return;
    }

    if (firebaseError) {
      setError('Firebase connection error');
      setLoading(false);
      return;
    }

    const fetchProp = async () => {
      try {
        setLoading(true);
        
        const propData = await firebaseService.getDocument('props', id);
        
        if (propData) {
          // The propData is a FirebaseDocument with { id, data, exists, ref }
          // We need to extract the actual prop data from propData.data
          const actualPropData = propData.data || propData;
          const fullProp = { id, ...actualPropData } as Prop;
          setProp(fullProp);
          
          // Initialize image loading states
          if (fullProp.images && fullProp.images.length > 0) {
            const initialLoadingState: { [key: number]: boolean } = {};
            fullProp.images.forEach((_, index) => {
              initialLoadingState[index] = true;
            });
            setImageLoading(initialLoadingState);
          }
        } else {
          setError('Prop not found');
        }
      } catch (err) {
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
          prev === 0 ? (prop?.images?.length || 1) - 1 : prev - 1
        );
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => 
          prev === (prop?.images?.length || 1) - 1 ? 0 : prev + 1
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

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const renderField = (label: string, value: any, icon?: React.ReactNode) => {
    if (value === null || value === undefined || value === '') return null;
    // Allow 0 for quantity and other numeric fields
    if (value === 0 && label !== 'Quantity') return null;
    
    return (
      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
        {icon && <div className="text-gray-500 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 mb-1">{label}</div>
          <div className="text-sm text-gray-600">
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </div>
        </div>
      </div>
    );
  };

  // Helper: embed video players for known providers or direct files
  function renderEmbeddedVideo(url?: string) {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    
    // Google Drive (file links) → use preview iframe
    if (/drive\.google\.com\//i.test(trimmed)) {
      let fileId: string | null = null;
      const byPath = trimmed.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i);
      const byQuery = trimmed.match(/[?&]id=([A-Za-z0-9_-]+)/i);
      if (byPath && byPath[1]) fileId = byPath[1];
      else if (byQuery && byQuery[1]) fileId = byQuery[1];
      if (fileId) {
        const src = `https://drive.google.com/file/d/${fileId}/preview`;
        return (
          <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={src}
              title="Google Drive video"
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        );
      }
    }
    
    // YouTube
    const youTubeMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    if (youTubeMatch) {
      const vid = youTubeMatch[1];
      const src = `https://www.youtube.com/embed/${vid}`;
      return (
        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-gray-200">
          <iframe
            src={src}
            title="YouTube video player"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    
    // Vimeo
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch) {
      const vid = vimeoMatch[1];
      const src = `https://player.vimeo.com/video/${vid}`;
      return (
        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-gray-200">
          <iframe
            src={src}
            title="Vimeo video player"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    
    // Direct video files
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
      return (
        <video controls className="w-full rounded-lg border border-gray-200">
          <source src={trimmed} />
        </video>
      );
    }
    
    // Unknown provider: show link fallback
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
        Open video
      </a>
    );
  }

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Full Width Image Carousel */}
          <div className="space-y-4">
            {prop.images && prop.images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative group">
                  {imageLoading[currentImageIndex] !== false && (
                    <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  <img 
                    src={prop.images[currentImageIndex].url} 
                    alt={`${prop.name} - Image ${currentImageIndex + 1}`}
                    className={`w-full h-auto max-h-[500px] object-cover cursor-pointer transition-opacity duration-200 ${
                      imageLoading[currentImageIndex] === false ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setIsFullscreen(true)}
                    onLoad={() => handleImageLoad(currentImageIndex)}
                    onError={() => handleImageError(currentImageIndex)}
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
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No images available</p>
              </div>
            )}
          </div>

          {/* Two Column Data Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
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

              {/* Videos Section */}
              {videoUrls.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Videos
                  </h2>
                  <div className="space-y-4">
                    {videoUrls.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="space-y-2">
                        {renderEmbeddedVideo(url)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column */}
            <div className="space-y-6">
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
      </div>

      {/* Fullscreen Image Modal */}
      {isFullscreen && prop?.images && prop.images.length > 0 && (
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
            {prop?.images && prop.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => 
                    prev === 0 ? (prop?.images?.length || 1) - 1 : prev - 1
                  )}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => 
                    prev === (prop?.images?.length || 1) - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Main image */}
            {prop?.images && prop.images[currentImageIndex] && (
              <>
                {imageLoading[currentImageIndex] !== false && (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                )}
                <img 
                  src={prop.images[currentImageIndex].url} 
                  alt={`${prop.name || 'Prop'} - Image ${currentImageIndex + 1}`}
                  className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${
                    imageLoading[currentImageIndex] === false ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => handleImageLoad(currentImageIndex)}
                  onError={() => handleImageError(currentImageIndex)}
                />
              </>
            )}

            {/* Image counter */}
            {prop?.images && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                {currentImageIndex + 1} / {prop.images.length}
              </div>
            )}

            {/* Image caption */}
            {prop?.images && prop.images[currentImageIndex]?.caption && (
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
