import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext.tsx'; // Assuming ThemeContext is two levels up
import { lightTheme, darkTheme } from '../../styles/theme.ts'; // Assuming theme is two levels up
import { Ionicons } from '@expo/vector-icons'; // For icons
import type { CardLabel } from '../../shared/types/taskManager.ts'; // ADD THIS IMPORT

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
      width: '90%',
      maxHeight: '85%', // Adjusted for more content
      backgroundColor: currentThemeColors.cardBg,
      borderRadius: 10,
      padding: 15, // Adjusted padding
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10, // Adjusted
      paddingBottom: 8, // Adjusted
      borderBottomWidth: 1,
      borderBottomColor: currentThemeColors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentThemeColors.text,
    },
    closeButton: {
      padding: 5,
    },
    // Create/Edit Label Section
    upsertLabelSection: { // Renamed from createLabelSection
      marginBottom: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: currentThemeColors.border,
    },
    upsertLabelTitle: { // Renamed
        fontSize: 16,
        fontWeight: '600',
        color: currentThemeColors.text,
        marginBottom: 8,
    },
    input: {
      height: 40,
      borderColor: currentThemeColors.border,
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: 8,
      color: currentThemeColors.text,
      backgroundColor: currentThemeColors.inputBg,
    },
    formButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    upsertButton: { // Renamed
      backgroundColor: currentThemeColors.primary,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 5,
      alignItems: 'center',
      flex: 1, // Make buttons take available space
      marginRight: 5, // Add some space if cancel button is next to it
    },
    upsertButtonText: { // Renamed
      color: currentThemeColors.card || '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelEditButton: {
        backgroundColor: currentThemeColors.card,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        alignItems: 'center',
        flex: 1, // Make buttons take available space
        marginLeft: 5,
        borderWidth: 1,
        borderColor: currentThemeColors.border,
    },
    cancelEditButtonText: {
        color: currentThemeColors.text,
        fontWeight: 'bold'
    },
    // Label List Item
    labelItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: currentThemeColors.border,
        borderRadius: 5,
        marginBottom: 8,
        // paddingHorizontal: 5, // Moved to touchable part
    },
    labelTouchableArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: 10, // Added padding left
        flex: 1, // Takes available space pushing icons to the right
    },
    labelColorPreview: {
      width: 20,
      height: 20,
      borderRadius: 4,
      marginRight: 10,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },
    labelText: {
      fontSize: 16,
      color: currentThemeColors.text,
      // flex: 1, // Removed, let container manage space
    },
    labelActions: {
        flexDirection: 'row',
        paddingHorizontal: 5, // Add some padding for icon touch areas
    },
    iconButton: {
        padding: 8, // Increased touch area for icons
    },
    selectedIcon: { // No change needed here, for the checkmark
      // marginLeft: 10, // This was if it was inside labelText area
    },
    // Footer (Apply/Cancel for the whole modal)
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 15, // Adjusted
      paddingTop: 10, // Adjusted
      borderTopWidth: 1,
      borderTopColor: currentThemeColors.border,
    },
    applyButton: {
      backgroundColor: currentThemeColors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
    },
    applyButtonText: {
      color: currentThemeColors.card || '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelModalButton: { // Renamed from cancelButton
        backgroundColor: currentThemeColors.card,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: currentThemeColors.border,
    },
    cancelModalButtonText: { // Renamed from cancelButtonText
        color: currentThemeColors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyListText: {
      textAlign: 'center',
      color: currentThemeColors.textSecondary,
      marginVertical: 20, // Adjusted margin
    },
    listHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: currentThemeColors.text,
        marginBottom: 8,
        marginTop: 10,
    }
  });

  const renderLabelItem = ({ item }: { item: CardLabel }) => {
    const isSelected = !!currentSelected.find(l => l.id === item.id);
    return (
      <View style={[styles.labelItemContainer, isSelected && { backgroundColor: currentThemeColors.primary }]}>
          <TouchableOpacity onPress={() => toggleLabelSelection(item)} style={styles.labelTouchableArea}>
            <View style={[styles.labelColorPreview, { backgroundColor: item.color }]} />
            <Text style={styles.labelText}>{item.name}</Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color={currentThemeColors.primary} style={styles.selectedIcon} />
            )}
          </TouchableOpacity>
          <View style={styles.labelActions}>
            <TouchableOpacity onPress={() => handleStartEditLabel(item)} style={styles.iconButton}>
              <Ionicons name="pencil-outline" size={20} color={currentThemeColors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteLabel(item)} style={styles.iconButton}>
              <Ionicons name="trash-bin-outline" size={20} color={currentThemeColors.error} />
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
      onRequestClose={onClose} // Use onClose from props for hardware back button, etc.
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default LabelPicker; 