import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePacking } from '../../src/hooks/usePacking';

// Consistent dark theme colors
const darkThemeColors = {
  background: '#111827', // gray-900
  cardBg: '#1F2937',      // gray-800
  textPrimary: '#F9FAFB',  // gray-50
  textSecondary: '#9CA3AF',// gray-400
  inputBg: '#374151',     // gray-700
  inputBorder: '#4B5563', // gray-600
  primary: '#3B82F6',     // blue-500
  error: '#EF4444',       // red-500
};

export default function CreateBoxScreen() {
  const router = useRouter();
  const { showId } = useLocalSearchParams<{ showId?: string }>();

  const { operations, loading: packingLoading, error: packingError } = usePacking(showId);
  const { createBox } = operations;

  const [boxName, setBoxName] = useState('');
  const [description, setDescription] = useState('');
  const [actNumber, setActNumber] = useState('');
  const [sceneNumber, setSceneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBox = async () => {
    if (!boxName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for the box.');
      return;
    }
    if (!showId) {
      Alert.alert('Error', 'Show ID is missing. Cannot create box.');
      return;
    }

    setIsSaving(true);
    try {
      // For now, we create an empty box in terms of props.
      // Props can be added later via an edit screen for the box.
      const newBoxId = await createBox(
        [], // Empty PackedProp[] for now
        boxName.trim(),
        actNumber ? parseInt(actNumber, 10) : undefined,
        sceneNumber ? parseInt(sceneNumber, 10) : undefined
      );

      if (newBoxId) {
        Alert.alert('Success', 'Packing box created successfully!');
        // Navigate back to the packing list, which should refresh
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/packing');
        }
      } else {
        Alert.alert('Error', 'Failed to create box. No ID returned.');
      }
    } catch (err) {
      console.error('Error saving box:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'An unknown error occurred while saving the box.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!showId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={styles.errorText}>Show ID is missing. Cannot create a box.</Text>
      </View>
    );
  }
  
  if (packingLoading && !isSaving) { // Show packing hook loading only if not currently saving form
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={darkThemeColors.primary} />
        </View>
    );
  }

  if (packingError) {
      return (
          <View style={styles.container}>
              <Stack.Screen options={{ title: 'Error' }} />
              <Text style={styles.errorText}>Error loading packing context: {packingError.message}</Text>
          </View>
      );
  }


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Stack.Screen options={{ title: 'Create New Packing Box' }} />
      
      <Text style={styles.label}>Box Name*</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Act 1 Props, Backstage Right"
        value={boxName}
        onChangeText={setBoxName}
        placeholderTextColor={darkThemeColors.textSecondary}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Optional: Details about the box contents or purpose"
        value={description}
        onChangeText={setDescription}
        placeholderTextColor={darkThemeColors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Act Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1"
            value={actNumber}
            onChangeText={setActNumber}
            keyboardType="numeric"
            placeholderTextColor={darkThemeColors.textSecondary}
          />
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Scene Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 3"
            value={sceneNumber}
            onChangeText={setSceneNumber}
            keyboardType="numeric"
            placeholderTextColor={darkThemeColors.textSecondary}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.button, isSaving && styles.buttonDisabled]} 
        onPress={handleSaveBox}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={darkThemeColors.textPrimary} />
        ) : (
          <Text style={styles.buttonText}>Create Box</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkThemeColors.background,
  },
  scrollContentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.background,
  },
  label: {
    fontSize: 16,
    color: darkThemeColors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: darkThemeColors.inputBg,
    color: darkThemeColors.textPrimary,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: darkThemeColors.inputBorder,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginRight: 5, // Or some spacing
  },
  button: {
    backgroundColor: darkThemeColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    backgroundColor: '#555', // A darker/disabled shade for primary
  },
  buttonText: {
    color: darkThemeColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: darkThemeColors.error,
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
}); 