import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useFirebase } from '@/contexts/FirebaseContext.tsx';
import PropCard from '@/shared/components/PropCard/index.tsx';
import { Prop } from '@/shared/types/props.ts';
import { FirebaseDocument } from '@/shared/services/firebase/types.ts';
// Conditional import for firestore 'doc'
import { doc as webDoc, getDoc as webGetDoc } from 'firebase/firestore'; // For Web
import { doc as mobileDoc, getDoc as mobileGetDoc } from '@react-native-firebase/firestore'; // For Mobile
import { Link, useLocalSearchParams } from 'expo-router';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0', // Example background
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  backLink: {
    padding: 10,
    backgroundColor: '#007AFF', // Static blue color for the link
    borderRadius: 5,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: 'bold',
  },
});

export default function PropsByShowScreen() {
  const { showId } = useLocalSearchParams<{ showId?: string }>();
  const { service, isInitialized, error: firebaseError } = useFirebase();
  const [props, setProps] = useState<Prop[]>([]);
  const [showName, setShowName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      return;
    }
    if (!showId) {
      setError('Show ID is missing.');
      setLoading(false);
      setShowName('Unknown Show');
      setProps([]);
      return;
    }
    if (!service) {
        setError('Firebase service is not available.');
        setLoading(false);
        return;
    }

    const fetchPropsAndShowDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        let currentShowName = `Show (${showId})`;
        try {
          if (Platform.OS === 'web') {
            const db = service.getFirestoreJsInstance();
            const showRef = webDoc(db, "shows", showId);
            const showSnap = await webGetDoc(showRef);
            if (showSnap.exists()) {
              currentShowName = showSnap.data()?.name || `Show (${showId})`;
            } else {
              console.warn('Show with id ${showId} not found on web.');
            }
          } else {
            const db = service.getFirestoreReactNativeInstance();
            const showRef = mobileDoc(db, "shows", showId);
            const showSnap = await mobileGetDoc(showRef);
            if (showSnap.exists()) {
              currentShowName = showSnap.data()?.name || `Show (${showId})`;
            } else {
              console.warn('Show with id ${showId} not found on mobile.');
            }
          }
        } catch (e: any) {
            console.error("Error fetching show name:", e);
        }
        setShowName(currentShowName);

        // TODO: Implement getPropsByShowId for this platform or use a platform-specific import
        // const propsDocs = await service.getPropsByShowId(showId);
        const propsDocs: FirebaseDocument<Prop>[] = [];
        const propsData = propsDocs.map((doc: FirebaseDocument<Prop>) => ({
          ...(doc.data as Prop),
          id: doc.id,
        }));
        setProps(propsData);

      } catch (err: any) {
        console.error("Error fetching props by show ID:", err);
        setError(err.message || 'Failed to fetch props.');
      } finally {
        setLoading(false);
      }
    };

    fetchPropsAndShowDetails();
  }, [showId, service, isInitialized]);

  if (loading && !isInitialized && !firebaseError) {
    return <View style={styles.loadingContainer}><Text>Initializing Firebase...</Text></View>;
  }
  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" /></View>;
  }

  if (firebaseError) {
    return <View style={styles.container}><Text style={styles.errorText}>Error initializing Firebase: {firebaseError.message}</Text></View>;
  }

  if (error) {
    return <View style={styles.container}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{showName || 'Props for Show'}</Text>
      {props.length === 0 ? (
        <Text style={styles.emptyText}>No props found for this show.</Text>
      ) : (
        <FlatList
          data={props}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropCard
              prop={item}
            />
          )}
        />
      )}
      <Link href="/(tabs)/shows" style={styles.backLink}>Back to Shows</Link>
    </View>
  );
} 