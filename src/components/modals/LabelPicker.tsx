import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext.tsx'; // Assuming ThemeContext is two levels up
import { lightTheme, darkTheme } from '../../styles/theme.ts'; // Assuming theme is two levels up
import { Ionicons } from '@expo/vector-icons'; // For icons
import type { CardLabel } from '../../shared/types/taskManager.ts'; // ADD THIS IMPORT
import LinearGradient from 'react-native-linear-gradient';

// Assuming CardLabel type is defined elsewhere and can be imported
// For now, let's define it here if not readily available for import
// import { CardLabel } from '../types'; // Adjust path as necessary
// export interface CardLabel { // Temporary, replace with actual import // REMOVE THIS BLOCK
//   id: string;
//   name: string;
//   color: string;
// } // END REMOVE THIS BLOCK

interface LabelPickerProps {
  isVisible: boolean;
  allLabels: CardLabel[]; // All available labels in the system/board
  selectedLabels: CardLabel[]; // Labels currently selected for the card
  onClose: () => void;
  onSave: (newSelectedLabels: CardLabel[]) => void;
  onNewLabelCreated: (newLabel: CardLabel) => void; // Added new prop
  onLabelUpdated: (updatedLabel: CardLabel) => void; // For informing parent about definition update
  onLabelDeleted: (deletedLabelId: string) => void; // For informing parent about definition deletion
  // TODO: Add onCreateNewLabel if we allow creating labels from here
}

const COLOR_PALETTE = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', '#0079bf',
  '#00c2e0', '#51e898', '#ff78cb', '#344563', '#b3bac5', '#dfe1e6',
  '#ffab4a', '#b04632', '#89609e', '#cd5a91', '#4bbf6b', '#e2b203',
  '#f87462', '#9f8fef', '#579dff', '#60c6d2', '#5aac44', '#f4f5f7'
];

function getContrastYIQ(hexcolor: string) {
  // Remove # if present
  hexcolor = hexcolor.replace('#', '');
  // Convert 3-digit hex to 6-digit
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(x => x + x).join('');
  }
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return yiq >= 128 ? '#222' : '#fff';
}

