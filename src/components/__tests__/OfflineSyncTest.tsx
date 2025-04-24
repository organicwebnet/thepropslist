import React, { useEffect, useState } from 'react';
import { WebFirebaseService } from '../../platforms/web/services/firebase';
import { OfflineSyncService } from '../../shared/services/firebase/offline';

interface SyncStatus {
  isEnabled: boolean;
  lastSync: number;
  syncedCollections: string[];
}

const OfflineSyncTest: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const firebase = new WebFirebaseService();
  const offlineSync = new OfflineSyncService(firebase);

  useEffect(() => {
    const initializeSync = async () => {
      try {
        await firebase.initialize();
        await offlineSync.initialize();
        await updateStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize offline sync');
      }
    };

    initializeSync();
  }, []);

  const updateStatus = async () => {
    try {
      const status = await offlineSync.getSyncStatus();
      setStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync status');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await offlineSync.syncAll();
      await updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await offlineSync.clearCache();
      await updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ color: '#2563eb' }}>Offline Sync Test Panel</h2>

      {status ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{
            padding: '16px',
            backgroundColor: status.isEnabled ? '#f0fdf4' : '#fef2f2',
            borderRadius: '8px',
            border: `1px solid ${status.isEnabled ? '#bbf7d0' : '#fecaca'}`
          }}>
            <h3 style={{ 
              margin: '0 0 8px',
              color: status.isEnabled ? '#166534' : '#dc2626'
            }}>
              Sync Status: {status.isEnabled ? 'Enabled' : 'Disabled'}
            </h3>
            <p style={{ margin: '0 0 4px' }}>
              <strong>Last Sync:</strong>{' '}
              {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
            </p>
            <p style={{ margin: '0' }}>
              <strong>Synced Collections:</strong>{' '}
              {status.syncedCollections.join(', ')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={handleClearCache}
              disabled={isSyncing}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              Clear Cache
            </button>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px'
        }}>
          Initializing offline sync...
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
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default OfflineSyncTest; 