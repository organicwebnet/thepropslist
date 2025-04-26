import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize } from 'lucide-react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import type { PropImage } from '@/shared/types/props';

interface ImageCarouselProps {
  images: PropImage[];
  altText?: string;
}

export function ImageCarousel({ images, altText = "Image" }: ImageCarouselProps) {
  if (Platform.OS !== 'web') {
    console.warn('ImageCarousel: Attempted to render web component on native platform. Rendering placeholder instead.');
    return (
      <View style={styles.nativePlaceholder}>
        <Text style={styles.nativePlaceholderText}>Image Carousel (Web Only)</Text>
      </View>
    );
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  
  if (!images || images.length === 0) return null;

  const navigateToImage = (index: number) => {
    setCurrentIndex((images.length + index) % images.length);
  };
  
  const handlePrevious = () => {
    navigateToImage(currentIndex - 1);
  };
  
  const handleNext = () => {
    navigateToImage(currentIndex + 1);
  };
  
  return (
    <div className="space-y-3">
      {/* Main carousel image */}
      <div className="relative rounded-lg overflow-hidden bg-[#1A1A1A] border border-gray-800">
        <div className="aspect-video w-full">
          <img
            src={images[currentIndex].url}
            alt={images[currentIndex].caption || altText}
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        
        {/* Fullscreen button */}
        <button
          onClick={() => setFullScreenMode(true)}
          className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
          aria-label="View fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </button>
        
        {/* Caption */}
        {images[currentIndex].caption && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70">
            <p className="text-sm text-white">{images[currentIndex].caption}</p>
          </div>
        )}
      </div>
      
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                index === currentIndex ? 'border-primary' : 'border-gray-800 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={image.url}
                alt={image.caption || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Fullscreen modal */}
      {fullScreenMode && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-5xl max-h-screen p-4">
            <div className="relative">
              <img
                src={images[currentIndex].url}
                alt={images[currentIndex].caption || altText}
                className="max-w-full max-h-[80vh] object-contain mx-auto"
              />
              
              {/* Fullscreen navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/80 rounded-full text-white hover:bg-black transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/80 rounded-full text-white hover:bg-black transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
            
            {/* Caption in fullscreen */}
            {images[currentIndex].caption && (
              <div className="text-center mt-2">
                <p className="text-white">{images[currentIndex].caption}</p>
              </div>
            )}
            
            {/* Close button */}
            <button
              onClick={() => setFullScreenMode(false)}
              className="absolute top-4 right-4 p-2 bg-black/80 rounded-full text-white hover:bg-black transition-colors"
              aria-label="Close fullscreen view"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = StyleSheet.create({
  nativePlaceholder: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    marginBottom: 8,
  },
  nativePlaceholderText: {
    color: '#aaa',
    fontSize: 14,
  },
}); 