const LabelPicker: React.FC<LabelPickerProps> = ({
  isVisible,
  allLabels,
  selectedLabels,
  onClose,
  onSave,
  onNewLabelCreated,
  onLabelUpdated,
  onLabelDeleted,
}) => {
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

  const [currentSelected, setCurrentSelected] = useState<CardLabel[]>([]);
  const [displayableLabels, setDisplayableLabels] = useState<CardLabel[]>([]);
  const [labelNameInput, setLabelNameInput] = useState('');
  const [labelColorInput, setLabelColorInput] = useState('');
  const [editingLabel, setEditingLabel] = useState<CardLabel | null>(null);

  useEffect(() => {
    // Initialize displayableLabels with allLabels prop
    // This ensures that if allLabels changes, displayableLabels updates.
    setDisplayableLabels(allLabels);
  }, [allLabels]);

  useEffect(() => {
    // When the modal becomes visible or selectedLabels change, update currentSelected
    if (isVisible) {
      setCurrentSelected(selectedLabels);
      // Also, re-sync displayableLabels with the prop in case it was updated while modal was closed
      // and ensure newly created (but not yet saved) labels are not lost if parent updates `allLabels`
      // A more robust solution might involve merging or a clear "source of truth" for allLabels.
      // For now, if allLabels from prop changes, it might overwrite locally added ones if not careful.
      // A simple merge:
      setDisplayableLabels(prevDisplayable => {
        const propLabelIds = new Set(allLabels.map(l => l.id));
        const uniqueLocalLabels = prevDisplayable.filter(l => !propLabelIds.has(l.id));
        return [...allLabels, ...uniqueLocalLabels];
      });
      // If not editing, clear inputs
      if (!editingLabel) {
          setLabelNameInput('');
          setLabelColorInput('');
      }
    } else {
        // Reset editing state when modal is closed
        setEditingLabel(null);
        setLabelNameInput('');
        setLabelColorInput('');
    }
  }, [selectedLabels, isVisible, allLabels]);

  const toggleLabelSelection = (label: CardLabel) => {
    setCurrentSelected(prevSelected => {
      const isAlreadySelected = prevSelected.find(l => l.id === label.id);
      if (isAlreadySelected) {
        return prevSelected.filter(l => l.id !== label.id);
      } else {
        return [...prevSelected, label];
      }
    });
  };

  const handleStartEditLabel = (labelToEdit: CardLabel) => {
    setEditingLabel(labelToEdit);
    setLabelNameInput(labelToEdit.name);
    setLabelColorInput(labelToEdit.color);
  };

  const cancelEdit = () => {
    setEditingLabel(null);
    setLabelNameInput('');
    setLabelColorInput('');
  }

  const handleUpsertLabel = () => {
    if (!labelNameInput.trim()) {
      Alert.alert("Validation Error", "Label name cannot be empty.");
      return;
    }
    const colorValue = labelColorInput.trim() || currentThemeColors.primary;
    // Basic hex color validation or common color name
    if (!/^#[0-9A-F]{6}$/i.test(colorValue) && !/^#[0-9A-F]{3}$/i.test(colorValue)) {
      const commonColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'brown'];
      if (!commonColors.includes(colorValue.toLowerCase())) {
        Alert.alert("Validation Error", "Please enter a valid hex color (e.g., #FF5733) or a common color name.");
        return;
      }
    }

    // Check for duplicate name (only if not editing the same label, or if name changed)
    const
 trimmedName = labelNameInput.trim();
    const isNameDuplicate = displayableLabels.some(
      label => label.name.toLowerCase() === trimmedName.toLowerCase() && (!editingLabel || label.id !== editingLabel.id)
    );
    if (isNameDuplicate) {
      Alert.alert("Duplicate Label", "A label with this name already exists.");
      return;
    }

    if (editingLabel) { // Update existing label
      const updatedLabel = { ...editingLabel, name: trimmedName, color: colorValue };
      setDisplayableLabels(prevLabels => prevLabels.map(l => l.id === updatedLabel.id ? updatedLabel : l));
      setCurrentSelected(prevSelected => prevSelected.map(l => l.id === updatedLabel.id ? updatedLabel : l));
      onLabelUpdated(updatedLabel); // Inform parent
      setEditingLabel(null);
    } else { // Create new label
      const newLabel: CardLabel = {
        id: Date.now().toString(),
        name: trimmedName,
        color: colorValue,
      };
      onNewLabelCreated(newLabel);
      setDisplayableLabels(prevLabels => [...prevLabels, newLabel]);
      toggleLabelSelection(newLabel);
    }
    setLabelNameInput('');
    setLabelColorInput('');
  };

  const handleDeleteLabel = (labelToDelete: CardLabel) => {
    Alert.alert(
      "Delete Label",
      `Are you sure you want to delete the label "${labelToDelete.name}"? This will remove it from all cards.`, // This part of the message is a TODO for actual global delete.
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: () => {
            setDisplayableLabels(prevLabels => prevLabels.filter(l => l.id !== labelToDelete.id));
            setCurrentSelected(prevSelected => prevSelected.filter(l => l.id !== labelToDelete.id));
            onLabelDeleted(labelToDelete.id); // Inform parent
          }
        }
      ]
    );
  };

  const handleSave = () => {
    onSave(currentSelected);
    // onClose(); // Keep onClose separate for clarity, or if saving shouldn't always close.
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: currentThemeColors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    panel: {
      width: '94%',
      maxWidth: 420,
      maxHeight: '88%',
      backgroundColor: 'rgba(20,22,30,0.98)',
      borderRadius: 22,
      padding: 28,
      margin: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.10)',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: currentThemeColors.text,
      letterSpacing: 0.1,
    },
    closeButton: {
      padding: 6,
    },
    upsertLabelSection: {
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.10)',
    },
    upsertLabelTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: currentThemeColors.text,
        marginBottom: 10,
        letterSpacing: 0.1,
    },
    input: {
      height: 42,
      borderColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      marginBottom: 14,
      color: currentThemeColors.text,
      backgroundColor: 'rgba(255,255,255,0.06)',
      fontSize: 15,
    },
    formButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    upsertButton: {
      backgroundColor: currentThemeColors.primary,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: 'center',
      flex: 1,
      marginRight: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 5,
      elevation: 3,
    },
    upsertButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
      letterSpacing: 0.2,
    },
    cancelEditButton: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        flex: 1,
        marginLeft: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    cancelEditButtonText: {
        color: currentThemeColors.text,
        fontWeight: 'bold',
        letterSpacing: 0.2,
    },
    labelItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 7,
        paddingHorizontal: 0,
        minHeight: 38,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    labelTouchableArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 0,
        paddingLeft: 0,
        flex: 1,
    },
    labelColorPreview: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    labelText: {
      fontSize: 15,
      color: currentThemeColors.text,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    labelActions: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        marginLeft: 6,
    },
    iconButton: {
        padding: 5,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.10)',
    },
    applyButton: {
      backgroundColor: currentThemeColors.primary,
      paddingVertical: 13,
      paddingHorizontal: 36,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 5,
      elevation: 3,
    },
    applyButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
      letterSpacing: 0.2,
    },
    cancelModalButton: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 13,
        paddingHorizontal: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    cancelModalButtonText: {
        color: currentThemeColors.text,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.2,
    },
    emptyListText: {
      textAlign: 'center',
      color: currentThemeColors.textSecondary,
      marginVertical: 18,
      fontSize: 15,
    },
    listHeader: {
        fontSize: 15,
        fontWeight: '700',
        color: currentThemeColors.text,
        marginBottom: 7,
        marginTop: 8,
        letterSpacing: 0.1,
    }
  });

  const renderLabelItem = ({ item }: { item: CardLabel }) => {
    const isSelected = !!currentSelected.find(l => l.id === item.id);
    return (
      <View style={[styles.labelItemContainer, { backgroundColor: item.color }]}> 
        <TouchableOpacity onPress={() => toggleLabelSelection(item)} style={[styles.labelTouchableArea, { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingLeft: 0 }]}> 
          {/* Checkmark for selected state */}
          {isSelected ? (
            <Ionicons name="checkmark" size={22} color={getContrastYIQ(item.color)} style={{ marginLeft: 12, marginRight: 8 }} />
          ) : (
            <View style={{ width: 22, marginLeft: 12, marginRight: 8 }} />
          )}
          <Text style={[styles.labelText, { color: getContrastYIQ(item.color), flex: 1 }]} numberOfLines={1}>{item.name}</Text>
        </TouchableOpacity>
        <View style={styles.labelActions}>
          <TouchableOpacity onPress={() => handleStartEditLabel(item)} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={20} color={getContrastYIQ(item.color)} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteLabel(item)} style={styles.iconButton}>
            <Ionicons name="trash-bin-outline" size={20} color={getContrastYIQ(item.color)} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <Pressable style={[styles.overlay, { backgroundColor: 'transparent' }]} onPress={onClose}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Text style={styles.title}>Manage Labels</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-circle-outline" size={28} color={currentThemeColors.textSecondary} />
              </Pressable>
            </View>

            {/* <ScrollView keyboardShouldPersistTaps="handled"> Comment out or remove ScrollView */}
              <FlatList
                ListHeaderComponent={
                  <>
                    <View style={styles.upsertLabelSection}>
                      <Text style={styles.upsertLabelTitle}>{editingLabel ? 'Edit Label' : 'Create New Label'}</Text>
                      <TextInput
                        placeholder="Label Name"
                        value={labelNameInput}
                        onChangeText={setLabelNameInput}
                        style={styles.input}
                        placeholderTextColor={currentThemeColors.textSecondary}
                      />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, justifyContent: 'flex-start' }}>
                        {COLOR_PALETTE.map(color => (
                          <Pressable
                            key={color}
                            onPress={() => setLabelColorInput(color)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: color,
                              margin: 5,
                              borderWidth: labelColorInput === color ? 3 : 1,
                              borderColor: labelColorInput === color ? currentThemeColors.primary : '#fff',
                              justifyContent: 'center',
                              alignItems: 'center',
                              shadowColor: labelColorInput === color ? currentThemeColors.primary : 'transparent',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: labelColorInput === color ? 0.18 : 0,
                              shadowRadius: labelColorInput === color ? 6 : 0,
                              elevation: labelColorInput === color ? 2 : 0,
                            }}
                          >
                            {labelColorInput === color && (
                              <Ionicons name="checkmark" size={20} color="#fff" />
                            )}
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        placeholder="Color (e.g., #FF5733 or 'blue')"
                        value={labelColorInput}
                        onChangeText={setLabelColorInput}
                        style={styles.input}
                        placeholderTextColor={currentThemeColors.textSecondary}
                        autoCapitalize="none"
                      />
                      <View style={styles.formButtonsContainer}>
                        <TouchableOpacity onPress={handleUpsertLabel} style={styles.upsertButton}>
                          <Text style={styles.upsertButtonText}>{editingLabel ? 'Update Label' : 'Create and Add'}</Text>
                        </TouchableOpacity>
                        {editingLabel && (
                            <TouchableOpacity onPress={cancelEdit} style={styles.cancelEditButton}>
                                <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
                            </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={styles.listHeader}>Available Labels</Text>
                  </>
                }
                data={displayableLabels}
                renderItem={renderLabelItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyListText}>No labels defined. Create one above!</Text>}
                // nestedScrollEnabled={true} // No longer needed as it's not nested in a ScrollView of the same orientation
                keyboardShouldPersistTaps="handled" // Move this prop to FlatList
              />
            {/* </ScrollView> Comment out or remove ScrollView */}
            
            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelModalButton}>
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { handleSave(); onClose(); }} style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </LinearGradient>
    </Modal>
  );
};

export default LabelPicker; 
