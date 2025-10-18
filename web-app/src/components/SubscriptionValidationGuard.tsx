/**
 * SubscriptionValidationGuard Component
 * 
 * A guard component that validates subscription limits before allowing actions
 * Shows upgrade prompts when limits are reached
 */

import React, { useState, useEffect } from 'react';
import { useLimitChecker } from '../hooks/useLimitChecker';
import { useWebAuth } from '../contexts/WebAuthContext';
import { AlertTriangle, X, CreditCard } from 'lucide-react';

interface SubscriptionValidationGuardProps {
  children: React.ReactNode;
  resourceType: 'shows' | 'boards' | 'props' | 'packingBoxes';
  onValidationFailed?: (message: string) => void;
  showUpgradePrompt?: boolean;
}

export const SubscriptionValidationGuard: React.FC<SubscriptionValidationGuardProps> = ({
  children,
  resourceType,
  onValidationFailed,
  showUpgradePrompt = true
}) => {
  const { user, userProfile } = useWebAuth();
  const { checkShowLimit, checkBoardLimit, checkPropLimit, checkPackingBoxLimit } = useLimitChecker();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // God users are always allowed
  if (userProfile?.role === 'god') {
    return <>{children}</>;
  }

  const validateResource = async () => {
    if (!user?.uid) return;

    setIsValidating(true);
    try {
      let result;
      switch (resourceType) {
        case 'shows':
          result = await checkShowLimit(user.uid);
          break;
        case 'boards':
          result = await checkBoardLimit(user.uid);
          break;
        case 'props':
          result = await checkPropLimit(user.uid);
          break;
        case 'packingBoxes':
          result = await checkPackingBoxLimit(user.uid);
          break;
        default:
          result = { withinLimit: true };
      }
      
      const validationResult = {
        valid: result.withinLimit,
        message: result.message,
        requiresUpgrade: !result.withinLimit
      };
      
      setValidationResult(validationResult);
      
      if (!validationResult.valid) {
        onValidationFailed?.(validationResult.message || 'Validation failed');
        if (validationResult.requiresUpgrade && showUpgradePrompt) {
          setShowUpgradeModal(true);
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({ valid: false, message: 'Validation error' });
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    validateResource();
  }, [user?.uid, resourceType]);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pb-primary"></div>
        <span className="ml-2 text-pb-gray">Validating...</span>
      </div>
    );
  }

  if (validationResult && !validationResult.valid) {
    return (
      <>
        <div className="bg-pb-error/10 border border-pb-error/20 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-pb-error mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-pb-error font-medium mb-1">Limit Reached</h3>
              <p className="text-pb-error/80 text-sm mb-3">{validationResult.message}</p>
              {showUpgradePrompt && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-pb-error hover:bg-pb-error/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>
        
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-pb-darker border border-pb-primary/20 rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Upgrade Required</h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-pb-gray hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-pb-gray mb-4">{validationResult.message}</p>
                <p className="text-pb-light text-sm">
                  Upgrade your plan to continue creating {resourceType} and unlock more features.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-pb-gray/20 hover:bg-pb-gray/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    // Navigate to pricing page
                    window.location.href = '/pricing';
                  }}
                  className="flex-1 bg-pb-primary hover:bg-pb-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};
