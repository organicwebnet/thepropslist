import React from 'react';
import { Link } from 'react-router-dom';
import { Prop } from '../types/props';
import { PropImage } from './ProgressiveImage';
import { Skeleton } from './LoadingSkeleton';

interface PropCardProps {
  prop: Prop;
  onImageLoad?: () => void;
  onImageError?: () => void;
  showSkeleton?: boolean;
}

// Utility function to check if a prop has missing details
const hasMissingDetails = (prop: Prop): boolean => {
  return (
    (!prop?.location && !prop?.currentLocation) ||
    (!prop?.status) ||
    (prop?.status && !prop?.statusNotes) ||
    (!prop?.act) ||
    (!prop?.sceneName && !prop?.scene) ||
    (!prop?.images || prop.images.length === 0) ||
    (!prop?.assignment?.type && typeof prop?.location === 'string' && /box|container/i.test(prop.location))
  );
};

export const PropCard: React.FC<PropCardProps> = ({ 
  prop, 
  onImageLoad, 
  onImageError,
  showSkeleton = false 
}) => {
  const handleImageLoad = () => {
    onImageLoad?.();
  };

  const handleImageError = () => {
    onImageError?.();
  };

  if (showSkeleton) {
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
  }

  return (
    <Link
      to={`/props/${prop.id}`}
      className="block bg-pb-darker/60 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:bg-pb-darker/80 transition-all duration-200 border border-pb-primary/20 hover:border-pb-primary/40 group no-underline"
    >
      {/* Prop Image */}
      <div className="w-full h-48 rounded-lg overflow-hidden bg-pb-gray mb-4">
        <PropImage
          prop={prop}
          className="w-full h-full"
          onImageLoad={handleImageLoad}
          onImageError={handleImageError}
        />
      </div>
      
      {/* Prop Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1 group-hover:text-pb-primary transition-colors">
            {prop.name}
          </h3>
          {hasMissingDetails(prop) && (
            <div className="flex-shrink-0" title="This prop has missing details that need attention">
              <svg className="w-5 h-5 text-pb-warning" fill="currentColor" viewBox="0 0 20 20">
                <path 
                  fillRule="evenodd" 
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          )}
        </div>
        
        {prop.description && (
          <p className="text-pb-gray text-sm line-clamp-3 group-hover:text-pb-gray/80 transition-colors">
            {prop.description}
          </p>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {prop.tags && prop.tags.length > 0 && (
            <span className="px-2 py-1 bg-pb-primary/20 text-pb-primary text-xs rounded-full group-hover:bg-pb-primary/30 transition-colors">
              {prop.tags[0]}
            </span>
          )}
          {prop.status && (
            <span className="px-2 py-1 bg-pb-accent/20 text-pb-accent text-xs rounded-full group-hover:bg-pb-accent/30 transition-colors">
              {prop.status}
            </span>
          )}
        </div>
        
        {/* Quantity and Category */}
        <div className="flex items-center justify-between">
          <span className="text-pb-gray text-sm group-hover:text-pb-gray/80 transition-colors">
            Qty: {prop.quantity || 1}
          </span>
          {prop.category && (
            <span className="text-pb-primary text-sm font-medium group-hover:text-pb-primary/80 transition-colors">
              {prop.category}
            </span>
          )}
        </div>
        
      </div>
    </Link>
  );
};
