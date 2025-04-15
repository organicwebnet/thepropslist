import React, { useRef, useState } from 'react';
import { ImagePlus, Link, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../lib/cloudinary';
import type { PropImage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploadProps {
  onImagesChange: (images: PropImage[]) => void;
  currentImages?: PropImage[];
}

export function ImageUpload({ onImagesChange, currentImages = [] }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageLink, setImageLink] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    const newImages: PropImage[] = [...currentImages];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadedUrl = await uploadImage(file);
        
        newImages.push({
          id: uuidv4(),
          url: uploadedUrl,
          isMain: newImages.length === 0,
          uploadedAt: new Date().toISOString(),
          caption: ''
        });
      }

      onImagesChange(newImages);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (imageId: string) => {
    const newImages = currentImages.filter(img => img.id !== imageId);
    
    // If we removed the main image, make the first remaining image the main one
    if (newImages.length > 0 && !newImages.some(img => img.isMain)) {
      newImages[0].isMain = true;
    }
    
    onImagesChange(newImages);
  };

  const handleSetMainImage = (imageId: string) => {
    const newImages = currentImages.map(img => ({
      ...img,
      isMain: img.id === imageId
    }));
    onImagesChange(newImages);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>, imageId: string) => {
    e.stopPropagation();
    const newImages = currentImages.map(img => 
      img.id === imageId ? { ...img, caption: e.target.value } : img
    );
    onImagesChange(newImages);
  };

  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      setIsPreviewLoading(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load image');
      const contentType = response.headers.get('content-type');
      return contentType?.startsWith('image/') ?? false;
    } catch (error) {
      return false;
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreviewError(null);
    
    if (!imageLink.includes('google.com')) {
      setPreviewError('Please enter a valid Google Drive or Google Photos link');
      return;
    }

    const isValid = await validateImageUrl(imageLink);
    if (!isValid) {
      setPreviewError('Unable to load image. Please check the URL and make sure it\'s publicly accessible');
      return;
    }

    const newImages = [...currentImages, {
      id: uuidv4(),
      url: imageLink,
      isMain: currentImages.length === 0,
      uploadedAt: new Date().toISOString(),
      caption: ''
    }];

    onImagesChange(newImages);
    setShowLinkInput(false);
    setImageLink('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          Images
        </label>
        <div className="flex items-center space-x-2">
          {!showLinkInput && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary-light hover:text-primary-light/80 text-sm flex items-center"
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                Upload
              </button>
              <span className="text-gray-500">|</span>
              <button
                type="button"
                onClick={() => setShowLinkInput(true)}
                className="text-primary-light hover:text-primary-light/80 text-sm flex items-center"
              >
                <Link className="h-4 w-4 mr-1" />
                Add Link
              </button>
            </>
          )}
        </div>
      </div>

      {showLinkInput && (
        <form onSubmit={handleLinkSubmit} className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="url"
              value={imageLink}
              onChange={(e) => setImageLink(e.target.value)}
              placeholder="Paste Google Drive or Photos link"
              className="flex-1 bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isPreviewLoading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Add'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setImageLink('');
                setPreviewError(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {previewError && (
            <p className="text-sm text-red-400">{previewError}</p>
          )}
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {currentImages.map((image) => (
          <div key={image.id} className="space-y-2">
            <div className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-[#1A1A1A] border border-gray-800">
                {isUploading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <img
                    src={image.url}
                    alt={image.caption || "Prop image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                {!image.isMain && (
                  <button
                    onClick={() => handleSetMainImage(image.id)}
                    className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
                    title="Set as main image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {image.isMain && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
                  Main Image
                </div>
              )}
            </div>

            <input
              type="text"
              value={image.caption || ''}
              onChange={(e) => handleCaptionChange(e, image.id)}
              placeholder="Add caption..."
              className="w-full bg-[#1A1A1A] border border-gray-800 rounded px-2 py-1 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}

        {currentImages.length === 0 && !showLinkInput && (
          <div className="col-span-full text-center py-8 border border-dashed border-gray-800 rounded-lg">
            <p className="text-gray-400">No images added yet. Click "Upload" or "Add Link" to get started.</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />
    </div>
  );
}