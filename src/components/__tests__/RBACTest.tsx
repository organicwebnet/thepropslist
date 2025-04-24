import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, UserPermissions } from '../../shared/types/auth';

const RBACTest: React.FC = () => {
  const { user, profile, signIn, signOut, hasPermission, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const testPermissions = async () => {
    if (!user) return;

    const results: Record<string, boolean> = {};
    const permissions: (keyof UserPermissions)[] = [
      'canCreateProps',
      'canEditProps',
      'canDeleteProps',
      'canManageUsers',
      'canGenerateReports',
      'canAccessAdvancedFeatures'
    ];

    for (const permission of permissions) {
      results[permission] = await hasPermission(permission);
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
            <p style={{ margin: '0 0 4px' }}><strong>Role:</strong> {profile?.role || 'No role'}</p>
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
        <form onSubmit={handleSignIn} style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Email:
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0'
                }}
              />
            </label>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>
              Password:
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0'
                }}
              />
            </label>
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </form>
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