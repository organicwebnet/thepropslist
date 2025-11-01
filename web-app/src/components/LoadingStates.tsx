import React from 'react';
// Loader visuals intentionally removed per design request

interface LoadingStateProps {
  phase: 'initial' | 'data' | 'images' | 'complete';
  message?: string;
  progress?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = () => {
  return <div />;
};

interface PropsListLoadingProps {
  loading: boolean;
  error: string | null;
  propsCount: number;
  imagesLoadedCount: number;
  initialLoadComplete: boolean;
}

export const PropsListLoading: React.FC<PropsListLoadingProps> = ({
  loading,
  error,
  propsCount,
  imagesLoadedCount,
  initialLoadComplete
}) => {
  if (error) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-64"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-500 mb-2">
          Loading Error
        </h3>
        <p className="text-pb-gray text-center max-w-md mb-4">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-pb-primary hover:bg-pb-secondary text-white font-semibold rounded-lg shadow transition-colors"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (loading) {
    return <LoadingState phase="data" />;
  }

  if (!initialLoadComplete) {
    return <LoadingState phase="initial" />;
  }

  if (propsCount > 0 && imagesLoadedCount < propsCount) {
    const progress = (imagesLoadedCount / propsCount) * 100;
    return (
      <LoadingState 
        phase="images" 
        progress={progress}
        message={`Loading Images (${imagesLoadedCount}/${propsCount})`}
      />
    );
  }

  return null;
};
