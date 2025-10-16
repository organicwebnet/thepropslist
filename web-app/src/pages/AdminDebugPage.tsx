import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useWebAuth } from '../contexts/WebAuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AdminDebugPage: React.FC = () => {
  const { user, userProfile, loading } = useWebAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [functionTest, setFunctionTest] = useState<any>(null);

  useEffect(() => {
    const loadDebugInfo = async () => {
      if (!user || !userProfile) return;
      
      setDebugInfo({
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        userProfile: {
          uid: userProfile.uid,
          email: userProfile.email,
          role: userProfile.role,
          groups: userProfile.groups,
        },
        isGod: userProfile.role === 'god',
        timestamp: new Date().toISOString(),
      });
    };

    loadDebugInfo();
  }, [user, userProfile]);

  const testFunction = async () => {
    try {
      const fn = httpsCallable(getFunctions(), 'getSubscriptionStats');
      const result = await fn({});
      setFunctionTest({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      setFunctionTest({
        success: false,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
    }
  };

  if (loading) {
    return <DashboardLayout><div className="text-white">Loading...</div></DashboardLayout>;
  }

  if (!user) {
    return <DashboardLayout><div className="text-red-400">Not authenticated</div></DashboardLayout>;
  }

  if (!userProfile) {
    return <DashboardLayout><div className="text-red-400">No user profile loaded</div></DashboardLayout>;
  }

  if (userProfile.role !== 'god') {
    return <DashboardLayout><div className="text-red-400">Access denied. Role: {userProfile.role}</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Debug Page</h1>
        
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg font-semibold text-white mb-3">Debug Information</h2>
            <pre className="text-sm text-gray-300 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-lg font-semibold text-white mb-3">Function Test</h2>
            <button
              onClick={testFunction}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-3"
            >
              Test getSubscriptionStats Function
            </button>
            {functionTest && (
              <pre className="text-sm text-gray-300 overflow-auto">
                {JSON.stringify(functionTest, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDebugPage;









