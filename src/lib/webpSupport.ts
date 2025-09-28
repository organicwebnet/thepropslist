/**
 * WebP Support Detection and Image Optimization Utilities
 * 
 * This module provides utilities for detecting WebP support across different platforms
 * and optimizing image URLs for the best format based on client capabilities.
 */

export interface WebPSupport {
  webp: boolean;
  avif: boolean;
  lossless: boolean;
  alpha: boolean;
}

export interface OptimizedImageUrl {
  url: string;
  format: 'webp' | 'avif' | 'jpeg' | 'png';
  fallbackUrl?: string;
}

/**
 * Detects WebP support in the current environment
 * Works for both web browsers and React Native
 */
export async function detectWebPSupport(): Promise<WebPSupport> {
  // For React Native, we assume WebP support based on platform
  if (typeof window === 'undefined') {
    // React Native environment
    const { Platform } = require('react-native');
    
    if (Platform.OS === 'android') {
      // Android has native WebP support since API 14
      return {
        webp: true,
        avif: false, // Limited AVIF support on Android
        lossless: true,
        alpha: true
      };
    } else if (Platform.OS === 'ios') {
      // iOS has WebP support since iOS 14
      const { getSystemVersion } = require('react-native-device-info');
      try {
        const version = getSystemVersion();
        const majorVersion = parseInt(version.split('.')[0], 10);
        const supportsWebP = majorVersion >= 14;
        
        return {
          webp: supportsWebP,
          avif: false, // Limited AVIF support on iOS
          lossless: supportsWebP,
          alpha: supportsWebP
        };
      } catch (error) {
        // Fallback: assume iOS 14+ for newer apps
        return {
          webp: true,
          avif: false,
          lossless: true,
          alpha: true
        };
      }
    }
    
    // Default fallback
    return {
      webp: false,
      avif: false,
      lossless: false,
      alpha: false
    };
  }

  // Web browser environment
  return new Promise((resolve) => {
    const webpSupport: WebPSupport = {
      webp: false,
      avif: false,
      lossless: false,
      alpha: false
    };

    // Test WebP support
    const webpTest = new Image();
    webpTest.onload = webpTest.onerror = () => {
      webpSupport.webp = webpTest.height === 2;
      
      // Test WebP lossless support
      const losslessTest = new Image();
      losslessTest.onload = losslessTest.onerror = () => {
        webpSupport.lossless = losslessTest.height === 2;
        
        // Test WebP alpha support
        const alphaTest = new Image();
        alphaTest.onload = alphaTest.onerror = () => {
          webpSupport.alpha = alphaTest.height === 2;
          
          // Test AVIF support
          const avifTest = new Image();
          avifTest.onload = avifTest.onerror = () => {
            webpSupport.avif = avifTest.height === 2;
            resolve(webpSupport);
          };
          avifTest.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMgkfAAAAAAAAP0o=';
        };
        alphaTest.src = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
      };
      losslessTest.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA4AAAAvAAAAEAcQERGIiP4HAA==';
    };
    webpTest.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Caches WebP support detection result
 */
let webpSupportCache: WebPSupport | null = null;

export async function getWebPSupport(): Promise<WebPSupport> {
  if (webpSupportCache === null) {
    webpSupportCache = await detectWebPSupport();
  }
  return webpSupportCache;
}

/**
 * Generates optimized image URLs based on client capabilities
 */
export async function getOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  } = {}
): Promise<OptimizedImageUrl> {
  const { width, height, quality = 80, format = 'auto' } = options;
  
  // If format is specified, use it directly
  if (format !== 'auto') {
    return {
      url: await buildOptimizedUrl(originalUrl, format, { width, height, quality }),
      format
    };
  }
  
  // Auto-detect best format
  const support = await getWebPSupport();
  
  if (support.avif) {
    return {
      url: await buildOptimizedUrl(originalUrl, 'avif', { width, height, quality }),
      format: 'avif',
      fallbackUrl: await buildOptimizedUrl(originalUrl, 'webp', { width, height, quality })
    };
  } else if (support.webp) {
    return {
      url: await buildOptimizedUrl(originalUrl, 'webp', { width, height, quality }),
      format: 'webp',
      fallbackUrl: originalUrl
    };
  } else {
    // Fallback to original format
    return {
      url: originalUrl,
      format: originalUrl.includes('.png') ? 'png' : 'jpeg'
    };
  }
}

/**
 * Builds optimized image URL using the server-side optimization function
 */
async function buildOptimizedUrl(
  originalUrl: string,
  format: string,
  options: { width?: number; height?: number; quality: number }
): Promise<string> {
  const { width, height, quality } = options;
  
  // For now, return the original URL
  // In production, this would call your optimization service
  // const optimizationService = process.env.OPTIMIZATION_SERVICE_URL || 'https://your-project.cloudfunctions.net/optimizeImage';
  
  // TODO: Implement actual optimization service call
  // const response = await fetch(optimizationService, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     imageUrl: originalUrl,
  //     format,
  //     quality,
  //     width,
  //     height
  //   })
  // });
  
  // if (response.ok) {
  //   const result = await response.json();
  //   return result.optimizedUrl;
  // }
  
  return originalUrl;
}

/**
 * React hook for WebP support detection
 */
export function useWebPSupport() {
  const [support, setSupport] = React.useState<WebPSupport | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    getWebPSupport().then((webpSupport) => {
      setSupport(webpSupport);
      setLoading(false);
    });
  }, []);
  
  return { support, loading };
}

/**
 * React hook for optimized image URLs
 */
export function useOptimizedImage(
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  } = {}
) {
  const [optimizedUrl, setOptimizedUrl] = React.useState<OptimizedImageUrl | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (originalUrl) {
      getOptimizedImageUrl(originalUrl, options).then((url) => {
        setOptimizedUrl(url);
        setLoading(false);
      });
    }
  }, [originalUrl, JSON.stringify(options)]);
  
  return { optimizedUrl, loading };
}

// Import React for hooks (only in web environment)
let React: any;
if (typeof window !== 'undefined') {
  React = require('react');
}
