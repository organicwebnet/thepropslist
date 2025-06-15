import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFirebase } from '../../../../src/contexts/FirebaseContext';
import { Prop } from '../../../../src/shared/types/props';

const darkBg = '#18181b';
const accent = '#c084fc';

const PropEditScreen = () => {
  const { id } = useLocalSearchParams();
  const { service } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', quantity: '1', status: '' });

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
          setForm({
            name: doc.data.name || '',
            description: doc.data.description || '',
            quantity: String(doc.data.quantity ?? 1),
            status: doc.data.status || '',
          });
          setError(null);
        } else {
          setProp(null);
        }
        setLoading(false);
      },
      (err) => {
        setError('Failed to load prop.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [id, service]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id || typeof id !== 'string') return;
    setSaving(true);
    try {
      await service.updateDocument('props', id, {
        name: form.name,
        description: form.description,
        quantity: Number(form.quantity),
        status: form.status,
      });
      Alert.alert('Success', 'Prop updated successfully.');
      router.replace(`/props/${id}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update prop.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Loading prop...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (!prop) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Prop not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Prop</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(v) => handleChange('name', v)}
        placeholder="Prop name"
        placeholderTextColor="#888"
      />
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.description}
        onChangeText={(v) => handleChange('description', v)}
        placeholder="Description"
        placeholderTextColor="#888"
        multiline
        numberOfLines={3}
      />
      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        value={form.quantity}
        onChangeText={(v) => handleChange('quantity', v.replace(/[^0-9]/g, ''))}
        placeholder="Quantity"
        placeholderTextColor="#888"
        keyboardType="numeric"
      />
      <Text style={styles.label}>Status</Text>
      <TextInput
        style={styles.input}
        value={form.status}
        onChangeText={(v) => handleChange('status', v)}
        placeholder="Status"
        placeholderTextColor="#888"
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkBg, padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkBg },
  loadingText: { color: '#a3a3a3', marginTop: 16 },
  errorText: { color: '#dc2626', marginTop: 16, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24, textAlign: 'center' },
  label: { color: '#a3a3a3', fontSize: 14, marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: accent, paddingVertical: 16, borderRadius: 8, marginTop: 32, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});

export default PropEditScreen; 