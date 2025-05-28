import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { usePacking } from '../../../src/hooks/usePacking.ts'; // Adjusted path
import { PackingBox } from '../../../src/types/packing.ts'; // Adjusted path

// Consistent dark theme colors (same as createBox.tsx)
const darkThemeColors = {
  background: '#111827', 
  cardBg: '#1F2937',      
  textPrimary: '#F9FAFB',  
  textSecondary: '#9CA3AF',
  inputBg: '#374151',     
  inputBorder: '#4B5563', 
  primary: '#3B82F6',     
  error: '#EF4444',       
};

export default function EditBoxScreen() {
  const router = useRouter();
  // Get boxId from route, renamed from 'id' for clarity if CreateBox also uses 'id' for something else
  const { id: boxId, showId } = useLocalSearchParams<{ id?: string; showId?: string }>(); 

  const { operations, getDocument, loading: packingContextLoading, error: packingContextError } = usePacking(showId);
  const { updateBox } = operations;

  const [boxName, setBoxName] = useState('');
  const [description, setDescription] = useState('');
  const [actNumber, setActNumber] = useState('');
  const [sceneNumber, setSceneNumber] = useState('');
  
  const [isLoadingData, setIsLoadingData] = useState(true); // For initial data fetch
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!boxId || !showId) {
      setFetchError('Box ID or Show ID is missing.');
      setIsLoadingData(false);
      return;
    }
    if (!getDocument) {
      setFetchError('Update function (getDocument) not available from usePacking.');
      setIsLoadingData(false);
      return;
    }

    const fetchBoxData = async () => {
      setIsLoadingData(true);
      setFetchError(null);
      try {
        const existingBoxDoc = await getDocument(boxId);
        if (existingBoxDoc && existingBoxDoc.data) {
          const data = existingBoxDoc.data as PackingBox;
          setBoxName(data.name || '');
          setDescription(data.description || '');
          setActNumber(data.actNumber?.toString() || '');
          setSceneNumber(data.sceneNumber?.toString() || '');
        } else {
          setFetchError('Box not found.');
        }
      } catch (err) {
        console.error('Error fetching box data for edit:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to fetch box data.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBoxData();
  }, [boxId, showId, getDocument]);

  const handleSaveChanges = async () => {
    if (!boxName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for the box.');
      return;
    }
    if (!boxId) {
        Alert.alert('Error', 'Box ID is missing. Cannot save changes.');
        return;
    }
    if (!updateBox) {
        Alert.alert('Error', 'Update function not available. Cannot save changes.');
        return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<PackingBox> = {
        name: boxName.trim(),
        description: description.trim(),
        actNumber: actNumber ? parseInt(actNumber, 10) : undefined,
        sceneNumber: sceneNumber ? parseInt(sceneNumber, 10) : undefined,
      };
      await updateBox(boxId, updates);
      Alert.alert('Success', 'Box details updated successfully!');
      if (router.canGoBack()) {
        router.back();
      }
    } catch (err) {
      console.error('Error saving box changes:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!showId || !boxId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={styles.errorText}>{fetchError || 'Box ID or Show ID missing.'}</Text>
      </View>
    );
  }

  if (packingContextLoading || isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkThemeColors.primary} />
        <Text style={{color: darkThemeColors.textSecondary, marginTop: 10}}>
          {isLoadingData ? 'Loading box details...' : 'Initializing...'}
        </Text>
      </View>
    );
  }

  if (packingContextError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={styles.errorText}>Error initializing packing context: {packingContextError.message}</Text>
      </View>
    );
  }
  if (fetchError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={styles.errorText}>Error: {fetchError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Stack.Screen options={{ title: `Edit Box: ${boxName || 'Loading...'}` }} />
      
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
        onPress={handleSaveChanges}
        disabled={isSaving || isLoadingData}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={darkThemeColors.textPrimary} />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// Styles are identical to CreateBoxScreen, can be refactored into a shared file later
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
    marginRight: 5, 
  },
  button: {
    backgroundColor: darkThemeColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    backgroundColor: '#555',
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