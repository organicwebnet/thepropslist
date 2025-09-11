import * as React from 'react';
import {
    ActivityIndicator, Text, View, StyleSheet, TouchableOpacity, ScrollView, Platform
} from 'react-native';
import { PackingBox } from '../../types/packing'; 
import { Show } from '../../types'; 
import { Prop } from '../../shared/types/props'; 
import { PackingBoxCard } from './PackingBoxCard';
// For icons, we need to use lucide-react-native
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { darkTheme, lightTheme } from '../../styles/theme';
const theme = darkTheme;

// Inline create UI removed; this component now only shows existing boxes

interface PackingListProps {
  show: Show;
  boxes: PackingBox[];
  props: Prop[]; 
  isLoading?: boolean;
  onUpdateBox: (boxId: string, updates: Partial<PackingBox>) => Promise<void>; 
  onDeleteBox: (boxId: string) => Promise<void>;
}

export function PackingList({
  show,
  boxes, 
  props, 
  isLoading = false,
  onUpdateBox,
  onDeleteBox,
}: PackingListProps) {
  const [editingBoxId, setEditingBoxId] = React.useState<string | null>(null);

  // Inline create/list selection removed

  // Removed selection/weight logic

  const handlePrintAllLabels = async () => {
    try {
      // Build labels directly; avoid PackListService dependency here
      const makeQr = (boxId: string) => {
        const payload = JSON.stringify({ type: 'packingBox', id: boxId, showId: show.id });
        return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(payload)}`;
      };
      const labels = boxes.map((b) => ({
        id: `${b.id}-label`,
        containerId: b.id,
        packListId: show.id,
        qrCode: makeQr(b.id),
        containerName: b.name || 'Unnamed Box',
        containerStatus: (b as any).status || 'draft',
        propCount: b.props?.length || 0,
        labels: (b as any).labels || [],
        url: `https://thepropslist.uk/c/${b.id}`,
        generatedAt: new Date(),
      }));
      const { LabelPrintService } = await import('../../shared/services/pdf/labelPrintService');
      const printer = new LabelPrintService();
      await printer.printLabels(labels as any);
    } catch (e) {
      console.warn('Failed to print labels', e);
    }
  };

  // No source icon needed currently

  const handleEditBox = (box: PackingBox) => {
    setEditingBoxId(box.id);
  };

  const handleCancelEdit = () => {
    setEditingBoxId(null);
  };

  // View-only boxes list; creation happens on separate screen
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Existing Boxes */}
      <View style={styles.column}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.columnHeader}>Packed Boxes for {show.name}</Text>
        </View>
        {boxes.length === 0 && !isLoading && (
           <Text style={styles.emptyStateText}>No boxes packed yet for this show.</Text>
        )}
        {isLoading && boxes.length === 0 && (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20}} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 10, // More padding on web
  },
  column: {
    marginBottom: 24,
    padding: Platform.OS === 'web' ? 16 : 8,
    backgroundColor: Platform.OS === 'web' ? theme.colors.cardBg : 'transparent', // Card bg for web columns
    borderRadius: Platform.OS === 'web' ? 8 : 0,
  },
  columnHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    borderBottomWidth: Platform.OS === 'web' ? 1 : 0, // Only border on web
    borderBottomColor: theme.colors.border,
    paddingBottom: Platform.OS === 'web' ? 8 : 0,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  printBtnText: {
    color: theme.colors.buttonText,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  boxCreationForm: {
    backgroundColor: theme.colors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000', // Add some shadow for depth
   
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border, // Subtle border for input
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  selectedPropsContainer: {
    maxHeight: 150, // Limit height to make it scrollable within the form
    marginBottom: 16,
    padding: 8,
    backgroundColor: theme.colors.inputBg, // Use a slightly different bg for this scroll area
    borderRadius: 6,
  },
  selectedPropItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.cardBg, // Match card background
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
    backgroundColor: theme.colors.border, // Fallback bg
  },
  selectedPropImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPropImagePlaceholderText: {
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  selectedPropName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    flexShrink: 1, // Allow text to shrink if too long
  },
  selectedPropNotes: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flexShrink: 1,
    marginTop: 2,
  },
  emptyStateText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    paddingVertical: 12,
    fontSize: 14,
  },
  summarySection: {
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  heavyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg, // Use card bg for badge
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heavyBadgeText: {
    color: theme.colors.iconWarning, // Warning color for text
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
    backgroundColor: theme.colors.primary,
    marginRight: 8, // Add margin if there's a cancel button
  },
  cancelButton: {
    backgroundColor: theme.colors.inputBg, // A less prominent color for cancel
    marginLeft: 8,
  },
  buttonText: {
    color: theme.colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabledButtonBg,
    opacity: 0.7,
  },
  // Styles for PackingBoxCard section - these should ideally be in PackingBoxCard itself if it's themed
  // For demonstration, if PackingBoxCard is not themed:
  // packedBoxesHeader: { ...styles.columnHeader }, 
  // packedBoxItem: { backgroundColor: theme.colors.cardBg, padding: 12, borderRadius: 6, marginBottom: 10 },
  // packedBoxName: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '600' },
  // packedBoxDetails: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  
  // Source icon (if needed, from previous context, ensure styling matches theme)
  sourceIconContainer: {
    padding: 4,
    borderRadius: 4,
    marginRight: 6,
    // backgroundColor: 'rgba(255,255,255,0.1)', // Example subtle background
  },
  selectorContainer: { },
}); 
