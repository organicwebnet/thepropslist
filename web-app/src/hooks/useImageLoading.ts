import { useState, useEffect, useCallback } from 'react';

interface ImageLoadingState {
  loaded: Set<string>;
  loading: Set<string>;
  errors: Set<string>;
}

export const useImageLoading = () => {
  const [state, setState] = useState<ImageLoadingState>({
    loaded: new Set(),
    loading: new Set(),
    errors: new Set()
  });

  const startLoading = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      loading: new Set(prev.loading).add(imageId)
    }));
  }, []);

  const markLoaded = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      loaded: new Set(prev.loaded).add(imageId),
      loading: new Set([...prev.loading].filter(id => id !== imageId)),
      errors: new Set([...prev.errors].filter(id => id !== imageId))
    }));
  }, []);

  const markError = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      errors: new Set(prev.errors).add(imageId),
      loading: new Set([...prev.loading].filter(id => id !== imageId))
    }));
  }, []);

  const isLoaded = useCallback((imageId: string) => {
    return state.loaded.has(imageId);
  }, [state.loaded]);

  const isLoading = useCallback((imageId: string) => {
    return state.loading.has(imageId);
  }, [state.loading]);

  const hasError = useCallback((imageId: string) => {
    return state.errors.has(imageId);
  }, [state.errors]);

  const getProgress = useCallback((totalImages: number) => {
    if (totalImages === 0) return 100;
    return (state.loaded.size / totalImages) * 100;
  }, [state.loaded.size]);

  const reset = useCallback(() => {
    setState({
      loaded: new Set(),
      loading: new Set(),
      errors: new Set()
    });
  }, []);

  return {
    state,
    startLoading,
    markLoaded,
    markError,
    isLoaded,
    isLoading,
    hasError,
    getProgress,
    reset
  };
};

// Hook for managing prop list loading states
export const usePropListLoading = (props: any[]) => {
  const imageLoading = useImageLoading();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Reset image loading when props change
  useEffect(() => {
    imageLoading.reset();
  }, [props.length, imageLoading]);

  const handleDataLoaded = useCallback(() => {
    setDataLoading(false);
    setInitialLoadComplete(true);
  }, []);

  const handleImageLoad = useCallback((propId: string) => {
    imageLoading.markLoaded(propId);
  }, [imageLoading]);

  const handleImageError = useCallback((propId: string) => {
    imageLoading.markError(propId);
  }, [imageLoading]);

  const getLoadingPhase = useCallback(() => {
    if (dataLoading) return 'data';
    if (props.length === 0) return 'complete';
    if (imageLoading.state.loaded.size < props.length) return 'images';
    return 'complete';
  }, [dataLoading, props.length, imageLoading.state.loaded.size]);

  return {
    dataLoading,
    initialLoadComplete,
    loadingPhase: getLoadingPhase(),
    imageProgress: imageLoading.getProgress(props.length),
    handleDataLoaded,
    handleImageLoad,
    handleImageError,
    isImageLoaded: imageLoading.isLoaded,
    isImageLoading: imageLoading.isLoading,
    hasImageError: imageLoading.hasError
  };
};

