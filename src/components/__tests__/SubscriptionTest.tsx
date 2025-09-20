import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';

const SubscriptionTest: React.FC = () => {
  const { user, userProfile, signOut, error, loading } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    if (userProfile) {
      // Simulate the subscription limits based on plan
      const plan = userProfile.plan || 'free';
      const limits = {
        free: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10 },
        starter: { shows: 3, boards: 5, packingBoxes: 200, collaboratorsPerShow: 5, props: 50 },
        standard: { shows: 10, boards: 20, packingBoxes: 1000, collaboratorsPerShow: 15, props: 100 },
        pro: { shows: 100, boards: 200, packingBoxes: 10000, collaboratorsPerShow: 100, props: 1000 },
        unknown: { shows: 1, boards: 2, packingBoxes: 20, collaboratorsPerShow: 3, props: 10 },
      };
      
      setSubscriptionInfo({
        plan,
        status: userProfile.subscriptionStatus || 'unknown',
        limits: limits[plan as keyof typeof limits] || limits.unknown
      });
    }
  }, [userProfile]);

  const testSubscriptionLimits = async () => {
    if (!subscriptionInfo) return;

    const results: Record<string, any> = {};
    
    // Test each limit
    results.plan = subscriptionInfo.plan;
    results.status = subscriptionInfo.status;
    results.limits = subscriptionInfo.limits;
    
    // Test if user can create shows (simulate)
    results.canCreateShow = subscriptionInfo.limits.shows > 0;
    results.canCreateBoard = subscriptionInfo.limits.boards > 0;
    results.canCreatePackingBox = subscriptionInfo.limits.packingBoxes > 0;
    results.canAddCollaborator = subscriptionInfo.limits.collaboratorsPerShow > 0;
    results.canCreateProp = subscriptionInfo.limits.props > 0;
    
    // Test plan-specific features
    results.hasUnbrandedPDFs = ['standard', 'pro'].includes(subscriptionInfo.plan);
    results.hasCSVExport = ['standard', 'pro'].includes(subscriptionInfo.plan);
    results.hasUnlimitedShows = subscriptionInfo.plan === 'pro';
    results.hasPrioritySupport = subscriptionInfo.plan === 'pro';

    setTestResults(results);
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ color: '#2563eb' }}>Subscription Test Panel</h2>

      {loading ? (
        <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          Loading...
        </div>
      ) : user ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#166534' }}>User Info</h3>
            <p style={{ margin: '0 0 4px' }}><strong>Email:</strong> {user.email}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Plan:</strong> {userProfile?.plan || 'No plan'}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Status:</strong> {userProfile?.subscriptionStatus || 'No status'}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Role:</strong> {userProfile?.role || 'No role'}</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={testSubscriptionLimits}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Subscription Limits
            </button>
            <button
              onClick={() => signOut()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 12px' }}>Subscription Test Results</h3>
              
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Plan Information</h4>
                <div style={{ display: 'grid', gap: '4px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Plan:</span>
                    <span style={{ fontWeight: 'bold', color: '#059669' }}>{testResults.plan}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Status:</span>
                    <span style={{ fontWeight: 'bold' }}>{testResults.status}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Resource Limits</h4>
                <div style={{ display: 'grid', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Shows:</span>
                    <span style={{ fontWeight: 'bold' }}>{testResults.limits?.shows || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Boards:</span>
                    <span style={{ fontWeight: 'bold' }}>{testResults.limits?.boards || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Packing Boxes:</span>
                    <span style={{ fontWeight: 'bold' }}>{testResults.limits?.packingBoxes || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Collaborators per Show:</span>
                    <span style={{ fontWeight: 'bold' }}>{testResults.limits?.collaboratorsPerShow || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Props:</span>
                    <span style={{ fontWeight: 'bold' }}>{testResults.limits?.props || 0}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', color: '#374151' }}>Feature Access</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { key: 'canCreateShow', label: 'Can Create Show' },
                    { key: 'canCreateBoard', label: 'Can Create Board' },
                    { key: 'canCreatePackingBox', label: 'Can Create Packing Box' },
                    { key: 'canAddCollaborator', label: 'Can Add Collaborator' },
                    { key: 'canCreateProp', label: 'Can Create Prop' },
                    { key: 'hasUnbrandedPDFs', label: 'Has Unbranded PDFs' },
                    { key: 'hasCSVExport', label: 'Has CSV Export' },
                    { key: 'hasUnlimitedShows', label: 'Has Unlimited Shows' },
                    { key: 'hasPrioritySupport', label: 'Has Priority Support' }
                  ].map(({ key, label }) => (
                    <div key={key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      backgroundColor: testResults[key] ? '#f0fdf4' : '#fef2f2',
                      borderRadius: '4px'
                    }}>
                      <span>{label}</span>
                      <span style={{ 
                        color: testResults[key] ? '#166534' : '#dc2626',
                        fontWeight: 'bold'
                      }}>
                        {testResults[key] ? '✓ Allowed' : '✗ Denied'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <p>Please sign in to test subscription limits.</p>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '6px'
        }}>
          <strong>Error:</strong> {error.message}
        </div>
      )}
    </div>
  );
};

export default SubscriptionTest;
