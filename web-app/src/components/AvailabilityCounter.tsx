import React, { useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useWebAuth } from '../contexts/WebAuthContext';
import { Link } from 'react-router-dom';
import { analytics } from '../services/AnalyticsService';

interface AvailabilityCounterProps {
  currentCount: number;
  limit: number;
  type: 'shows' | 'props' | 'packingBoxes' | 'archivedShows' | 'boards' | 'collaborators';
  showUpgradeButton?: boolean;
  className?: string;
}

const AvailabilityCounter: React.FC<AvailabilityCounterProps> = ({
  currentCount,
  limit,
  type,
  showUpgradeButton = true,
  className = ''
}) => {
  const { plan, canPurchaseAddOns } = useSubscription();
  const { user } = useWebAuth();
  
  const isAtLimit = currentCount >= limit;
  const isNearLimit = currentCount >= limit * 0.8; // 80% of limit

  // Track analytics when component mounts or values change
  useEffect(() => {
    if (user) {
      analytics.trackAvailabilityCounterViewed(
        type,
        currentCount,
        limit,
        isAtLimit,
        plan || 'unknown',
        user.uid
      );
    }
  }, [type, currentCount, limit, isAtLimit, plan, user]);
  
  const getTypeLabel = () => {
    switch (type) {
      case 'shows': return 'shows';
      case 'props': return 'props';
      case 'packingBoxes': return 'packing boxes';
      case 'archivedShows': return 'archived shows';
      case 'boards': return 'boards';
      case 'collaborators': return 'collaborators';
      default: return type;
    }
  };
  
  const getUpgradeText = () => {
    if (plan === 'free') {
      return 'Upgrade Plan';
    }
    if (canPurchaseAddOns) {
      return 'Buy Add-On';
    }
    return 'Upgrade';
  };
  
  const getUpgradeLink = () => {
    if (plan === 'free') {
      return '/profile';
    }
    if (canPurchaseAddOns) {
      return '/profile?tab=addons';
    }
    return '/profile';
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className={`${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-600'}`}>
        {currentCount} of {limit} {getTypeLabel()}
      </span>
      
      {showUpgradeButton && (isAtLimit || isNearLimit) && (
        <Link
          to={getUpgradeLink()}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            isAtLimit 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          {getUpgradeText()}
        </Link>
      )}
    </div>
  );
};

export default AvailabilityCounter;
