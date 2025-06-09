import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext.tsx'; // Adjust path as needed
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../styles/theme.ts'; // Adjust path as needed

interface QuantityInputModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  propName: string;
  initialQuantity?: number;
}

export default function QuantityInputModal({
  isVisible,
  onClose,
  onSubmit,
  propName,
  initialQuantity = 0,
}: QuantityInputModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity.toString());
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getStyles(currentThemeColors);

  useEffect(() => {
    if (isVisible) {
      setQuantity(initialQuantity.toString());
    }
  }, [isVisible, initialQuantity]);

  const handleSubmit = () => {
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity < 0) {
      // Or show an inline error message
      alert('Please enter a valid non-negative number for quantity.'); 
      return;
    }
    onSubmit(numQuantity);
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={28} color={currentThemeColors.textSecondary || '#999'} />
          </TouchableOpacity>
          <Text style={styles.title}>Update Quantity</Text>
          <Text style={styles.propNameText}>Prop: {propName}</Text>
          
          <TextInput
            style={styles.input}
            onChangeText={setQuantity}
            value={quantity}
            keyboardType="numeric"
            placeholder="Enter quantity"
            placeholderTextColor={currentThemeColors.textSecondary || '#ccc'}
            autoFocus={true}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit}>
              <Text style={[styles.buttonText, styles.submitButtonText]}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: themeColors.card,
    borderRadius: 12,
    padding: 25,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  propNameText: {
    fontSize: 16,
    color: themeColors.textSecondary || themeColors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 45,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: 18,
    color: themeColors.text,
    backgroundColor: themeColors.background, // Or a slightly different input background
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1, // Each button takes half the space
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5, // Add some space between buttons
  },
  cancelButton: {
    backgroundColor: themeColors.background, // Or a subtle cancel color
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  submitButton: {
    backgroundColor: themeColors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: themeColors.text, // Text color for cancel button
  },
  submitButtonText: {
    color: themeColors.card, // Text color for submit button (assuming primary has dark text on it)
  },
}); 