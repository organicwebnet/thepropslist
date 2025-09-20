import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

type UserDoc = {
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  createdAt?: any;
  lastLogin?: any;
};

const AdminUsersPage: React.FC = () => {
  const { service } = useFirebase();
  const [users, setUsers] = useState<{ id: string; data: UserDoc }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedOutput, setSeedOutput] = useState<string | null>(null);

  useEffect(() => {
    const unsub = service.listenToCollection<UserDoc>('users', (docs) => {
      setUsers(docs.map(d => ({ id: d.id, data: d.data as any })));
      setLoading(false);
    }, (err) => {
      setError(err?.message || 'Failed to load users');
      setLoading(false);
    });
    return () => unsub();
  }, [service]);

  const handleDeleteDocs = async (uid: string) => {
    if (!confirm('Delete user profile docs for this UID? This does NOT delete the Auth account.')) return;
    try {
      await service.deleteDocument('users', uid);
      await service.deleteDocument('userProfiles', uid);
    } catch (e: any) {
      alert(e.message || 'Failed to delete documents');
    }
  };

  const handleSeedTestUsers = async () => {
    try {
      setSeeding(true);
      setError(null);
      setSeedOutput(null);
      const fn = httpsCallable<any, { ok: boolean; users: Array<{ email: string; password: string; uid: string; plan: string }> }>(getFunctions(), 'seedTestUsers');
      const res = await fn({});
      const users = res?.data?.users || [];
      const text = users.map((u: any) => `${u.email} | ${u.password} | ${u.plan}`).join('\n');
      setSeedOutput(text || 'No users returned');
    } catch (e: any) {
      setError(e?.message || 'Failed to seed test users');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Users (Admin)</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleSeedTestUsers} disabled={seeding} className="px-3 py-1.5 rounded bg-pb-primary text-white font-semibold">
              {seeding ? 'Seeding…' : 'Seed Test Users'}
            </button>
            <div className="text-sm text-pb-gray">Tip: Deleting here removes profile docs only. To free an email for reuse, delete the Auth account in Firebase Console.</div>
          </div>
        </div>
        {seedOutput && (
          <div className="mb-4 rounded border border-pb-primary/20 bg-pb-darker/40 p-3 text-sm text-white whitespace-pre-wrap">
            {seedOutput}
          </div>
        )}
        {loading ? (
          <div className="text-pb-gray">Loading users…</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          <div className="rounded border border-pb-primary/20 bg-pb-darker/40 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-pb-gray">
                <tr>
                  <th className="text-left px-3 py-2">UID</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-pb-gray">No users.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-t border-pb-primary/10">
                    <td className="px-3 py-2 text-pb-gray">{u.id}</td>
                    <td className="px-3 py-2 text-white">{u.data.email || ''}</td>
                    <td className="px-3 py-2 text-white">{u.data.displayName || '—'}</td>
                    <td className="px-3 py-2 text-pb-gray">{u.data.role || 'user'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigator.clipboard.writeText(u.id)} className="px-2 py-1 rounded bg-pb-darker/60 text-pb-gray border border-pb-primary/20 mr-2">Copy UID</button>
                      <button onClick={() => handleDeleteDocs(u.id)} className="px-2 py-1 rounded bg-red-600/80 text-white">Delete docs</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsersPage;


