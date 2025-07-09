import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '../../platforms/mobile/contexts/FirebaseContext.tsx';
import type { Prop } from '../shared/types/props.ts';
import type { PropLifecycleStatus } from '../types/lifecycle.ts';
import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../styles/globalStyles';
// import { getProp } from '../services/propService'; // Commented out: Cannot find module

export default function PropDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { service } = useFirebase();
  const router = useRouter();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Placeholder for missing service call
  const getProp = async (id: string): Promise<Prop | null> => {
    console.warn('getProp service function is missing, returning null.');
    return null; 
  };

  useEffect(() => {
    const fetchProp = async () => {
      // Use service
      if (!service?.getFirestoreJsInstance || !id) {
          setLoading(false);
          setError('Service not available or ID missing.');
          return;
      }
      const firestore = service.getFirestoreJsInstance();

      try {
        // Use firestore instance from service
        const propDoc = await getDoc(doc(firestore, 'props', id as string));
        if (propDoc.exists()) {
          const fetchedData = propDoc.data();
          const propData: Partial<Prop> = {
            id: propDoc.id,
            userId: fetchedData.userId,
            showId: fetchedData.showId,
            name: fetchedData.name,
            description: fetchedData.description,
            category: fetchedData.category,
            price: fetchedData.price,
            quantity: fetchedData.quantity,
            location: fetchedData.location,
            status: fetchedData.status,
            condition: fetchedData.condition,
            tags: fetchedData.tags,
            images: fetchedData.images,
            lastUpdated: fetchedData.lastUpdated, // Keep as is, assuming string
            // Add other fields needed from Prop type
            createdAt: fetchedData.createdAt, 
            updatedAt: fetchedData.updatedAt,
            source: fetchedData.source,
            // ... etc
          };
          setProp(propData as Prop);
        } else {
          setError('Prop not found.');
        }
      } catch (error) {
        console.error('Error fetching prop:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProp();
  }, [id, service]);

  if (loading) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={globalStyles.flex1}
      >
        <View style={styles.container}>
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        </View>
      </LinearGradient>
    );
  }

  if (!prop) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={globalStyles.flex1}
      >
        <View style={styles.container}>
          <Text style={[styles.errorText, { color: isDark ? '#fff' : '#000' }]}>
            Prop not found
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={globalStyles.flex1}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Text style={[styles.name, { color: isDark ? '#fff' : '#000' }]}>
              {prop.name}
            </Text>
            <Text
              style={[
                styles.status,
                { backgroundColor: getStatusColor(prop.status) },
              ]}
            >
              {prop.status}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
              Description
            </Text>
            <Text style={[styles.description, { color: isDark ? '#aaa' : '#666' }]}>
              {prop.description}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
              Details
            </Text>
            <View style={styles.detailsGrid}>
              <DetailItem
                label="Category"
                value={prop.category}
                isDark={isDark}
              />
              <DetailItem
                label="Location"
                value={prop.location}
                isDark={isDark}
              />
              <DetailItem
                label="Condition"
                value={prop.condition ?? 'N/A'}
                isDark={isDark}
              />
              <DetailItem
                label="Last Updated"
                value={prop.lastUpdated ? new Date(prop.lastUpdated).toLocaleDateString() : 'N/A'}
                isDark={isDark}
              />
            </View>
          </View>

          {prop.notes && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                Notes
              </Text>
              <Text style={[styles.notes, { color: isDark ? '#aaa' : '#666' }]}>
                {prop.notes}
              </Text>
            </View>
          )}

          {(prop.tags?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
                Tags
              </Text>
              <View style={styles.tags}>
                {prop.tags?.map((tag: string, index: number) => (
                  <Text
                    key={index}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: isDark ? '#333' : '#eee',
                        color: isDark ? '#fff' : '#000',
                      },
                    ]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

function DetailItem({ label, value, isDark }: { label: string; value: string | undefined | null; isDark: boolean }) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: isDark ? '#aaa' : '#666' }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: isDark ? '#fff' : '#000' }]}>
        {value ?? 'N/A'}
      </Text>
    </View>
  );
}

function getStatusColor(status: PropLifecycleStatus | undefined): string {
  if (!status) return '#718096'; // gray-500

  // Use string values for comparison, casting status to string
  switch (status as string) { // Explicit cast to string
    case 'available':
      return '#48bb78'; // green-500
    case 'in-use':
      return '#4299e1'; // blue-500
    case 'maintenance':
    case 'repair-needed':
      return '#ecc94b'; // yellow-500
    case 'lost/damaged': // Check actual value in type
      return '#f56565'; // red-500
    case 'storage':
       return '#a0aec0'; // gray-400
    case 'retired':
       return '#718096'; // gray-500 
    default:
      // Handle any potential new statuses gracefully
      console.warn(`Unknown status encountered in getStatusColor: ${status}`);
      return '#a0aec0'; // Default gray-400
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    color: '#fff',
    textTransform: 'capitalize',
    backgroundColor: 'rgba(30,30,30,0.7)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  notes: {
    fontSize: 16,
    lineHeight: 24,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
  },
}); 