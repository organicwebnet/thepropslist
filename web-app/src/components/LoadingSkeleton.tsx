import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  rounded = false,
  animate = true 
}) => {
  const baseClasses = `bg-pb-gray/30 ${animate ? 'animate-pulse' : ''}`;
  const roundedClasses = rounded ? 'rounded-lg' : '';
  const sizeClasses = width || height ? '' : 'w-full h-4';
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseClasses} ${roundedClasses} ${sizeClasses} ${className}`}
      style={style}
    />
  );
};

export const PropCardSkeleton: React.FC = () => {
  return (
    <div className="bg-pb-darker/60 rounded-xl shadow-lg p-6 border border-pb-primary/20">
      {/* Image skeleton */}
      <div className="w-full h-48 rounded-lg overflow-hidden bg-pb-gray/30 mb-4 flex items-center justify-center">
        <Skeleton width={60} height={60} rounded className="bg-pb-gray/50" />
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-3">
        {/* Title skeleton */}
        <div className="flex items-start justify-between gap-2">
          <Skeleton width="70%" height={24} rounded />
          <Skeleton width={20} height={20} rounded />
        </div>
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton width="100%" height={16} rounded />
          <Skeleton width="80%" height={16} rounded />
        </div>
        
        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2">
          <Skeleton width={60} height={24} rounded />
          <Skeleton width={50} height={24} rounded />
        </div>
        
        {/* Bottom row skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton width={80} height={16} rounded />
          <Skeleton width={60} height={16} rounded />
        </div>
      </div>
    </div>
  );
};

export const PropsListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
      {Array.from({ length: count }, (_, index) => (
        <PropCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const ImageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-pb-gray/30 animate-pulse flex items-center justify-center ${className}`}>
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
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        className={`animate-spin ${sizeClasses[size]} text-pb-primary`}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4" 
          fill="none" 
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8v8z" 
        />
      </svg>
    </div>
  );
};

