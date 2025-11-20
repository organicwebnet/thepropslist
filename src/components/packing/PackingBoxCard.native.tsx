import React, { useState } from 'react';
import { PackingBox, PackedProp } from '../../types/packing';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useRouter, Link } from 'expo-router';
import { TouchableOpacity, Text, View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface PackingBoxCardProps {
  box: PackingBox & { showId?: string };
  onEdit: (box: PackingBox) => void;
  onDelete: (boxId: string) => Promise<void>;
}

type StatusStyle = { bg: string; text: string; icon: React.ElementType }; // Icon type for React Native components
const statusStyles: Record<string, StatusStyle> = {
  draft: { bg: '#374151', text: '#9CA3AF', icon: (props) => <Feather name="edit-3" {...props} /> },
  packed: { bg: '#1D4ED8', text: '#93C5FD', icon: (props) => <MaterialCommunityIcons name="package-variant-closed-check" {...props} /> },
  shipped: { bg: '#7E22CE', text: '#C4B5FD', icon: (props) => <Feather name="box" {...props} /> },
  delivered: { bg: '#16A34A', text: '#86EFAC', icon: (props) => <Feather name="check-circle" {...props} /> },
  cancelled: { bg: '#DC2626', text: '#F87171', icon: (props) => <MaterialCommunityIcons name="package-variant-closed-remove" {...props} /> },
};

export function PackingBoxCard({ box, onEdit, onDelete }: PackingBoxCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        await onDelete(box.id);
    } catch (error) {
        console.error("Error during delete operation:", error);
    } finally {
        setIsDeleting(false);
    }    
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const makeQr = (boxId: string) => {
        const payload = JSON.stringify({ type: 'packingBox', id: boxId, showId: (box as any).showId });
        return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(payload)}`;
      };
      const label = {
        id: `${box.id}-label`,
        containerId: box.id,
        packListId: (box as any).showId || 'unknown',
        qrCode: makeQr(box.id),
        containerName: box.name || 'Unnamed Box',
        containerStatus: (box as any).status || 'draft',
        propCount: box.props?.length || 0,
        labels: (box as any).labels || [],
        url: `https://thepropslist.uk/c/${box.id}`,
        generatedAt: new Date(),
      } as any;
      const { LabelPrintService } = await import('../../shared/services/pdf/labelPrintService');
      const printer = new LabelPrintService();
      await printer.printLabels([label]);
    } catch (e) {
      console.warn('Print failed', e);
    } finally {
      setIsPrinting(false);
    }
  };

  const updatedAt = box.updatedAt;
  let timeAgo = 'Just now';
  if (updatedAt && typeof (updatedAt as any).toDate === 'function') {
    try {
      timeAgo = formatDistanceToNow((updatedAt as any).toDate(), { addSuffix: true });
    } catch {
      timeAgo = 'Invalid date';
    }
  } else if (updatedAt instanceof Date) {
    try {
      timeAgo = formatDistanceToNow(updatedAt, { addSuffix: true });
    } catch {
      timeAgo = 'Invalid date';
    }
  } else if (typeof updatedAt === 'string') {
    try {
      const date = new Date(updatedAt);
      if (!isNaN(date.getTime())) timeAgo = formatDistanceToNow(date, { addSuffix: true });
      else timeAgo = 'Invalid date string';
    } catch {
      timeAgo = 'Invalid date format';
    }
  }
  
  const totalWeightKg = box.props?.reduce((sum, p) => sum + (p.weight || 0), 0) ?? 0;
  const status = box.status ?? 'draft';
  const currentStatusStyle = statusStyles[status] || { bg: '#F59E0B', text: '#FCD34D', icon: (props) => <Feather name="alert-triangle" {...props} /> };
  const StatusIcon = currentStatusStyle.icon;

  // const handleNavigateToLabel = () => { // Commenting out for simplification
  //   console.log("Navigate to label (Native) - ID:", box.id, "Show ID:", box.showId);
  //   router.navigate({ pathname: '/(web)/packing/label/[id]' as any, params: { id: box.id, showId: box.showId } });
  // };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.navigate({ pathname: '/(tabs)/packing/box/[id]' as any, params: { id: box.id, showId: box.showId }})} 
            style={styles.titleContainer}
          >
            <Text style={styles.titleText} numberOfLines={1}>{box.name ?? 'Unnamed Box'}</Text>
          </TouchableOpacity>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity onPress={handlePrint} style={styles.iconButton} disabled={isPrinting}>
              {isPrinting ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Feather name="printer" size={18} color="#9CA3AF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(box)} style={styles.iconButton}>
              <Feather name="edit-3" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} disabled={isDeleting} style={styles.iconButton}>
              {isDeleting ? 
                <ActivityIndicator size="small" color="#EF4444" /> : 
                <Feather name="trash-2" size={18} color="#9CA3AF" />
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={{color: 'white'}}>Status Placeholder - {status.charAt(0).toUpperCase() + status.slice(1)} | {timeAgo}</Text>
        </View>

        {box.description && <Text style={{color: 'white'}}>Description: {box.description}</Text>}

        <View style={styles.contentSection}>
          <Text style={{color: 'white'}}>Contents Placeholder ({box.props?.length || 0} items)</Text>
        </View>

        <View style={styles.footerSection}>
          <Text style={{color: 'white'}}>Footer Placeholder - Weight: {totalWeightKg.toFixed(1)} kg</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1F2937', // gray-800
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151', // gray-700
    marginVertical: 8, // For spacing between cards
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1, // Allow title to take available space
    marginRight: 8, 
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6', // gray-100
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // For spacing between badge and button
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999, // Pill shape
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelButton: {
    backgroundColor: '#3B82F6', // blue-500
    paddingVertical: 3, 
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  labelButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  timeAgoText: {
    fontSize: 10,
    color: '#6B7280', // gray-500
  },
  descriptionText: {
    fontSize: 14,
    color: '#9CA3AF', // gray-400
    marginBottom: 12,
  },
  contentSection: {
    borderTopWidth: 1,
    borderColor: '#374151', // gray-700
    paddingTop: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB', // gray-300
    marginBottom: 8,
  },
  propsListScrollContainer: {
    maxHeight: 100, // Example, adjust as needed
  },
  propItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  propItemName: {
    flex: 1, // To allow truncation if name is long
    marginRight: 8,
    color: '#9CA3AF', 
    fontSize: 12,
  },
  propItemDetails: {
    color: '#9CA3AF', 
    fontSize: 12,
    flexShrink: 0, // Prevent details from shrinking too much
  },
  noPropsText: {
    fontSize: 12,
    color: '#6B7280', // gray-500
    fontStyle: 'italic',
  },
  footerSection: {
    borderTopWidth: 1,
    borderColor: '#374151', // gray-700
    marginTop: 12,
    paddingTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // gap: 8, // gap is not supported on View, use margins if needed
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280', // gray-500
  },
  heavyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)', // yellow-700/30 approximation
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8, // Space from weight text
  },
  heavyIcon: {
    marginRight: 4,
  },
  heavyText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FCD34D', // yellow-300
  },
}); 
