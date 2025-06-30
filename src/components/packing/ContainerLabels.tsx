import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { PackingContainer } from '../../shared/services/inventory/packListService.ts';
import { Feather } from '@expo/vector-icons';

interface ContainerLabelsProps {
  container: PackingContainer;
  onUpdateLabels: (labels: string[]) => void;
}

export const ContainerLabels: React.FC<ContainerLabelsProps> = ({
  container,
  onUpdateLabels
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddLabel = () => {
    if (!newLabel.trim()) {
      setError('Label cannot be empty');
      return;
    }

    if (container.labels.includes(newLabel.trim())) {
      setError('Label already exists');
      return;
    }

    const updatedLabels = [...container.labels, newLabel.trim()];
    onUpdateLabels(updatedLabels);
    setNewLabel('');
    setError(null);
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const updatedLabels = container.labels.filter(label => label !== labelToRemove);
    onUpdateLabels(updatedLabels);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddLabel();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newLabel}
          onChangeText={(text) => setNewLabel(text)}
          onSubmitEditing={handleAddLabel}
          placeholder="Add a label..."
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddLabel}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View style={styles.labelsContainer}>
        {container.labels.map((label) => (
          <View
            key={label}
            style={styles.labelContainer}
          >
            <Text style={styles.labelText}>{label}</Text>
            <TouchableOpacity
              onPress={() => handleRemoveLabel(label)}
              style={styles.removeButton}
            >
              <Feather name="x-circle" color="#9CA3AF" size={16} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  labelText: {
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
});
