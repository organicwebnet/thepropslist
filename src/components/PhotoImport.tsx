import React, { useState, useEffect, useCallback } from 'react';
import { Image, Loader2, X, Plus } from 'lucide-react';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../contexts/AuthContext.tsx';
import * as ImagePicker from 'expo-image-picker';

interface PhotoImportProps {
  onPhotosSelected: (photos: GooglePhoto[]) => void;
}

interface GooglePhoto {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
}

export function PhotoImport({ onPhotosSelected }: PhotoImportProps) {
  const { service } = useFirebase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const handleAuthClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize Google Sign-In
      const auth2 = await window.gapi.auth2.getAuthInstance();
      
      if (!auth2.isSignedIn.get()) {
        await auth2.signIn();
      }
      
      const token = auth2.currentUser.get().getAuthResponse().access_token;
      await fetchPhotos(token);
    } catch (error) {
      console.error('Google Auth Error:', error);
      setError('Failed to authenticate with Google Photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (token: string) => {
    try {
      const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch photos');

      const data = await response.json();
      setPhotos(data.mediaItems || []);
    } catch (error) {
      console.error('Fetch Photos Error:', error);
      setError('Failed to fetch photos. Please try again.');
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handleImport = () => {
    const selectedPhotoObjects = photos.filter(photo => selectedPhotos.has(photo.id));
    onPhotosSelected(selectedPhotoObjects);
  };

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // Check service/auth state if needed before proceeding
      // if (!service || !user) { ... handle error ... }
      
      const files = event.target.files;
      if (files) {
        // ... existing code ...
      }
    },
    [onPhotosSelected, photos.length]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      
      // Check service/auth state if needed before proceeding
      // if (!service || !user) { ... handle error ... }

      const files = event.dataTransfer.files;
      if (files) {
        // ... existing code ...
      }
    },
    [onPhotosSelected, photos.length]
  );

  useEffect(() => {
    // Load Google API Client
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Load the auth2 library
      window.gapi.load('auth2', () => {
        // Initialize the auth2 library
        window.gapi.auth2.init({
          client_id: process.env.VITE_GOOGLE_CLIENT_ID || '',
          scope: 'https://www.googleapis.com/auth/photoslibrary.readonly'
        }).then(() => {
          console.log('Google Auth2 initialized successfully');
        });
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {!photos.length ? (
        <button
          onClick={handleAuthClick}
          disabled={loading}
          className="w-full h-48 border-2 border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center hover:border-gray-700 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              <span className="mt-2 text-gray-400">Connecting to Google Photos...</span>
            </>
          ) : (
            <>
              <Image className="h-8 w-8 text-gray-400" />
              <span className="mt-2 text-gray-400">Connect to Google Photos</span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div
                key={photo.id}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                  selectedPhotos.has(photo.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => togglePhotoSelection(photo.id)}
              >
                <img
                  src={photo.baseUrl}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <X className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setPhotos([])}
              className="px-4 py-2 text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedPhotos.size === 0}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Import Selected ({selectedPhotos.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
