import React, { useState, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { adminPricingService } from '../services/AdminPricingService';
import { type AdminPricingData, type PricingPlan } from '../shared/types/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard,
  DollarSign,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

const AdminPricingPage: React.FC = () => {
  const { userProfile } = useWebAuth();
  const [pricingData, setPricingData] = useState<AdminPricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, _setEditingPlan] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Check if user is god/admin
  const isAdmin = userProfile?.role === 'god' || userProfile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadPricingData();
    }
  }, [isAdmin]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = await adminPricingService.getPricingConfig();
      
      // If no data exists, create default configuration
      if (!data) {
        data = adminPricingService.getDefaultPricingConfig();
        await adminPricingService.savePricingConfig(data, userProfile?.email || 'admin');
      }
      
      setPricingData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePricing = async () => {
    if (!pricingData) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate all price IDs
      const validationErrors: string[] = [];
      pricingData.plans.forEach((plan: PricingPlan) => {
        if (plan.priceId.monthly && !adminPricingService.validatePriceId(plan.priceId.monthly)) {
          validationErrors.push(`${plan.name} monthly price ID is invalid`);
        }
        if (plan.priceId.yearly && !adminPricingService.validatePriceId(plan.priceId.yearly)) {
          validationErrors.push(`${plan.name} yearly price ID is invalid`);
        }
      });

      if (validationErrors.length > 0) {
        setError(`Validation errors:\n${validationErrors.join('\n')}`);
        return;
      }

      await adminPricingService.savePricingConfig(pricingData, userProfile?.email || 'admin');
      setSuccess('Pricing configuration saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing configuration');
    } finally {
      setSaving(false);
    }
  };

  const updatePlanPriceId = (planId: string, type: 'monthly' | 'yearly', value: string) => {
    if (!pricingData) return;

    const updatedPlans = pricingData.plans.map((plan: PricingPlan) => {
      if (plan.id === planId) {
        return {
          ...plan,
          priceId: {
            ...plan.priceId,
            [type]: value
          }
        };
      }
      return plan;
    });

    setPricingData({
      ...pricingData,
      plans: updatedPlans
    });
  };

  const togglePlanActive = (planId: string) => {
    if (!pricingData) return;

    const updatedPlans = pricingData.plans.map((plan: PricingPlan) => {
      if (plan.id === planId) {
        return {
          ...plan,
          active: !plan.active
        };
      }
      return plan;
    });

    setPricingData({
      ...pricingData,
      plans: updatedPlans
    });
  };

  // const _clearMessages = () => {
  //   setError(null);
  //   setSuccess(null);
  // };

  if (!isAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10 px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-pb-gray">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-10 px-4">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-pb-primary animate-spin" />
          <span className="ml-3 text-pb-gray">Loading pricing configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pricing Management</h1>
          <p className="text-pb-gray">
            Manage Stripe price IDs and subscription plans
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowValidation(!showValidation)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showValidation 
                ? 'border-green-500 text-green-400 bg-green-500/10' 
                : 'border-pb-gray/30 text-pb-gray hover:border-pb-primary hover:text-pb-primary'
            }`}
          >
            {showValidation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showValidation ? 'Hide' : 'Show'} Validation
          </button>
          
          <button
            onClick={loadPricingData}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-pb-gray/30 text-pb-gray hover:border-pb-primary hover:text-pb-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleSavePricing}
            disabled={saving || !pricingData}
            className="px-6 py-2 bg-pb-primary text-white rounded-lg hover:bg-pb-secondary transition-colors disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <div className="text-red-400 whitespace-pre-line">{error}</div>
            </div>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <div className="text-green-400">{success}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Updated Info */}
      {pricingData && (
        <div className="mb-6 p-4 bg-pb-darker/60 rounded-lg border border-pb-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-5 h-5 text-pb-primary mr-2" />
              <span className="text-pb-gray">Last updated:</span>
              <span className="text-white ml-2">
                {new Date(pricingData.lastUpdated).toLocaleString()}
              </span>
            </div>
            <div className="text-pb-gray">
              by {pricingData.updatedBy}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      {pricingData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pricingData.plans.map((plan: PricingPlan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-6 border-2 transition-all ${
                plan.active
                  ? plan.popular
                    ? 'border-pb-primary bg-pb-primary/10'
                    : 'border-pb-gray/30 bg-pb-darker/50'
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              {/* Plan Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${plan.color} rounded-lg flex items-center justify-center mr-3`}>
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-pb-gray">{plan.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {plan.popular && (
                    <span className="bg-pb-primary text-white px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      Popular
                    </span>
                  )}
                  
                  <button
                    onClick={() => togglePlanActive(plan.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      plan.active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {plan.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Price Display */}
              <div className="mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-2xl font-bold text-white">£{plan.price.monthly}</span>
                    <span className="text-pb-gray">/month</span>
                  </div>
                  {plan.price.yearly > 0 && (
                    <div>
                      <span className="text-2xl font-bold text-white">£{plan.price.yearly}</span>
                      <span className="text-pb-gray">/year</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price ID Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-pb-gray mb-1">
                    Monthly Price ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={plan.priceId.monthly}
                      onChange={(e) => updatePlanPriceId(plan.id, 'monthly', e.target.value)}
                      placeholder="price_xxxxx"
                      className={`flex-1 px-3 py-2 bg-pb-darker/50 border rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary ${
                        showValidation && plan.priceId.monthly && !adminPricingService.validatePriceId(plan.priceId.monthly)
                          ? 'border-red-500'
                          : 'border-pb-gray/30'
                      }`}
                    />
                    {plan.priceId.monthly && (
                      <div className="flex-shrink-0">
                        {adminPricingService.validatePriceId(plan.priceId.monthly) ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-pb-gray mb-1">
                    Yearly Price ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={plan.priceId.yearly}
                      onChange={(e) => updatePlanPriceId(plan.id, 'yearly', e.target.value)}
                      placeholder="price_xxxxx"
                      className={`flex-1 px-3 py-2 bg-pb-darker/50 border rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary ${
                        showValidation && plan.priceId.yearly && !adminPricingService.validatePriceId(plan.priceId.yearly)
                          ? 'border-red-500'
                          : 'border-pb-gray/30'
                      }`}
                    />
                    {plan.priceId.yearly && (
                      <div className="flex-shrink-0">
                        {adminPricingService.validatePriceId(plan.priceId.yearly) ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-pb-gray mb-2">Features</h4>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((feature: string, index: number) => (
                    <li key={index} className="text-sm text-pb-gray flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-400 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-xs text-pb-gray">
                      +{plan.features.length - 3} more features
                    </li>
                  )}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-6 bg-pb-darker/60 rounded-2xl border border-pb-primary/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          How to Get Price IDs
        </h3>
        <div className="text-pb-gray space-y-2">
          <p>1. Go to your <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-pb-primary hover:underline">Stripe Dashboard</a></p>
          <p>2. Click on each product (Starter, Standard, Pro)</p>
          <p>3. Copy the Price ID for each billing interval (monthly/yearly)</p>
          <p>4. Paste the Price IDs in the fields above</p>
          <p>5. Click "Save Changes" to update the pricing</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPricingPage;
