/**
 * React Native Image Optimization Utilities
 * 
 * This module provides image optimization utilities specifically for React Native
 * mobile applications, handling WebP support detection and image processing.
 */

import { Platform } from 'react-native';

export interface ReactNativeWebPSupport {
  webp: boolean;
  lossless: boolean;
  alpha: boolean;
  platform: 'ios' | 'android' | 'web';
  version?: string;
}

/**
 * Detects WebP support in React Native environment
 */
export async function detectReactNativeWebPSupport(): Promise<ReactNativeWebPSupport> {
  const support: ReactNativeWebPSupport = {
    webp: false,
    lossless: false,
    alpha: false,
    platform: Platform.OS as 'ios' | 'android' | 'web'
  };

  if (Platform.OS === 'android') {
    // Android has native WebP support since API level 14 (Android 4.0+)
    // Most modern Android devices support WebP
    support.webp = true;
    support.lossless = true;
    support.alpha = true;
  } else if (Platform.OS === 'ios') {
    // iOS has WebP support since iOS 14 (2020)
    try {
      const DeviceInfo = require('react-native-device-info');
      const version = await DeviceInfo.getSystemVersion();
      const majorVersion = parseInt(version.split('.')[0], 10);
      
      if (majorVersion >= 14) {
        support.webp = true;
        support.lossless = true;
        support.alpha = true;
      }
      
      support.version = version;
    } catch (error) {
      console.warn('Could not detect iOS version, assuming WebP support:', error);
      // For newer apps, assume iOS 14+ support
      support.webp = true;
      support.lossless = true;
      support.alpha = true;
    }
  }

  return support;
}

/**
 * Optimizes image URL for React Native display
 * Returns the best available format based on platform capabilities
 */
export async function getOptimizedImageUrlForReactNative(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    preferWebP?: boolean;
  } = {}
): Promise<string> {
  const { width, height, quality = 80, preferWebP = true } = options;
  
  if (!preferWebP) {
    return originalUrl;
  }
  
  const support = await detectReactNativeWebPSupport();
  
  if (support.webp) {
    // For React Native, we can't easily convert images client-side
    // So we rely on server-side optimization or return the original URL
    // In a real implementation, you might call your optimization service here
    
    // Example: Call your optimization service
    // const optimizedUrl = await callOptimizationService(originalUrl, {
    //   format: 'webp',
    //   width,
    //   height,
    //   quality
    // });
    // return optimizedUrl;
    
    return originalUrl;
  }
  
  return originalUrl;
}

/**
 * React Native Image component wrapper with WebP optimization
 */
export function createOptimizedImageComponent() {
  const { Image } = require('react-native');
  
  return function OptimizedImage({
    source,
    style,
    ...props
  }: any) {
    const [optimizedSource, setOptimizedSource] = React.useState(source);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
      if (typeof source === 'object' && source.uri) {
        getOptimizedImageUrlForReactNative(source.uri).then((optimizedUrl) => {
          setOptimizedSource({ uri: optimizedUrl });
          setLoading(false);
        }).catch(() => {
          setOptimizedSource(source);
          setLoading(false);
        });
      } else {
        setOptimizedSource(source);
        setLoading(false);
      }
    }, [source]);
    
    return (
      <Image
        {...props}
        source={optimizedSource}
        style={style}
      />
    );
  };
}

/**
 * Utility to check if an image URL is already optimized
 */
export function isOptimizedImageUrl(url: string): boolean {
  return url.includes('.webp') || url.includes('optimized/');
}

/**
 * Gets image format from URL
 */
export function getImageFormatFromUrl(url: string): 'webp' | 'jpeg' | 'png' | 'gif' | 'unknown' {
  const extension = url.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'webp':
      return 'webp';
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    case 'gif':
      return 'gif';
    default:
      return 'unknown';
  }
}

/**
 * React hook for React Native WebP support
 */
export function useReactNativeWebPSupport() {
  const [support, setSupport] = React.useState<ReactNativeWebPSupport | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    detectReactNativeWebPSupport().then((webpSupport) => {
      setSupport(webpSupport);
      setLoading(false);
    });
  }, []);
  
  return { support, loading };
}

// Import React for hooks
let React: any;
try {
  React = require('react');
} catch (error) {
  // React not available in this context
}
