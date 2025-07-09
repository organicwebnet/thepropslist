import React from 'react';
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
}) => {
  const labelPrintService = new LabelPrintService();

  const handlePrint = async () => {
    try {
      await labelPrintService.printLabels([label]);
    } catch (error) {
      onError?.('Failed to print label');
    }
  };

  return (
    <button
      onClick={handlePrint}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${className || ''}`}
    >
      Print Label
    </button>
  );
}; 
