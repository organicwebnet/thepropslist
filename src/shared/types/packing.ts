import { PackingContainer } from '../services/inventory/packListService';

export interface PackingBoxCardBaseProps {
  container: PackingContainer;
  packListId: string;
  onUpdateNotes?: (notes: string) => void;
  onError?: (error: string) => void;
  baseUrl: string; // For consistent URL generation
  onPrintLabel?: () => void;
  onShare?: () => void;
  onScan?: () => void;
}

export interface PackingBoxActions {
  handlePrint: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleScan: () => Promise<void>;
  handleNotesUpdate: (notes: string) => void;
}

export interface PackingBoxState {
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
}

export const generateContainerUrl = (baseUrl: string, packListId: string, containerId: string): string => {
  return `${baseUrl}/pack-lists/${packListId}/containers/${containerId}`;
};

export const calculateIsHeavy = (container: PackingContainer): boolean => {
  return !!(
    container.maxWeight &&
    container.currentWeight &&
    container.currentWeight.value >= container.maxWeight.value * 0.9
  );
}; 