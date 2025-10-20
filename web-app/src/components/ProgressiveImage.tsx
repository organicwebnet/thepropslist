import React, { useState, useRef, useEffect } from 'react';
import { ImageSkeleton } from './LoadingSkeleton';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  threshold?: number;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  onLoad,
  onError,
  lazy = true,
  threshold = 0.1
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const defaultPlaceholder = (
    <ImageSkeleton className={`w-full h-full ${className}`} />
  );

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Placeholder - shown while loading or on error */}
      {(!isLoaded || hasError) && (
        <div className="absolute inset-0 z-10">
          {placeholder || defaultPlaceholder}
        </div>
      )}
      
      {/* Actual image - only load when in view */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded && !hasError ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
        />
      )}
    </div>
  );
};

interface PropImageProps {
  prop: {
    id: string;
    name: string;
    images?: Array<{ url: string; isMain?: boolean }>;
    imageUrl?: string;
  };
  className?: string;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

export const PropImage: React.FC<PropImageProps> = ({
  prop,
  className = '',
  onImageLoad,
  onImageError
}) => {
  const mainImage = prop.images?.find(img => img.isMain)?.url || 
                   prop.images?.[0]?.url || 
                   prop.imageUrl || '';

  if (!mainImage) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-pb-gray/30 ${className}`}>
        <svg 
          className="w-10 h-10 text-pb-gray/50" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" 
          />
        </svg>
      </div>
    );
  }

  return (
    <ProgressiveImage
      src={mainImage}
      alt={prop.name}
      className={className}
      onLoad={onImageLoad}
      onError={onImageError}
      lazy={true}
    />
  );
};

