import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { UserRole, UserPermissions } from '../../shared/types/auth.ts';

const RBACTest: React.FC = () => {
  const { user, userProfile, signOut, permissions, error, loading } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const testPermissions = async () => {
    if (!user) return;

    const results: Record<string, boolean> = {};
    const permissionsToTest: (keyof UserPermissions)[] = [
      'canCreateProps',
      'canEditProps',
      'canDeleteProps',
      'canManageUsers',
    ];

    for (const permissionKey of permissionsToTest) {
      results[permissionKey as string] = !!permissions[permissionKey];
    }

    setTestResults(results);
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ color: '#2563eb' }}>RBAC Test Panel</h2>

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
            <p style={{ margin: '0 0 4px' }}><strong>Role:</strong> {userProfile?.role || 'No role'}</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={testPermissions}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Permissions
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
              <h3 style={{ margin: '0 0 12px' }}>Permission Test Results</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {Object.entries(testResults).map(([permission, allowed]) => (
                  <div key={permission} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: allowed ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '4px'
                  }}>
                    <span>{permission}</span>
                    <span style={{ 
                      color: allowed ? '#166534' : '#dc2626',
                      fontWeight: 'bold'
                    }}>
                      {allowed ? '✓ Allowed' : '✗ Denied'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
          <p>Please sign in to test RBAC permissions.</p>
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

export default RBACTest; 
