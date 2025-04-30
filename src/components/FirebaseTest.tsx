import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
// RN Firebase (for native)
import appNative from '@react-native-firebase/app';
import firestoreNative, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'; // Import type explicitly
// Web Firebase (for web)
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, DocumentSnapshot as WebDocumentSnapshot } from 'firebase/firestore';
import { getFirebaseConfig } from '../config/firebase'; // Import web config

const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    const runTest = async () => {
      try {
        // --- Firestore Read Test ---
        // Replace 'testCollection/testDoc' with an actual path
        // to a document you know exists in your Firestore database.
        const collectionPath = 'shows';
        const docId = 'dfGtqHXgzSWeuytpLIoa';

        // Define docSnap with a union type
        let docSnap: WebDocumentSnapshot | FirebaseFirestoreTypes.DocumentSnapshot | undefined;

        if (Platform.OS === 'web') {
          // Web Firebase Logic
          setStatus('Checking web app...');
          let app;
          if (!getApps().length) {
            console.log("Initializing Firebase Web App for Test Component...");
            const firebaseConfig = getFirebaseConfig();
            app = initializeApp(firebaseConfig);
          } else {
            console.log("Using existing Firebase Web App for Test Component...");
            app = getApp(); // Get default app if already initialized
          }
          setStatus(`Web app found/initialized. Reading Firestore...`);
          const db = getFirestore(app);
          const docRef = doc(db, collectionPath, docId);
          docSnap = await getDoc(docRef); // Assign web snapshot

        } else {
          // Native Firebase Logic (@react-native-firebase)
          setStatus('Checking default native app...');
          const defaultApp = appNative.app(); // Check if default app exists (native)
          setStatus(`Default native app found: ${defaultApp.name}. Reading Firestore...`);
          const docRef = firestoreNative().collection(collectionPath).doc(docId);
          docSnap = await docRef.get(); // Assign native snapshot
        }
        // --- End Firestore Read Test ---

        // Check existence based on platform
        let exists = false;
        let dataPayload: any = null; // Use any for data payload for simplicity here

        if (docSnap) { // Check if docSnap is defined before accessing
          if (Platform.OS === 'web') {
             // Explicitly cast to WebDocumentSnapshot before calling .exists() / .data()
            const webSnap = docSnap as WebDocumentSnapshot;
            exists = webSnap.exists(); 
            if (exists) {
              dataPayload = webSnap.data();
            }
          } else {
            // Explicitly cast to FirebaseFirestoreTypes.DocumentSnapshot before accessing .exists / .data()
            const nativeSnap = docSnap as FirebaseFirestoreTypes.DocumentSnapshot;
            exists = nativeSnap.exists;
            if (exists) {
              dataPayload = nativeSnap.data();
            }
          }
        }

        if (exists) {
          setStatus('Firestore read successful!');
          setData(dataPayload);
          setError(null);
        } else {
          setStatus('Firestore document not found.');
          setError(`Test document does not exist at ${collectionPath}/${docId}.`);
          setData(null);
        }

      } catch (e: any) {
        console.error("Firebase Test Failed:", e);
        setStatus('Test Failed.');
        setError(e.message || 'An unknown error occurred');
        setData(null);
      }
    };

    runTest();
  }, []); // End useEffect

  // Restore return statement and JSX
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.statusText}>Status: {status}</Text>
      {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}
      {data ? (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Data from Firestore:</Text> 
          <Text style={styles.dataText}>{JSON.stringify(data, null, 2)}</Text>
        </View>
      ) : null}
      {status.includes('...') ? <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} /> : null}
    </View>
  );
};

// Restore styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  dataContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    width: '100%',
  },
  dataTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dataText: {
    fontFamily: 'monospace', // Or another suitable font
  },
});

// Restore export
export default FirebaseTest;
