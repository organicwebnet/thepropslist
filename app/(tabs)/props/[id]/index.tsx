import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFirebase } from '../../../../src/contexts/FirebaseContext';
import { Prop } from '../../../../src/shared/types/props';
import { MaterialIcons } from '@expo/vector-icons';

const darkBg = '#18181b';
const accent = '#c084fc';

const PropDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const { service } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setError('Invalid prop ID.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = service.listenToDocument<Prop>(
      `props/${id}`,
      (doc) => {
        if (doc && doc.data) {
          setProp({ ...doc.data, id: doc.id });
          setError(null);
        } else {
          setProp(null);
        }
        setLoading(false);
      },
      (err) => {
        setError('Failed to load prop details.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [id, service]);

  const handleEdit = () => {
    router.push(`/props/${id}/edit`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Prop',
      'Are you sure you want to delete this prop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await service.deleteDocument('props', id as string);
              router.replace('/props');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete prop.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Loading prop details...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (!prop) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="inventory" size={48} color="#94a3b8" />
        <Text style={styles.errorText}>Prop not found.</Text>
      </View>
    );
  }

  const mainImage = prop.images?.find(img => img.isMain)?.url || prop.imageUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderImage}>
          <MaterialIcons name="image" size={64} color="#444" />
        </View>
      )}
      <Text style={styles.title}>{prop.name}</Text>
      <Text style={styles.category}>{prop.category}</Text>
      <Text style={styles.label}>Description</Text>
      <Text style={styles.value}>{prop.description || 'No description.'}</Text>
      <Text style={styles.label}>Quantity</Text>
      <Text style={styles.value}>{prop.quantity ?? 1}</Text>
      <Text style={styles.label}>Status</Text>
      <Text style={styles.value}>{prop.status || 'Unknown'}</Text>
      {prop.location && (
        <>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{prop.location}</Text>
        </>
      )}
      <View style={{ flexDirection: 'row', marginTop: 32, gap: 16 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#c084fc', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 }}
          onPress={handleEdit}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 }}
          onPress={handleDelete}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkBg },
  scrollContent: { alignItems: 'center', padding: 24, paddingBottom: 64 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkBg },
  loadingText: { color: '#a3a3a3', marginTop: 16 },
  errorText: { color: '#dc2626', marginTop: 16, textAlign: 'center' },
  image: { width: 180, height: 180, borderRadius: 16, marginBottom: 24, backgroundColor: '#222' },
  placeholderImage: { width: 180, height: 180, borderRadius: 16, marginBottom: 24, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  category: { fontSize: 16, color: accent, marginBottom: 16, textAlign: 'center' },
  label: { color: '#a3a3a3', fontSize: 14, marginTop: 16, marginBottom: 4, alignSelf: 'flex-start' },
  value: { color: '#fff', fontSize: 16, alignSelf: 'flex-start' },
});

export default PropDetailsScreen; 