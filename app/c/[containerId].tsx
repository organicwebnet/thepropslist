/**
 * Public Container Viewer
 * Allows viewing container details via public link (e.g., QR code)
 * No authentication required
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFirebase } from '../../src/platforms/mobile/contexts/FirebaseContext';
import { APP_URL } from '../../src/shared/constants/app';
import { AppGradient } from '../../src/components/AppGradient';

interface PackedProp {
  name: string;
  quantity?: number;
  id?: string;
  category?: string;
}

interface ContainerDoc {
  id: string;
  name?: string;
  description?: string;
  props?: PackedProp[];
  status?: string;
}

export default function PublicContainerPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ containerId: string }>();
  const containerId = params.containerId;
  const { service: firebaseService, isInitialized } = useFirebase();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<ContainerDoc | null>(null);

  useEffect(() => {
    if (!containerId || !isInitialized || !firebaseService) return;

    const fetchBox = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to fetch container from Firestore
        // Note: This requires Firestore security rules to allow public read access
        const containerDoc = await firebaseService.getDocument<ContainerDoc>(
          'packingBoxes',
          containerId
        );
        
        if (containerDoc && containerDoc.data) {
          setBox({ ...containerDoc.data, id: containerId });
        } else {
          // Fallback: Try Cloud Function if available
          try {
            const response = await fetch(
              `${APP_URL}/api/public/container?id=${encodeURIComponent(containerId)}`
            );
            if (response.ok) {
              const data = await response.json();
              setBox({ id: containerId, ...data });
            } else {
              throw new Error('Container not found');
            }
          } catch (apiError) {
            setError('Container not found');
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load container';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, isInitialized]);

  if (loading) {
    return (
      <AppGradient>
        <Stack.Screen
          options={{
            title: 'Container',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading container...</Text>
        </View>
      </AppGradient>
    );
  }

  if (error || !box) {
    return (
      <AppGradient>
        <Stack.Screen
          options={{
            title: 'Container',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#fff',
          }}
        />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={64} color="#fff" />
          <Text style={styles.errorTitle}>Container Not Found</Text>
          <Text style={styles.errorText}>
            {error || 'The requested container could not be found.'}
          </Text>
          <Text style={styles.errorSubtext}>
            This link may have expired or the container may have been removed.
          </Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <Stack.Screen
        options={{
          title: box.name || 'Container',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>{box.name || 'Container'}</Text>
          {box.description && (
            <Text style={styles.description}>{box.description}</Text>
          )}
          
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>GUID:</Text>
              <Text style={styles.metaValue}>{box.id}</Text>
            </View>
            {box.status && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Status:</Text>
                <Text style={styles.metaValue}>{box.status}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contents</Text>
            {Array.isArray(box.props) && box.props.length > 0 ? (
              <View style={styles.propsList}>
                {box.props.map((p, idx) => (
                  <View key={p.id || `${p.name}-${idx}`} style={styles.propItem}>
                    <Text style={styles.propName}>{p.name}</Text>
                    <Text style={styles.propMeta}>
                      Qty: {p.quantity || 1}
                      {p.category ? ` • ${p.category}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No items listed.</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    lineHeight: 24,
  },
  metaContainer: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: 8,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  propsList: {
    gap: 12,
  },
  propItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  propName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  propMeta: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

