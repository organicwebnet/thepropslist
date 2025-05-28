import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator, Text, View, Button, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, Platform
} from 'react-native';
import { PackingBox, PackedProp } from '../../types/packing.ts'; 
import { Show } from '../../types/index.ts'; 
import { Prop } from '../../shared/types/props.ts'; 
import { PackingBoxCard } from './PackingBoxCard.tsx';
import { PropSelector } from './PropSelector.tsx';
// For icons, we need to use lucide-react-native
import { X, Clock, HandCoins, Package, PackageOpen, AlertTriangle } from 'lucide-react-native'; 
import { Timestamp } from 'firebase/firestore';

export interface PropInstance extends Prop { 
  instanceId: string; 
  isPacked: boolean;
}

interface PackingListProps {
  show: Show;
  boxes: PackingBox[];
  props: Prop[]; 
  isLoading?: boolean;
  onCreateBox: (props: PackedProp[], boxName: string, actNumber?: number, sceneNumber?: number) => void; 
  onUpdateBox: (boxId: string, updates: Partial<PackingBox>) => Promise<void>; 
  onDeleteBox: (boxId: string) => Promise<void>;
}

export function PackingList({
  show,
  boxes, 
  props, 
  isLoading = false,
  onCreateBox,
  onUpdateBox,
  onDeleteBox,
}: PackingListProps) {
  const [currentBoxName, setCurrentBoxName] = useState('');
  const [selectedProps, setSelectedProps] = useState<PropInstance[]>([]); 
  const [propInstances, setPropInstances] = useState<PropInstance[]>([]); 
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);

  useEffect(() => {
    const instances: PropInstance[] = [];
    props.forEach(prop => { 
      const quantity = prop.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        instances.push({
          ...prop, 
          instanceId: `${prop.id}-${i}`,
          isPacked: false
        });
      }
    });
    setPropInstances(instances);
  }, [props]);

  useEffect(() => {
    setPropInstances(prevInstances => {
      const packedPropIds = new Set<string>();
      boxes.forEach(box => {
        box.props?.forEach((packedProp: PackedProp) => {
          for (let i = 0; i < (packedProp.quantity || 1); i++) {
            packedPropIds.add(`${packedProp.propId}-${i}`);
          }
        });
      });
      return prevInstances.map(instance => ({
        ...instance,
        isPacked: packedPropIds.has(instance.instanceId)
      }));
    });
  }, [boxes]);

  const handleAddProp = (propInstance: PropInstance) => {
    if (!selectedProps.some(p => p.instanceId === propInstance.instanceId)) {
      setSelectedProps([...selectedProps, propInstance]);
    }
  };

  const handleRemoveProp = (instanceId: string) => {
    setSelectedProps(selectedProps.filter(p => p.instanceId !== instanceId));
  };

  const handleSaveBox = async () => {
    if (selectedProps.length === 0 || !currentBoxName) return;
    const packedProps: PackedProp[] = selectedProps.map(prop => ({
      propId: prop.id,
      name: prop.name ?? 'Unnamed Prop',
      quantity: 1, 
      weight: prop.weight ?? 0,
      weightUnit: prop.weightUnit ?? 'lb',
      isFragile: isFragile(prop)
    }));

    if (editingBoxId) {
      try {
        await onUpdateBox(editingBoxId, { name: currentBoxName, props: packedProps });
      } catch (error) {
        console.error(`Error updating box ${editingBoxId}:`, error);
        return; 
      }
    } else {
      const firstProp = selectedProps[0];
      try {
        await onCreateBox(packedProps, currentBoxName, firstProp?.act ?? 0, firstProp?.scene ?? 0);
      } catch (error) {
        console.error(`Error creating box ${currentBoxName}:`, error);
        return; 
      }
    }
    setSelectedProps([]);
    setCurrentBoxName('');
    setEditingBoxId(null);
  };

  const totalWeight = selectedProps.reduce((total, prop) => {
    if (typeof prop?.weight !== 'number') return total;
    const weight = prop.weightUnit === 'kg' ? prop.weight : prop.weight * 0.453592;
    return total + weight;
  }, 0);

  const isFragile = (prop: PropInstance) => {
    const fragileKeywords = ['fragile', 'delicate', 'breakable', 'glass'];
    return fragileKeywords.some(keyword => 
      prop.description?.toLowerCase().includes(keyword) ||
      prop.notes?.toLowerCase().includes(keyword) ||
      prop.tags?.includes('fragile')
    );
  };

  const isBoxHeavy = totalWeight > 23;
  const availablePropInstances = propInstances.filter(instance => !instance.isPacked);

  const renderSourceIcon = (prop: PropInstance) => {
    // This will need native styling and lucide-react-native icons
    const iconSize = 16;
    const iconColor = prop?.source === 'rented' ? "#F59E0B" : "#3B82F6"; // yellow-500, blue-500

    if (prop?.source === 'rented') {
      return (
        <View style={styles.sourceIconContainer}> 
          <Clock size={iconSize} color={iconColor} />
        </View>
      );
    } else if (prop?.source === 'borrowed') {
      return (
        <View style={styles.sourceIconContainer}>
          <HandCoins size={iconSize} color={iconColor} />
        </View>
      );
    }
    return null;
  };

  const handleEditBox = (box: PackingBox) => {
    setEditingBoxId(box.id);
    setCurrentBoxName(box.name ?? '');
    const propsToSelect: PropInstance[] = [];
    box.props?.forEach((packedProp: PackedProp) => {
      const matchingInstances = propInstances.filter(inst => inst.id === packedProp.propId);
      for (let i = 0; i < (packedProp.quantity || 1); i++) {
        const instanceId = `${packedProp.propId}-${i}`;
        const instanceToAdd = matchingInstances.find(inst => inst.instanceId === instanceId);
        if (instanceToAdd) {
          if (!propsToSelect.some(p => p.instanceId === instanceId)) {
             propsToSelect.push(instanceToAdd);
          }
        } else {
          console.warn(`Could not find matching instance for packed prop: ${packedProp.propId}, instance ${instanceId}`);
        }
      }
    });
    setSelectedProps(propsToSelect);
  };

  const handleCancelEdit = () => {
    setEditingBoxId(null);
    setCurrentBoxName('');
    setSelectedProps([]);
  };

  // Refactored JSX for Native
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Column 1: Selected Props & Box Creation */}
      <View style={styles.column}>
        <Text style={styles.columnHeader}>{editingBoxId ? 'Edit Box' : 'Create New Box'}</Text>
        <View style={styles.boxCreationForm}>
          <TextInput
            value={currentBoxName}
            onChangeText={setCurrentBoxName}
            placeholder="Enter Box Name"
            placeholderTextColor={darkThemeColors.textSecondary} 
            style={styles.textInput}
            autoCorrect={false}
          />
          
          <Text style={styles.subHeader}>Select Props for this Box:</Text>
          <View style={styles.selectorContainer}>
            <PropSelector 
              props={availablePropInstances} 
              selectedProps={selectedProps}
              onChange={(newSelectedProps: PropInstance[]) => setSelectedProps(newSelectedProps)} 
              // disabled={isLoading} // Optional: disable while loading/saving
            />
          </View>

          <Text style={styles.subHeader}>Currently Selected for Box:</Text>
          <ScrollView 
            style={styles.selectedPropsContainer} 
            nestedScrollEnabled={true}
            // contentContainerStyle={{ paddingBottom: 10 }} // Ensure some padding at the bottom
          >
            {selectedProps.length === 0 && (
              <Text style={styles.emptyStateText}>No props selected yet for this box.</Text>
            )}
            {selectedProps.map((prop) => (
              <View key={prop.instanceId} style={styles.selectedPropItem}>
                <View style={styles.selectedPropInfo}>
                  {prop.images?.[0]?.url ? (
                    <Image source={{ uri: prop.images[0].url }} style={styles.selectedPropImage} />
                  ) : (
                    <View style={styles.selectedPropImagePlaceholder}>
                      <Text style={styles.selectedPropImagePlaceholderText}>{prop.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.selectedPropName} numberOfLines={1}>{prop.name}</Text>
                    {prop.notes && <Text style={styles.selectedPropNotes} numberOfLines={1}>{prop.notes}</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveProp(prop.instanceId)}>
                  <X size={18} color={darkThemeColors.iconDanger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summarySection}>
            <Text style={styles.summaryText}>Total Weight: {totalWeight.toFixed(1)} kg</Text>
            {isBoxHeavy && (
                <View style={styles.heavyBadge}>
                    <AlertTriangle size={14} color={darkThemeColors.iconWarning} /> 
                    <Text style={styles.heavyBadgeText}>Heavy</Text>
                </View>
            )}
          </View>
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              onPress={handleSaveBox}
              disabled={selectedProps.length === 0 || !currentBoxName || isLoading}
              style={[
                styles.button, 
                styles.saveButton, 
                (selectedProps.length === 0 || !currentBoxName || isLoading) && styles.buttonDisabled
              ]}
            >
              {isLoading && editingBoxId === null ? (
                <ActivityIndicator size="small" color={darkThemeColors.textPrimary} />
              ) : (
                <Text style={styles.buttonText}>{editingBoxId ? 'Update Box' : 'Create Box'}</Text>
              )}
            </TouchableOpacity>
            {editingBoxId && (
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={[styles.button, styles.cancelButton]}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Column 2: Existing Boxes */}
      <View style={styles.column}>
        <Text style={styles.columnHeader}>Packed Boxes for {show.name}</Text>
        {boxes.length === 0 && !isLoading && (
           <Text style={styles.emptyStateText}>No boxes packed yet for this show.</Text>
        )}
        {isLoading && boxes.length === 0 && (
            <ActivityIndicator size="large" color={darkThemeColors.primary} style={{ marginTop: 20}} />
        )}
        {boxes.map((box) => (
          <PackingBoxCard 
            key={box.id} 
            box={box} 
            onEdit={() => handleEditBox(box)} 
            onDelete={onDeleteBox}
            // Pass any necessary props for styling if PackingBoxCard isn't aware of theme
          />
        ))}
      </View>
    </ScrollView>
  );
}

// Define colors based on your tailwind config for clarity (can be moved to a central theme/colors file)
const darkThemeColors = {
  bg: '#111827',          // dark-bg
  cardBg: '#1F2937',      // dark-card-bg
  inputBg: '#374151',     // dark-border (or a bit lighter like gray-700 for inputs)
  textPrimary: '#F9FAFB', // dark-text-primary
  textSecondary: '#9CA3AF',// dark-text-secondary
  primary: '#3B82F6',     // dark-primary (blue accent)
  border: '#374151',      // dark-border
  iconDefault: '#9CA3AF', // dark-text-secondary for general icons
  iconDanger: '#F87171',  // Tailwind red-400 for delete icons
  iconWarning: '#FBBF24', // Tailwind amber-400 for warning icons (like heavy badge)
  disabledButtonBg: '#4B5563', // gray-600
  buttonText: '#FFFFFF', // white
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkThemeColors.bg,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 10, // More padding on web
  },
  column: {
    marginBottom: 24,
    padding: Platform.OS === 'web' ? 16 : 8,
    backgroundColor: Platform.OS === 'web' ? darkThemeColors.cardBg : 'transparent', // Card bg for web columns
    borderRadius: Platform.OS === 'web' ? 8 : 0,
  },
  columnHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: darkThemeColors.textPrimary,
    marginBottom: 16,
    borderBottomWidth: Platform.OS === 'web' ? 1 : 0, // Only border on web
    borderBottomColor: darkThemeColors.border,
    paddingBottom: Platform.OS === 'web' ? 8 : 0,
  },
  boxCreationForm: {
    backgroundColor: darkThemeColors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000', // Add some shadow for depth
   
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    backgroundColor: darkThemeColors.inputBg,
    color: darkThemeColors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: darkThemeColors.border, // Subtle border for input
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: darkThemeColors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  selectedPropsContainer: {
    maxHeight: 150, // Limit height to make it scrollable within the form
    marginBottom: 16,
    padding: 8,
    backgroundColor: darkThemeColors.inputBg, // Use a slightly different bg for this scroll area
    borderRadius: 6,
  },
  selectedPropItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: darkThemeColors.cardBg, // Match card background
    borderRadius: 4,
    marginBottom: 6,
  },
  selectedPropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow text to take available space
  },
  selectedPropImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: darkThemeColors.border, // Fallback bg
  },
  selectedPropImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: darkThemeColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPropImagePlaceholderText: {
    color: darkThemeColors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  selectedPropName: {
    color: darkThemeColors.textPrimary,
    fontSize: 15,
    flexShrink: 1, // Allow text to shrink if too long
  },
  selectedPropNotes: {
    color: darkThemeColors.textSecondary,
    fontSize: 12,
    flexShrink: 1,
    marginTop: 2,
  },
  emptyStateText: {
    textAlign: 'center',
    color: darkThemeColors.textSecondary,
    paddingVertical: 12,
    fontSize: 14,
  },
  summarySection: {
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: darkThemeColors.inputBg,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    color: darkThemeColors.textPrimary,
    fontSize: 15,
  },
  heavyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkThemeColors.cardBg, // Use card bg for badge
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heavyBadgeText: {
    color: darkThemeColors.iconWarning, // Warning color for text
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Make buttons take equal width if multiple
  },
  saveButton: {
    backgroundColor: darkThemeColors.primary,
    marginRight: 8, // Add margin if there's a cancel button
  },
  cancelButton: {
    backgroundColor: darkThemeColors.inputBg, // A less prominent color for cancel
    marginLeft: 8,
  },
  buttonText: {
    color: darkThemeColors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: darkThemeColors.disabledButtonBg,
    opacity: 0.7,
  },
  // Styles for PackingBoxCard section - these should ideally be in PackingBoxCard itself if it's themed
  // For demonstration, if PackingBoxCard is not themed:
  // packedBoxesHeader: { ...styles.columnHeader }, 
  // packedBoxItem: { backgroundColor: darkThemeColors.cardBg, padding: 12, borderRadius: 6, marginBottom: 10 },
  // packedBoxName: { color: darkThemeColors.textPrimary, fontSize: 17, fontWeight: '600' },
  // packedBoxDetails: { color: darkThemeColors.textSecondary, fontSize: 13, marginTop: 4 },
  
  // Source icon (if needed, from previous context, ensure styling matches theme)
  sourceIconContainer: {
    padding: 4,
    borderRadius: 4,
    marginRight: 6,
    // backgroundColor: 'rgba(255,255,255,0.1)', // Example subtle background
  },
  selectorContainer: {
    marginBottom: 16,
  },
}); 