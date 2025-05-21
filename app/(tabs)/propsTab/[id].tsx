import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useProps } from '@/contexts/PropsContext';
import type { Prop } from '@/shared/types/props';
import { lifecycleStatusLabels } from '@/types/lifecycle';

export default function NativePropDetailScreen() {
  const { id: propId } = useLocalSearchParams<{ id: string }>();
  const { props, loading: propsLoading } = useProps();

  const prop = props.find(p => p.id === propId);

  if (propsLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!prop) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Prop Not Found' }} />
        <Text style={styles.errorText}>Prop not found.</Text>
      </View>
    );
  }

  // Helper to format dimensions safely
  const formatDimensions = (p: Prop) => {
    const { length, width, height, depth, unit } = p;
    const parts = [length, width, height, depth].filter(d => d != null && d > 0);
    if (parts.length === 0) return null;
    return `${parts.join(' x ')} ${unit || ''}`.trim();
  };

  const dimensionsText = formatDimensions(prop);
  const statusLabel = prop.status ? (lifecycleStatusLabels[prop.status] || prop.status) : 'Unknown';
  const imageUrl = prop.primaryImageUrl || prop.imageUrl;

  // Helper to format dates (Example)
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    try {
      // Assuming dateString is a string representation of a date
      const date = new Date(dateString);
      // Check if the date is valid after parsing
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string provided to formatDate:", dateString);
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (e) {
      console.warn("Error formatting date:", dateString, e);
      return 'Invalid Date'; // Or handle error as appropriate
    }
  };

  // Simple component to display boolean flags
  const FlagDisplay = ({ label, value }: { label: string; value?: boolean }) => {
    if (value === undefined) return null;
    return <Text style={styles.detailItem}>{label}: {value ? 'Yes' : 'No'}</Text>;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: prop.name || 'Prop Details' }} />
      
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No Image</Text>
        </View>
      )}

      <Text style={styles.title}>{prop.name}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.text}>{prop.description || 'No description provided.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        {prop.category && <Text style={styles.detailItem}>Category: {prop.category}</Text>}
        {prop.act && prop.scene && <Text style={styles.detailItem}>Act {prop.act}, Scene {prop.scene}</Text>}
        {statusLabel && <Text style={styles.detailItem}>Status: {statusLabel}</Text>}
        {prop.source && <Text style={styles.detailItem}>Source: {prop.source}</Text>}
        {prop.sourceDetails && <Text style={styles.detailItem}>Source Details: {prop.sourceDetails}</Text>}
        {prop.purchaseUrl && <Text style={styles.detailItem}>Purchase URL: {prop.purchaseUrl}</Text>}
        {dimensionsText && <Text style={styles.detailItem}>Dimensions: {dimensionsText}</Text>}
        {prop.weight && <Text style={styles.detailItem}>Weight: {prop.weight}{prop.weightUnit || ''}</Text>}
        {prop.quantity != null && <Text style={styles.detailItem}>Quantity: {prop.quantity}</Text>}
        {prop.materials && <Text style={styles.detailItem}>Materials: {Array.isArray(prop.materials) ? prop.materials.join(', ') : prop.materials}</Text>}
        {prop.period && <Text style={styles.detailItem}>Period: {prop.period}</Text>}
        {prop.condition && <Text style={styles.detailItem}>Condition: {prop.condition}</Text>}
        {prop.location && <Text style={styles.detailItem}>Current Location: {prop.location}</Text>}
        {prop.availabilityStatus && <Text style={styles.detailItem}>Availability: {prop.availabilityStatus}</Text>}
        {prop.price != null && <Text style={styles.detailItem}>Price: ${prop.price.toFixed(2)}</Text>}
        {prop.purchaseDate && <Text style={styles.detailItem}>Purchase Date: {formatDate(prop.purchaseDate)}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes & Instructions</Text>
        {prop.usageInstructions && <Text style={styles.detailItem}>Usage Instructions: {prop.usageInstructions}</Text>}
        {prop.maintenanceNotes && <Text style={styles.detailItem}>Maintenance Notes: {prop.maintenanceNotes}</Text>}
        {prop.safetyNotes && <Text style={styles.detailItem}>Safety Notes: {prop.safetyNotes}</Text>}
        {prop.handlingInstructions && <Text style={styles.detailItem}>Handling Instructions: {prop.handlingInstructions}</Text>}
        {prop.statusNotes && <Text style={styles.detailItem}>Status Notes: {prop.statusNotes}</Text>}
        {prop.notes && <Text style={styles.detailItem}>General Notes: {prop.notes}</Text>}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Flags</Text>
        <FlagDisplay label="Consumable" value={prop.isConsumable} />
        <FlagDisplay label="Multi-Scene" value={prop.isMultiScene} />
        <FlagDisplay label="Requires Pre-Show Setup" value={prop.requiresPreShowSetup} />
        <FlagDisplay label="Breakable" value={prop.isBreakable} />
        <FlagDisplay label="Hazardous" value={prop.isHazardous} />
      </View>

      {prop.publicNotes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Notes</Text>
          <Text style={styles.text}>{prop.publicNotes}</Text>
        </View>
      )}

      {/* Add more sections for other details as needed, e.g., private notes, maintenance, etc. */}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // gray-900
  },
  contentContainer: {
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#374151', // gray-700 for placeholder bg
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#374151', // gray-700
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePlaceholderText: {
    color: '#9CA3AF', // gray-400
    fontSize: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB', // gray-50
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E5E7EB', // gray-200
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#D1D5DB', // gray-300
    lineHeight: 24,
  },
  detailItem: {
    fontSize: 16,
    color: '#D1D5DB', // gray-300
    marginBottom: 4,
  },
  errorText: {
    color: '#F87171', // red-400
    fontSize: 18,
  },
}); 