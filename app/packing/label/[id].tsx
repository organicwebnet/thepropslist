import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePacking } from '../../../src/hooks/usePacking';
import { PackingBox } from '../../../src/types/packing';

// QR Code placeholder component (replace with actual library later)
const QRCodePlaceholder = ({ value }: { value: string }) => (
  <View style={styles.qrPlaceholder}>
    <Text style={styles.qrText}>QR CODE</Text>
    <Text style={styles.qrValueText}>[{value}]</Text>
  </View>
);

export default function LabelPreviewPage() {
  const router = useRouter();
  const { id: boxId } = useLocalSearchParams<{ id: string }>();
  const [deliveryNote, setDeliveryNote] = useState('');
  const [handlingNote, setHandlingNote] = useState('');

  // TODO: Get showId from context or route params if needed for usePacking
  const showId = 'TODO-GET-SHOW-ID'; // Replace with actual showId logic
  const { boxes, loading, error } = usePacking(showId);
  const [box, setBox] = useState<PackingBox | null>(null);

  useEffect(() => {
    if (boxId && boxes.length > 0) {
      const foundBox = boxes.find(b => b.id === boxId);
      setBox(foundBox || null);
    }
  }, [boxId, boxes]);

  const handlePrint = () => {
    const fragileWarning = box?.props?.some(p => p.isFragile) ? '\n* Handle with care! *' : '';
    Alert.alert(
      'Print Confirmation',
      `Ready to print label for: ${box?.name}\n\nDelivery Note: ${deliveryNote || 'N/A'}\nHandling Note: ${handlingNote || 'N/A'}${fragileWarning}\n\n(Actual printing not implemented)`
    );
    // TODO: Implement actual printing logic using expo-print or similar
  };

  if (loading || (!box && !error)) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>Error loading packing data: {error.message}</Text></View>;
  }

  if (!box) {
    return <View style={styles.centered}><Text style={styles.errorText}>Box not found.</Text></View>;
  }

  const hasFragileItems = box.props?.some(p => p.isFragile);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Label Preview: {box.name}</Text>

      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>QR Code</Text>
        <QRCodePlaceholder value={`Box ID: ${box.id}`} />
      </View>

      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Handling Info</Text>
        {hasFragileItems && (
          <Text style={styles.handlingTextWarning}>* Handle with care! *</Text>
        )}
        <Text style={styles.label}>Optional Handling/Warning Note:</Text>
        <TextInput
          style={styles.input}
          value={handlingNote}
          onChangeText={setHandlingNote}
          placeholder="e.g., This way up, Keep dry"
          placeholderTextColor="#888"
          multiline
        />
      </View>

      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Delivery</Text>
        <Text style={styles.label}>Delivery Note:</Text>
        <TextInput
          style={styles.input}
          value={deliveryNote}
          onChangeText={setDeliveryNote}
          placeholder="e.g., Deliver to Stage Left door"
          placeholderTextColor="#888"
          multiline
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={() => router.back()} color="#888" />
        <Button title="Print Label" onPress={handlePrint} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111', // Dark background
  },
  contentContainer: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 20,
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#333',
    color: '#eee',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#444',
  },
  qrPlaceholder: {
    backgroundColor: '#333', // Dark grey background
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    alignSelf: 'center',
    minWidth: 150,
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qrText: {
    color: '#eee', // Light text color
    fontWeight: 'bold',
    marginBottom: 5,
  },
  qrValueText: {
    color: '#aaa', // Lighter grey for value
    fontSize: 10,
    textAlign: 'center',
  },
  handlingTextWarning: {
    color: '#facc15', // Yellow color for warning
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#f87171', // Red color for errors
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
}); 