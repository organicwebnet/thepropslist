import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

interface QuickActionModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  maxLength?: number;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  visible,
  title,
  placeholder = 'Enter text...',
  initialValue = '',
  onSave,
  onCancel,
  multiline = false,
  maxLength = 500,
}) => {
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    if (value.trim().length === 0) {
      Alert.alert('Error', 'Please enter some text before saving.');
      return;
    }
    onSave(value.trim());
    setValue('');
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      accessibilityViewIsModal={true}
      accessibilityLabel={title}
    >
      <View style={styles.overlay} accessibilityRole="dialog">
        <View style={styles.modal}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            placeholder={placeholder}
            value={value}
            onChangeText={setValue}
            multiline={multiline}
            numberOfLines={multiline ? 4 : 1}
            maxLength={maxLength}
            autoFocus
            accessibilityLabel={`${title} input field`}
            accessibilityHint={`Enter text for ${title.toLowerCase()}`}
          />
          
          <Text style={styles.charCount}>
            {value.length}/{maxLength} characters
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
              accessibilityLabel="Cancel"
              accessibilityHint="Close modal without saving"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              accessibilityLabel="Save"
              accessibilityHint="Save changes and close modal"
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
