import React, { useEffect, useState } from 'react';
import { WebFirebaseService } from '../../platforms/web/services/firebase';
import { collection, addDoc, getDoc, deleteDoc } from 'firebase/firestore';

interface TestStatus {
  firestore: string;
  auth: string;
  storage: string;
  offline: string;
}

const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState<TestStatus>({
    firestore: 'Pending...',
    auth: 'Pending...',
    storage: 'Pending...',
    offline: 'Pending...'
  });
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<string>('Checking configuration...');

  useEffect(() => {
    const testFirebase = async () => {
      const firebase = new WebFirebaseService();
      
      try {
        // Check environment variables
        const requiredVars = [
          'EXPO_PUBLIC_FIREBASE_API_KEY',
          'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
          'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
          'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
          'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
          'EXPO_PUBLIC_FIREBASE_APP_ID'
        ];

        const missingVars = requiredVars.filter(
          varName => !process.env[varName]
        );

        if (missingVars.length > 0) {
          throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
        }

        setConfigStatus('Configuration verified ✅');

        // Initialize Firebase
        await firebase.initialize();
        
        // Test Firestore
        try {
          const db = firebase.getFirestoreJsInstance();
          const testCollection = collection(db, 'test');
          
          const testDocRef = await addDoc(testCollection, {
            timestamp: new Date(),
            test: 'Hello Firebase!'
          });
          
          const docSnap = await getDoc(testDocRef);
          await deleteDoc(testDocRef);
          
          setStatus(prev => ({ ...prev, firestore: 'Firestore: ✅ Working' }));
        } catch (err) {
          setStatus(prev => ({ ...prev, firestore: 'Firestore: ❌ Failed' }));
          console.error('Firestore test failed:', err);
        }

        // Test Auth
        try {
          const auth = firebase.auth();
          if (auth.currentUser === null) {
            setStatus(prev => ({ ...prev, auth: 'Auth: ✅ Working (Not signed in)' }));
          } else {
            setStatus(prev => ({ ...prev, auth: 'Auth: ✅ Working (Signed in)' }));
          }
        } catch (err) {
          setStatus(prev => ({ ...prev, auth: 'Auth: ❌ Failed' }));
          console.error('Auth test failed:', err);
        }

        // Test Storage
        try {
          const storage = firebase.storage();
          const testBlob = new Blob(['test'], { type: 'text/plain' });
          const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
          
          const url = await storage.upload('test/test.txt', testFile);
          await storage.delete('test/test.txt');
          
          setStatus(prev => ({ ...prev, storage: 'Storage: ✅ Working' }));
        } catch (err) {
          setStatus(prev => ({ ...prev, storage: 'Storage: ❌ Failed' }));
          console.error('Storage test failed:', err);
        }

        // Test Offline Sync
        try {
          const offline = firebase.offline();
          await offline.enableSync();
          const syncStatus = await offline.getSyncStatus();
          
          setStatus(prev => ({ 
            ...prev, 
            offline: `Offline Sync: ✅ Working (${syncStatus ? 'Enabled' : 'Disabled'})`
          }));
        } catch (err) {
          setStatus(prev => ({ ...prev, offline: 'Offline Sync: ❌ Failed' }));
          console.error('Offline sync test failed:', err);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setConfigStatus(`Configuration error: ${errorMessage}`);
        console.error('Firebase initialization error:', err);
      }
    };

    testFirebase();
  }, []);

  return (
    <div style={{ 
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ color: '#2563eb' }}>Firebase Service Test</h2>
      
      <div style={{ 
        marginBottom: '16px',
        padding: '12px',
        borderRadius: '6px',
        backgroundColor: error ? '#fee2e2' : '#f0fdf4',
        color: error ? '#dc2626' : '#166534'
      }}>
        <strong>Configuration Status:</strong> {configStatus}
      </div>

      <div style={{ 
        display: 'grid',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0'
      }}>
        {Object.values(status).map((statusMsg, index) => (
          <p key={index} style={{ margin: '0' }}>
            {statusMsg}
          </p>
        ))}
      </div>
      
      {error && (
        <div style={{ 
          marginTop: '16px',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: '#fee2e2',
          color: '#dc2626'
        }}>
          <strong>Error Details:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default FirebaseTest; 