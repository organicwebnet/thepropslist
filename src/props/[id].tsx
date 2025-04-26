import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Prop } from '@shared/types';
import type { PropLifecycleStatus } from '../types/lifecycle';
// import { getProp } from '../services/propService'; // Commented out: Cannot find module
import { PropForm } from '../components/PropForm';

export default function PropDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      try {
        const propDoc = await getDoc(doc(db, 'props', id as string));
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
            lastUpdated: fetchedData.lastUpdated?.toDate ? fetchedData.lastUpdated.toDate() : undefined,
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

    // Placeholder call
    fetchProp();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
      </View>
    );
  }

  if (!prop) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}>
        <Text style={[styles.errorText, { color: isDark ? '#fff' : '#000' }]}>
          Prop not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f5f5f5' }]}
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
            value={prop.lastUpdated ? prop.lastUpdated.toLocaleDateString() : 'N/A'}
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
            {prop.tags?.map((tag, index) => (
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
    borderRadius: 12,
    overflow: 'hidden',
    color: '#fff',
    textTransform: 'capitalize',
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