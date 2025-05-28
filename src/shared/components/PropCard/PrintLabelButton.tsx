import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { PackingLabel } from '../../services/inventory/packListService.ts';
import { LabelPrintService } from '../../services/pdf/labelPrintService.ts';

interface PrintLabelButtonProps {
  label: PackingLabel;
  onError?: (error: string) => void;
  className?: string; // For web styling
  style?: any; // For React Native styling
}

export const PrintLabelButton: React.FC<PrintLabelButtonProps> = ({
  label,
  onError,
  className,
  style
}) => {
  const labelPrintService = new LabelPrintService();

  const handlePrint = async () => {
    try {
      await labelPrintService.printLabels([label]);
    } catch (error) {
      console.error('Error printing label:', error);
      onError?.('Failed to print label');
    }
  };

  if (Platform.OS === 'web') {
    return (
      <button
        onClick={handlePrint}
        className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${className || ''}`}
      >
        Print Label
      </button>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePrint}
      style={[{
        backgroundColor: '#3B82F6',
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center'
      }, style]}
    >
      <Text style={{ color: 'white', fontSize: 16 }}>
        Print Label
      </Text>
    </TouchableOpacity>
  );
}; 