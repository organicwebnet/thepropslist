import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useWebAuth } from '../contexts/WebAuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

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

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (!user) throw new Error('Not signed in');
        if (!(userProfile?.role === 'god')) throw new Error('Forbidden');
        const fn = httpsCallable<unknown, StatsResponse>(getFunctions(), 'getSubscriptionStats');
        const res = await fn({});
        if (isMounted) setStats(res.data);
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to load');
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
      <tr><td className="px-3 py-2 text-pb-gray" colSpan={2}>None</td></tr>
    );
    return entries.map(([k, v]) => (
      <tr key={k} className="border-t border-pb-primary/10">
        <td className="px-3 py-2 text-white">{k}</td>
        <td className="px-3 py-2 text-white">{v}</td>
      </tr>
    ));
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Subscriber Stats</h1>
          <div className="text-sm text-pb-gray">Visible to god only</div>
        </div>
        {loading ? (
          <div className="text-pb-gray">Loading…</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : !stats ? (
          <div className="text-pb-gray">No data.</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded border border-pb-primary/20 bg-pb-darker/40 p-4">
              <div className="text-pb-gray mb-2">Total subscribers</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded border border-pb-primary/20 bg-pb-darker/40 overflow-hidden">
                <div className="px-3 py-2 text-pb-gray border-b border-pb-primary/10">By plan</div>
                <table className="min-w-full text-sm">
                  <tbody>
                    {renderRows(stats.byPlan)}
                  </tbody>
                </table>
              </div>
              <div className="rounded border border-pb-primary/20 bg-pb-darker/40 overflow-hidden">
                <div className="px-3 py-2 text-pb-gray border-b border-pb-primary/10">By status</div>
                <table className="min-w-full text-sm">
                  <tbody>
                    {renderRows(stats.byStatus)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriberStatsPage;


