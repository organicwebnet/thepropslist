import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useWebAuth } from '../contexts/WebAuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BarChart3, Users, TrendingUp, AlertCircle } from 'lucide-react';

type StatsResponse = {
  total: number;
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
};

const SubscriberStatsPage: React.FC = () => {
  const { user, userProfile } = useWebAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  // Check if current user is god
  if (!userProfile || userProfile.role !== 'god') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-pb-gray/70">Only god users can access subscriber statistics.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('SubscriberStatsPage: Loading stats...', {
          user: user?.uid,
          userProfile: userProfile?.role,
          isGod: userProfile?.role === 'god'
        });
        
        if (!user) throw new Error('Not signed in');
        if (!userProfile) throw new Error('User profile not loaded');
        if (!(userProfile?.role === 'god')) throw new Error(`Forbidden: Role is '${userProfile?.role}', required 'god'`);
        
        console.log('SubscriberStatsPage: Calling getSubscriptionStats function...');
        const fn = httpsCallable<unknown, StatsResponse>(getFunctions(), 'getSubscriptionStats');
        const res = await fn({});
        
        console.log('SubscriberStatsPage: Function response:', res.data);
        if (isMounted) setStats(res.data);
      } catch (e: any) {
        console.error('SubscriberStatsPage: Error loading stats:', e);
        let errorMessage = 'Failed to load subscriber statistics';
        
        if (e?.code === 'permission-denied') {
          errorMessage = 'Access denied. You need god role or system-admin group permissions.';
        } else if (e?.code === 'unauthenticated') {
          errorMessage = 'Authentication required. Please sign in again.';
        } else if (e?.code === 'internal') {
          errorMessage = 'Internal server error. Please try again or contact support.';
        } else if (e?.message) {
          errorMessage = e.message;
        }
        
        if (isMounted) setError(errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [user, userProfile]);

  const renderRows = (obj: Record<string, number>) => {
    const entries = Object.entries(obj || {});
    if (entries.length === 0) return (
      <tr>
        <td className="py-4 text-pb-gray/70 text-center" colSpan={2}>No data available</td>
      </tr>
    );
    return entries.map(([k, v]) => (
      <tr key={k} className="border-t border-white/10 last:border-b-0">
        <td className="py-3 text-white font-medium capitalize">{k}</td>
        <td className="py-3 text-pb-primary font-semibold text-right">{v}</td>
      </tr>
    ));
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Subscriber Statistics</h1>
          </div>
          <p className="text-pb-gray/70">Overview of subscription plans and user status across the platform</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
              <p className="text-pb-gray/70">Loading subscriber statistics...</p>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-200 mb-2">Error loading subscriber statistics</div>
                  <div className="text-red-100 text-sm mb-4">{error}</div>
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      setStats(null);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !stats ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-pb-gray/50 mx-auto mb-4" />
            <p className="text-pb-gray/70 text-lg mb-2">No statistics available</p>
            <p className="text-pb-gray/50 text-sm">Unable to load subscriber data</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total Subscribers Card */}
            <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-pb-gray/70 text-sm">Total Subscribers</div>
                  <div className="text-3xl font-bold text-white">{stats.total}</div>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Plan */}
              <div className="bg-pb-darker/40 rounded-lg border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">By Subscription Plan</h3>
                  </div>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <tbody>
                      {renderRows(stats.byPlan)}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Status */}
              <div className="bg-pb-darker/40 rounded-lg border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">By Status</h3>
                  </div>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <tbody>
                      {renderRows(stats.byStatus)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriberStatsPage;


