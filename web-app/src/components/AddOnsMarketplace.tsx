import React, { useState, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { addOnService } from '../services/AddOnService';
import { AddOn } from '../types/AddOns';
import { analytics } from '../services/AnalyticsService';
import ConfirmationModal from './ConfirmationModal';

interface AddOnsMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddOnsMarketplace: React.FC<AddOnsMarketplaceProps> = ({ isOpen, onClose }) => {
  const { user } = useWebAuth();
  const { plan, canPurchaseAddOns } = useSubscription();
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [confirmPurchase, setConfirmPurchase] = useState<{ addOn: AddOn; addOnId: string } | null>(null);

  useEffect(() => {
    if (isOpen && canPurchaseAddOns) {
      loadAddOns();
      // Track marketplace view
      analytics.trackAddOnsMarketplaceViewed(plan || 'unknown', canPurchaseAddOns, user?.uid);
    }
  }, [isOpen, canPurchaseAddOns, plan, user]);

  const loadAddOns = async () => {
    setLoading(true);
    try {
      // For now, we'll use the default add-ons from the types file
      // In the future, this could fetch from a Cloud Function
      const { DEFAULT_ADDONS } = await import('../types/AddOns');
      setAddOns(DEFAULT_ADDONS);
    } catch (error) {
      console.error('Error loading add-ons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (addOnId: string) => {
    const addOn = addOns.find(a => a.id === addOnId);
    if (!addOn) return;
    
    setConfirmPurchase({ addOn, addOnId });
  };

  const handleConfirmPurchase = async () => {
    if (!user || !confirmPurchase) return;
    
    const { addOn, addOnId } = confirmPurchase;

    // Track purchase attempt
    analytics.trackAddOnPurchaseAttempted(
      addOnId,
      addOn.type,
      billingInterval,
      plan || 'unknown',
      user.uid
    );
    
    setPurchasing(addOnId);
    try {
      const result = await addOnService.purchaseAddOn(user.uid, addOnId, billingInterval);
      if (result.success) {
        // Track successful purchase
        analytics.trackAddOnPurchaseCompleted(addOnId, result.subscriptionItemId || '', user.uid);
        alert('Add-on purchased successfully! It will be added to your next billing cycle.');
        setConfirmPurchase(null);
        onClose();
      } else {
        // Track failed purchase
        analytics.trackAddOnPurchaseFailed(addOnId, result.error || 'Unknown error', user.uid);
        alert(`Failed to purchase add-on: ${result.error}`);
      }
    } catch (error) {
      console.error('Error purchasing add-on:', error);
      // Track failed purchase
      analytics.trackAddOnPurchaseFailed(addOnId, error instanceof Error ? error.message : 'Unknown error', user.uid);
      alert('An error occurred while purchasing the add-on.');
    } finally {
      setPurchasing(null);
    }
  };

  if (!isOpen) return null;

  if (!canPurchaseAddOns) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Add-Ons Not Available</h3>
          <p className="text-gray-600 mb-4">
            Add-ons are only available for Standard and Pro plans. 
            {plan === 'free' && ' Upgrade your plan to access add-ons.'}
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold">Add-Ons Marketplace</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-6">
          <span className={`mr-3 ${billingInterval === 'monthly' ? 'font-semibold' : 'text-gray-500'}`}>
            Monthly
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={billingInterval === 'yearly'}
              onChange={(e) => setBillingInterval(e.target.checked ? 'yearly' : 'monthly')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className={`ml-3 ${billingInterval === 'yearly' ? 'font-semibold' : 'text-gray-500'}`}>
            Yearly (Save ~10%)
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading add-ons...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addOn) => (
              <div key={addOn.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{addOn.name}</h4>
                  {addOn.popular && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">{addOn.description}</p>
                
                <div className="mb-4">
                  <div className="text-2xl font-bold text-blue-600">
                    £{billingInterval === 'monthly' ? addOn.monthlyPrice : addOn.yearlyPrice}
                    <span className="text-sm font-normal text-gray-500">
                      /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    +{addOn.quantity} {addOn.type.replace(/_/g, ' ')}
                  </div>
                </div>

                <ul className="text-sm text-gray-600 mb-4">
                  {addOn.features.map((feature, index) => (
                    <li key={index} className="flex items-center mb-1">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchaseClick(addOn.id)}
                  disabled={purchasing === addOn.id}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing === addOn.id ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmPurchase}
        title="Confirm Add-On Purchase"
        message={
          confirmPurchase
            ? `Are you sure you want to purchase "${confirmPurchase.addOn.name}" for £${
                billingInterval === 'monthly' 
                  ? confirmPurchase.addOn.monthlyPrice 
                  : confirmPurchase.addOn.yearlyPrice
              }/${billingInterval === 'monthly' ? 'month' : 'year'}? This will be added to your next billing cycle.`
            : ''
        }
        confirmText="Purchase"
        cancelText="Cancel"
        onConfirm={handleConfirmPurchase}
        onCancel={() => setConfirmPurchase(null)}
        isLoading={!!purchasing}
      />
    </div>
  );
};

export default AddOnsMarketplace;
