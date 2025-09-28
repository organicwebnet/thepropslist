import React, { useState, useEffect } from 'react';
import { Image, ImageProps, View, Text, StyleSheet } from 'react-native';
import { getOptimizedImageUrl, getWebPSupport, WebPSupport } from '../lib/webpSupport';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fallbackSource?: { uri: string } | number;
  showFallback?: boolean;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
}

export function OptimizedImage({
  source,
  width,
  height,
  quality = 80,
  format = 'auto',
  fallbackSource,
  showFallback = true,
  placeholder,
  errorPlaceholder,
  style,
  onError,
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [optimizedSource, setOptimizedSource] = useState<{ uri: string } | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [webpSupport, setWebpSupport] = useState<WebPSupport | null>(null);

  useEffect(() => {
    // Detect WebP support
    getWebPSupport().then(setWebpSupport);
  }, []);

  useEffect(() => {
    if (typeof source === 'object' && source.uri && webpSupport) {
      setLoading(true);
      setError(false);
      
      getOptimizedImageUrl(source.uri, {
        width,
        height,
        quality,
        format
      }).then((optimized) => {
        setOptimizedSource({ uri: optimized.url });
        setLoading(false);
      }).catch((err) => {
        console.warn('Failed to optimize image:', err);
        setOptimizedSource(source);
        setLoading(false);
      });
    } else {
      setOptimizedSource(source);
      setLoading(false);
    }
  }, [source, width, height, quality, format, webpSupport]);

  const handleError = (error: any) => {
    setError(true);
    setLoading(false);
    
    // Try fallback if available
    if (fallbackSource && optimizedSource !== fallbackSource) {
      setOptimizedSource(fallbackSource);
      setError(false);
    } else if (showFallback && typeof source === 'object' && source.uri) {
      // Fallback to original source
      setOptimizedSource(source);
      setError(false);
    }
    
    onError?.(error);
  };

  const handleLoad = (event: any) => {
    setLoading(false);
    setError(false);
    onLoad?.(event);
  };

  if (loading && placeholder) {
    return <>{placeholder}</>;
  }

  if (error && errorPlaceholder) {
    return <>{errorPlaceholder}</>;
  }

  if (error && !errorPlaceholder) {
    return (
      <View style={[styles.errorContainer, { width, height }, style]}>
        <Text style={styles.errorText}>Failed to load image</Text>
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={optimizedSource || source}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}

// Web-specific optimized image component
export function WebOptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'auto',
  className,
  style,
  onError,
  onLoad,
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (src) {
      setLoading(true);
      setError(false);
      
      getOptimizedImageUrl(src, {
        width,
        height,
        quality,
        format
      }).then((optimized) => {
        setOptimizedSrc(optimized.url);
        setLoading(false);
      }).catch((err) => {
        console.warn('Failed to optimize image:', err);
        setOptimizedSrc(src);
        setLoading(false);
      });
    }
  }, [src, width, height, quality, format]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setError(true);
    setLoading(false);
    
    // Fallback to original source
    if (optimizedSrc !== src) {
      setOptimizedSrc(src);
      setError(false);
    }
    
    onError?.(event);
  };

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    setError(false);
    onLoad?.(event);
  };

  if (error) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          color: '#666',
          fontSize: '14px'
        }}
      >
        Failed to load image
      </div>
    );
  }

  return (
    <img
      {...props}
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  errorText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
