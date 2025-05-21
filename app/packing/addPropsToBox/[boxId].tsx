import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePacking } from '../../../src/hooks/usePacking';
import { useProps } from '../../../src/contexts/PropsContext';
import { Prop } from '../../../src/shared/types/props';
import { PackingBox, PackedProp } from '../../../src/types/packing';

// Consistent dark theme colors
const darkThemeColors = {
  background: '#111827',
  cardBg: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  inputBg: '#374151',
  inputBorder: '#4B5563',
  primary: '#3B82F6',
  error: '#EF4444',
  selectedItemBg: '#374151', // For selected items
};

interface SelectableProp extends Prop {
  isSelected?: boolean;
  // quantityToPack?: number; // Future: for specifying quantity
}

export default function AddPropsToBoxScreen() {
  const router = useRouter();
  const { boxId, showId } = useLocalSearchParams<{ boxId: string; showId: string }>();

  const { operations: packingOps, getDocument, loading: packingCtxLoading, error: packingCtxError } = usePacking(showId);
  const { props: allShowProps, loading: propsCtxLoading, error: propsCtxError } = useProps();

  const [currentBox, setCurrentBox] = useState<PackingBox | null>(null);
  const [selectableProps, setSelectableProps] = useState<SelectableProp[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!boxId || !showId || !getDocument) {
        Alert.alert('Error', 'Missing critical data (boxId, showId, or getDocument).');
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);
      try {
        const boxDoc = await getDocument(boxId);
        if (boxDoc && boxDoc.data) {
          setCurrentBox(boxDoc.data as PackingBox);
        } else {
          throw new Error('Box not found.');
        }
      } catch (err) {
        Alert.alert('Error', `Failed to load box data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        if(router.canGoBack()) router.back();
      } finally {
        setInitialLoading(false); 
      }
    };
    loadInitialData();
  }, [boxId, showId, getDocument]);

  useEffect(() => {
    if (propsCtxLoading || initialLoading) return; // Wait for both props and box to load

    const existingPropIdsInBox = new Set(currentBox?.props.map(p => p.propId) || []);
    
    const availableProps = allShowProps
      .filter(p => !existingPropIdsInBox.has(p.id)) // Filter out props already in the box
      .map(p => ({ ...p, isSelected: false }));
    setSelectableProps(availableProps);

  }, [allShowProps, propsCtxLoading, currentBox, initialLoading]);

  const handleToggleSelectProp = (propId: string) => {
    setSelectableProps(prevProps =>
      prevProps.map(p =>
        p.id === propId ? { ...p, isSelected: !p.isSelected } : p
      )
    );
  };

  const handleAddSelectedProps = async () => {
    if (!currentBox || !boxId || !packingOps.updateBox) {
      Alert.alert('Error', 'Box data or update operation not available.');
      return;
    }

    const selectedToAdd = selectableProps.filter(p => p.isSelected);
    if (selectedToAdd.length === 0) {
      Alert.alert('No Props Selected', 'Please select at least one prop to add.');
      return;
    }

    setIsSaving(true);
    try {
      const newPackedProps: PackedProp[] = selectedToAdd.map(p => ({
        propId: p.id,
        name: p.name,
        quantity: 1, // Default to 1 for now
        weight: p.weight || 0,
        weightUnit: p.weightUnit || 'kg',
        isFragile: p.isBreakable || false, // Assuming isBreakable maps to isFragile
      }));

      const updatedPropsList = [...currentBox.props, ...newPackedProps];
      await packingOps.updateBox(boxId, { props: updatedPropsList });

      Alert.alert('Success', 'Selected props added to the box!');
      if (router.canGoBack()) {
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', `Failed to add props: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPropItem = ({ item }: { item: SelectableProp }) => (
    <TouchableOpacity
      style={[styles.itemContainer, item.isSelected && styles.itemSelected]}
      onPress={() => handleToggleSelectProp(item.id)}
    >
      <Text style={styles.itemText}>{item.name}</Text>
      <Ionicons 
        name={item.isSelected ? 'checkbox-outline' : 'square-outline'} 
        size={24} 
        color={item.isSelected ? darkThemeColors.primary : darkThemeColors.textSecondary} 
      />
    </TouchableOpacity>
  );

  if (initialLoading || propsCtxLoading || packingCtxLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkThemeColors.primary} />
        <Text style={{color: darkThemeColors.textSecondary, marginTop: 10}}>Loading data...</Text>
      </View>
    );
  }

  if (propsCtxError || packingCtxError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Error: {propsCtxError?.message || packingCtxError?.message}
        </Text>
      </View>
    );
  }
  
  if (selectableProps.length === 0 && !propsCtxLoading && !initialLoading) {
     return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Add Props to Box' }} />
        <Text style={styles.infoText}>All available props for this show are already in this box, or no props found for this show.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.canGoBack() && router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Add Props to Box' }} />
      <FlatList
        data={selectableProps}
        renderItem={renderPropItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={() => <Text style={styles.headerText}>Select props to add:</Text>}
      />
      <TouchableOpacity 
        style={[styles.button, isSaving && styles.buttonDisabled]} 
        onPress={handleAddSelectedProps}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={darkThemeColors.textPrimary} />
        ) : (
          <Text style={styles.buttonText}>Add Selected Props</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkThemeColors.background,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.background,
  },
  headerText: {
    fontSize: 18,
    color: darkThemeColors.textPrimary,
    padding: 10,
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: darkThemeColors.inputBorder,
    backgroundColor: darkThemeColors.cardBg,
    marginBottom: 5,
    borderRadius: 5,
  },
  itemSelected: {
    backgroundColor: darkThemeColors.selectedItemBg,
    borderColor: darkThemeColors.primary,
    borderWidth: 1,
  },
  itemText: {
    color: darkThemeColors.textPrimary,
    fontSize: 16,
  },
  button: {
    backgroundColor: darkThemeColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 10,
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
   infoText: {
    color: darkThemeColors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
}); 