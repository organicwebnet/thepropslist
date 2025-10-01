import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize } from 'lucide-react';
// import { Platform, View, Text, StyleSheet } from 'react-native';
interface ImageCarouselProps {
  images: string[];
  altText?: string;
}

export function ImageCarousel({ images, altText = "Image" }: ImageCarouselProps) {
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
            src={images[currentIndex]}
            alt={altText}
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
        {/* No caption for simple string array */}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                index === currentIndex ? 'border-primary' : 'border-gray-800 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
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
                src={images[currentIndex]}
                alt={altText}
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
            {/* No caption for simple string array */}
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
