import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, ViewStyle, ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import type { Prop } from '../../types';
import { lifecycleStatusLabels } from '../../../types/lifecycle.ts';
import { Feather } from '@expo/vector-icons';
import { PrintLabelButton } from './PrintLabelButton.tsx';

interface PropCardProps {
  prop: Prop;
  compact?: boolean;
  onEditPress?: (propId: string) => void;
  onDeletePress?: (propId: string) => void;
}

// Helper to check if the source is a valid structure for RN <Image>
function isValidImageSource(source: any): source is { uri: string } {
  return typeof source === 'object' && source !== null && typeof source.uri === 'string';
}

// Defensive helper to safely render text
function safeText(value: any, fallback = ''): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value === undefined || value === null) return fallback;
  console.warn('Non-string value passed to <Text> in PropCard:', value);
  return fallback;
}

const PropCard: React.FC<PropCardProps> = ({ prop, compact = false, onEditPress, onDeletePress }) => {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const renderImage = () => {
    // Find the primary image from the images array or fallback to the legacy imageUrl
    const primaryImage = prop.images?.find(img => img.isMain);
    const imageUrl = primaryImage?.url || prop.imageUrl;

    if (imageError || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return (
        <View style={styles.placeholderImage}>
          <Feather name="image" size={40} color="#FFFFFF" />
        </View>
      );
    }
    
    const imageSource: ImageSourcePropType = { uri: imageUrl };
    
    return (
      <Image
        source={imageSource} 
        style={styles.image}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    );
  };

  const statusLabel = prop.status && prop.status in lifecycleStatusLabels 
    ? lifecycleStatusLabels[prop.status as keyof typeof lifecycleStatusLabels] 
    : (prop.status || 'Unknown');

  const handleNavigate = () => {
    if (onEditPress) {
      onEditPress(prop.id);
    } else {
      router.navigate(`/(tabs)/props/${prop.id}` as any);
    }
  };

  return (
      <TouchableOpacity
        style={[styles.container, compact && styles.compactContainer]}
        activeOpacity={0.8}
        onPress={handleNavigate}
      >
        <View style={styles.cardLayoutRow}>
          <View style={styles.imageContainer}>
            {renderImage()}
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.topContent}>
              <Text style={styles.name}>{safeText(prop.name, 'Unnamed Prop')}</Text>
             {!compact && prop.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {safeText(prop.description)}
                </Text>
              ) : null}
            </View>

            {!compact ? (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  {prop.category ? (
                    <View style={[styles.tag, styles.categoryTag]}>
                      <Text style={styles.tagText}>{safeText(prop.category, 'Uncategorized')}</Text>
                    </View>
                  ) : null}
                   <View style={[styles.tag, styles.statusTag]}>
                     <Text style={styles.tagText}>{safeText(statusLabel, 'Unknown')}</Text>
                  </View>
                  <View style={[styles.tag, styles.qtyTag]}>
                    <Text style={styles.tagText}>Qty: {safeText(prop.quantity, '1')}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {(onEditPress || onDeletePress) ? (
              null
            ) : null} 
          </View>
        </View>
      </TouchableOpacity>
  );
};

const baseContainerStyle: ViewStyle = {
  position: 'relative',
  padding: 16,
  borderRadius: 12,
  backgroundColor: 'rgba(24,24,27,0.85)',
  borderWidth: 1,
  borderColor: '#222',
  marginBottom: 16,
};

const styles = StyleSheet.create({
  container: {
    ...baseContainerStyle,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  } as ViewStyle,
  compactContainer: {
    padding: 8,
  },
  cardLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 16,
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#404040',
  },
  placeholderImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topContent: {
    marginBottom: 8,
    minHeight: 30,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  description: {
    color: '#b0b0b0',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  detailsSection: {
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  tag: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 4,
    backgroundColor: '#333',
  },
  categoryTag: {
    backgroundColor: '#6366f1',
  },
  statusTag: {
    backgroundColor: '#6ee7b7',
  },
  qtyTag: {
    backgroundColor: '#4caf50',
    marginLeft: 0,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailText: {
    color: '#b0b0b0',
    fontSize: 13,
    marginRight: 8,
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mainRow: { backgroundColor: 'transparent' },
  secondaryRow: { backgroundColor: 'transparent' },
  card: { backgroundColor: 'transparent' },
});

export default PropCard;
