import React, { useState, useEffect } from 'react';
import { useWebAuth } from '../contexts/WebAuthContext';
import { discountCodesService, type DiscountCode, type DiscountUsage, type DiscountAnalytics } from '../services/DiscountCodesService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Tag,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

const AdminDiscountCodesPage: React.FC = () => {
  const { userProfile } = useWebAuth();
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [discountUsage, setDiscountUsage] = useState<DiscountUsage[]>([]);
  const [analytics, setAnalytics] = useState<DiscountAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  // Check if user is god/admin
  const isAdmin = userProfile?.role === 'god' || userProfile?.role === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: 0,
    currency: 'usd',
    maxRedemptions: '',
    validFrom: '',
    validUntil: '',
    active: true,
    appliesTo: 'all' as 'all' | 'specific_plans',
    planIds: [] as string[]
  });

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [codes, usage, analyticsData] = await Promise.all([
        discountCodesService.getAllDiscountCodes(),
        discountCodesService.getDiscountUsageHistory(20),
        discountCodesService.getDiscountAnalytics()
      ]);
      
      setDiscountCodes(codes);
      setDiscountUsage(usage);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load discount data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscountCode = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate form
      if (!formData.code || !formData.name || !formData.validFrom || !formData.validUntil) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.value <= 0) {
        setError('Discount value must be greater than 0');
        return;
      }

      if (formData.type === 'percentage' && formData.value > 100) {
        setError('Percentage discount cannot exceed 100%');
        return;
      }

      const discountData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        type: formData.type,
        value: formData.value,
        currency: formData.currency,
        maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : undefined,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        active: formData.active,
        appliesTo: formData.appliesTo,
        planIds: formData.appliesTo === 'specific_plans' ? formData.planIds : undefined
      };

      await discountCodesService.createDiscountCode(discountData);
      
      setSuccess('Discount code created successfully!');
      setShowCreateForm(false);
      resetForm();
      loadData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create discount code');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (codeId: string, currentActive: boolean) => {
    try {
      await discountCodesService.updateDiscountCode(codeId, { active: !currentActive });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update discount code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      currency: 'usd',
      maxRedemptions: '',
      validFrom: '',
      validUntil: '',
      active: true,
      appliesTo: 'all',
      planIds: []
    });
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

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
          <span className="ml-3 text-pb-gray">Loading discount codes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Discount Codes Management</h1>
          <p className="text-pb-gray">
            Create and manage discount codes for subscriptions
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-pb-gray/30 text-pb-gray hover:border-pb-primary hover:text-pb-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-2 bg-pb-primary text-white rounded-lg hover:bg-pb-secondary transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Discount Code
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
              <div className="text-red-400">{error}</div>
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

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pb-gray text-sm">Total Codes</p>
                <p className="text-2xl font-bold text-white">{analytics.totalCodes}</p>
              </div>
              <Tag className="w-8 h-8 text-pb-primary" />
            </div>
          </div>

          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pb-gray text-sm">Active Codes</p>
                <p className="text-2xl font-bold text-white">{analytics.activeCodes}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pb-gray text-sm">Total Redemptions</p>
                <p className="text-2xl font-bold text-white">{analytics.totalRedemptions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pb-gray text-sm">Total Discount Given</p>
                <p className="text-2xl font-bold text-white">${analytics.totalDiscountGiven.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Create New Discount Code</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="discount-code"
                  className="block text-sm font-medium text-pb-gray mb-1"
                >
                  Code *
                </label>
                <input
                  id="discount-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  aria-describedby="code-help"
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/20"
                />
                <p id="code-help" className="text-xs text-pb-gray mt-1">
                  Use only letters and numbers, 3-20 characters
                </p>
              </div>

              <div>
                <label 
                  htmlFor="discount-name"
                  className="block text-sm font-medium text-pb-gray mb-1"
                >
                  Name *
                </label>
                <input
                  id="discount-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="20% Off Special"
                  aria-describedby="name-help"
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/20"
                />
                <p id="name-help" className="text-xs text-pb-gray mt-1">
                  Display name for the discount code
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-pb-gray mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Special discount for new customers"
                  rows={2}
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-pb-gray mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed_amount' })}
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white focus:outline-none focus:border-pb-primary"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-pb-gray mb-1">
                  Value {formData.type === 'percentage' ? '(%)' : '($)'} *
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max={formData.type === 'percentage' ? 100 : undefined}
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white focus:outline-none focus:border-pb-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-pb-gray mb-1">Valid From *</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white focus:outline-none focus:border-pb-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-pb-gray mb-1">Valid Until *</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white focus:outline-none focus:border-pb-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-pb-gray mb-1">Max Redemptions</label>
                <input
                  type="number"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  min="1"
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 bg-pb-darker/50 border border-pb-gray/30 rounded-lg text-white placeholder-pb-gray focus:outline-none focus:border-pb-primary"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-pb-gray">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-pb-gray hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDiscountCode}
                disabled={saving}
                className="px-6 py-2 bg-pb-primary text-white rounded-lg hover:bg-pb-secondary transition-colors disabled:opacity-50 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discount Codes List */}
      <div className="bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
        <h3 className="text-xl font-semibold text-white mb-4">Discount Codes</h3>
        
        {discountCodes.length === 0 ? (
          <div className="text-center py-8">
            <Tag className="w-16 h-16 text-pb-gray mx-auto mb-4" />
            <p className="text-pb-gray">No discount codes created yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discountCodes.map((code) => (
              <div
                key={code.id}
                className={`p-4 rounded-lg border transition-all ${
                  code.active
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-pb-darker/50 rounded text-pb-primary font-mono">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="p-1 hover:bg-pb-darker/50 rounded"
                      >
                        <Copy className="w-4 h-4 text-pb-gray hover:text-white" />
                      </button>
                    </div>
                    
                    <div>
                      <h4 className="text-white font-medium">{code.name}</h4>
                      <p className="text-sm text-pb-gray">{code.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white font-medium">
                        {discountCodesService.formatDiscountCode(code)}
                      </p>
                      <p className="text-sm text-pb-gray">
                        {code.timesRedeemed} redemptions
                        {code.maxRedemptions && ` / ${code.maxRedemptions}`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleActive(code.id, code.active)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        code.active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {code.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Usage */}
      {discountUsage.length > 0 && (
        <div className="mt-8 bg-pb-darker/60 rounded-2xl p-6 border border-pb-primary/20">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Usage</h3>
          
          <div className="space-y-3">
            {discountUsage.slice(0, 10).map((usage) => (
              <div key={usage.id} className="flex items-center justify-between p-3 bg-pb-darker/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{usage.userEmail}</p>
                  <p className="text-sm text-pb-gray">
                    {new Date(usage.usedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-medium">
                    -${usage.discountAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-pb-gray">{usage.planId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscountCodesPage;
