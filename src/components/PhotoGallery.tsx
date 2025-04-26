import React from 'react';
import { X, Plus } from 'lucide-react';
// import type { GooglePhoto } from '../types'; // Commented out

interface PhotoGalleryProps {
  photos: any[]; // Changed type to any[] temporarily
  onRemovePhoto?: (photoId: string) => void;
  onSetMainPhoto?: (photoId: string) => void;
  mainPhotoId?: string;
  readOnly?: boolean;
}

export function PhotoGallery({ photos, onRemovePhoto, onSetMainPhoto, mainPhotoId, readOnly = false }: PhotoGalleryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {photos.map((photo: any) => (
        <div
          key={photo.id}
          className={`relative aspect-square rounded-lg overflow-hidden group ${
            photo.id === mainPhotoId ? 'ring-2 ring-primary' : ''
          }`}
        >
          <img
            src={photo.baseUrl}
            alt={photo.filename}
            className="w-full h-full object-cover"
          />
          
          {!readOnly && (
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
              {onSetMainPhoto && photo.id !== mainPhotoId && (
                <button
                  onClick={() => onSetMainPhoto(photo.id)}
                  className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
                  title="Set as main photo"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
              {onRemovePhoto && (
                <button
                  onClick={() => onRemovePhoto(photo.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {photo.id === mainPhotoId && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
              Main Photo
            </div>
          )}
        </div>
      ))}
    </div>
  );
}