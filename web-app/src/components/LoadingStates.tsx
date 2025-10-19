import React from 'react';
import { LoadingSpinner } from './LoadingSkeleton';

interface LoadingStateProps {
  phase: 'initial' | 'data' | 'images' | 'complete';
  message?: string;
  progress?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  phase, 
  message, 
  progress 
}) => {
  const getPhaseConfig = () => {
    switch (phase) {
      case 'initial':
        return {
          icon: '🔄',
          title: 'Initializing...',
          description: 'Setting up your props workspace',
          showProgress: false
        };
      case 'data':
        return {
          icon: '📋',
          title: 'Loading Props...',
          description: 'Fetching your prop collection from the database',
          showProgress: false
        };
      case 'images':
        return {
          icon: '🖼️',
          title: 'Loading Images...',
          description: 'Optimizing images for the best viewing experience',
          showProgress: true
        };
      case 'complete':
        return {
          icon: '✅',
          title: 'Ready!',
          description: 'Your props are loaded and ready to view',
          showProgress: false
        };
      default:
        return {
          icon: '⏳',
          title: 'Loading...',
          description: 'Please wait while we prepare your content',
          showProgress: false
        };
    }
  };

  const config = getPhaseConfig();

  return (
    <div 
      className="flex flex-col items-center justify-center h-64"
      role="status"
      aria-live="polite"
      aria-label={config.title}
    >
      <div className="text-6xl mb-4 animate-pulse">
        {config.icon}
      </div>
      
      <LoadingSpinner size="lg" className="mb-4" />
      
      <h3 className="text-xl font-semibold text-white mb-2">
        {message || config.title}
      </h3>
      
      <p className="text-pb-gray text-center max-w-md mb-4">
        {config.description}
      </p>
      
      {config.showProgress && progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-sm text-pb-gray mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-pb-gray/30 rounded-full h-2">
            <div 
              className="bg-pb-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
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
