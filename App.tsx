import React from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import FirebaseTest from './src/components/__tests__/FirebaseTest';
import RBACTest from './src/components/__tests__/RBACTest';
import OfflineSyncTest from './src/components/__tests__/OfflineSyncTest';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <div style={{ padding: '20px' }}>
        <h1 style={{ 
          color: '#1e40af',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          Props Bible Testing Dashboard
        </h1>
        <div style={{ 
          display: 'grid',
          gap: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <FirebaseTest />
          <RBACTest />
          <OfflineSyncTest />
        </div>
      </div>
    </AuthProvider>
  );
} 