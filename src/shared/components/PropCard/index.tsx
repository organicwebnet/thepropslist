import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, ViewStyle, ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { Edit3, Trash2, Package, CalendarDays, UserCircle, Building, Palette, Paperclip } from 'lucide-react';
import type { Prop, PropImage } from '../../types/props.ts';
import { lifecycleStatusLabels } from '../../../types/lifecycle.ts';
import { Image as ImageIcon } from 'lucide-react-native';
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

const PropCard: React.FC<PropCardProps> = ({ prop, compact = false, onEditPress, onDeletePress }) => {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  // Log the prop object to check its contents, especially name and description - REMOVE THIS
  // console.log(`PropCard received prop: ID=${prop.id}, Name=${prop.name}, Description=${prop.description}`);

  const renderImage = () => {
    // Use prop.primaryImageUrl first, then fallback to prop.imageUrl
    const imageUrl = prop.primaryImageUrl || prop.imageUrl;

    // Condition 1: Already errored, or no imageUrl string, or empty imageUrl string
    if (imageError || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return (
        <View style={styles.placeholderImage}>
          <ImageIcon size={40} color="#FFFFFF" />
        </View>
      );
    }

    // At this point, imageUrl is a non-empty string
    const imageSource: ImageSourcePropType = { uri: imageUrl };

    // The isValidImageSource check is a bit redundant here if we've already confirmed imageUrl is a string
    // but keeping it for safety, or it could be removed if confident.
    if (isValidImageSource(imageSource)) { 
    return (
      <Image
        source={imageSource} 
        style={styles.image}
        resizeMode="cover"
        onError={(error) => {
          console.warn(`PropCard: Image loading error for ${prop.name}, URI: ${imageUrl}:`, error.nativeEvent?.error || error.nativeEvent);
          setImageError(true);
        }}
      />
    );
     } else {
    //   // This path should ideally not be reached if imageUrl is a valid string.
    //   console.error('PropCard: Invalid imageSource structure unexpectedly for ', imageUrl);
       setImageError(true); 
       return (
        <View style={styles.placeholderImage}>
           <Text style={styles.placeholderText}>{prop.name?.[0]?.toUpperCase() || 'P'}</Text>
         </View>
       );
     }
  };

  // Helper to format dimensions safely
  const formatDimensions = () => {
    // Use direct properties from prop
    const { length, width, height, depth, unit } = prop; 
    const parts = [length, width, height, depth].filter(d => d != null && d > 0);
    if (parts.length === 0) return null;
    return `${parts.join(' x ')} ${unit || ''}`.trim();
  };

  const dimensionsText = formatDimensions();
  const statusLabel = prop.status && prop.status in lifecycleStatusLabels 
    ? lifecycleStatusLabels[prop.status as keyof typeof lifecycleStatusLabels] 
    : (prop.status || 'Unknown');

  const handleNavigate = () => {
    // Programmatic navigation
    router.push({ pathname: `/propsTab/[id]` as any, params: { id: prop.id } });
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
              <Text style={styles.name}>{prop.name}</Text>
             {!compact && prop.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {prop.description}
                </Text>
              ) : null}
            </View>

            {!compact ? (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  {(prop.act || prop.scene) ? (
                    <View style={[styles.tag, styles.actSceneTag]}>
                      <Text style={styles.tagText}>
                        {`${prop.act ? `Act ${prop.act}` : ''}${prop.act && prop.scene ? ', ' : ''}${prop.scene ? `Scene ${prop.scene}` : ''}`}
                      </Text>
                    </View>
                  ) : null}
                  {prop.category ? (
                    <View style={[styles.tag, styles.categoryTag]}>
                      <Text style={styles.tagText}>{prop.category}</Text>
                    </View>
                  ) : null}
                </View>
                
                <View style={styles.detailRow}>
                  {dimensionsText ? (
                     <Text style={styles.detailText}>{dimensionsText}</Text>
                  ) : null}
                  <View style={[styles.tag, styles.statusTag]}>
                     <Text style={styles.tagText}>{statusLabel}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {(onEditPress || onDeletePress) ? (
              <View style={styles.buttonContainer}>
                {onEditPress ? (
                  <TouchableOpacity 
                    style={[styles.button, styles.editButton]} 
                    onPress={(e) => { 
                      e.stopPropagation();
                      onEditPress(prop.id); 
                    }}
                    accessibilityRole="button" 
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
                {onDeletePress ? (
                  <TouchableOpacity 
                    style={[styles.button, styles.deleteButton]} 
                    onPress={(e) => { 
                      e.stopPropagation();
                      onDeletePress(prop.id); 
                    }}
                    accessibilityRole="button" 
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null} 
          </View>
        </View>
      </TouchableOpacity>
  );
};

const baseContainerStyle: ViewStyle = {
  position: 'relative',
  padding: 16,
  borderRadius: 8,
  backgroundColor: '#282828',
  borderWidth: 1,
  borderColor: '#606060',
  marginBottom: 16,
};

const styles = StyleSheet.create({
  container: {
    ...baseContainerStyle,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
    // --- Start: Comment out platform-specific shadows ---
    /*
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' as any } // Cast for web
      : Platform.OS === 'android'
      ? { elevation: 3 }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 1.41,
        }),
    */
    // --- End: Comment out platform-specific shadows ---
  } as ViewStyle,
  compactContainer: {
    padding: 8,
  },
  cardLayoutRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // backgroundColor: '#555', // Removed main row debug color
  },
  imageContainer: {
    marginRight: 16,
    width: 80,
    height: 80,
    // borderColor: 'orange', // Removed imageContainer debug border
    // borderWidth: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#404040',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1, 
    // backgroundColor: 'yellow', // REMOVE yellow background
  },
  topContent: {
    marginBottom: 12,
    // backgroundColor: 'orange', // REMOVE orange background
    minHeight: 30, 
  },
  detailsSection: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  detailText: {
    color: '#A0A0A0',
    fontSize: 13,
    marginRight: 8,
    marginBottom: 4,
  },
  tag: {
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  actSceneTag: {
    backgroundColor: '#4B5563',
  },
  categoryTag: {
    backgroundColor: '#8B5CF6',
  },
  statusTag: {
    backgroundColor: '#6B7280',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    // backgroundColor: 'red', // REMOVE red background
  },
  description: {
    color: '#A0A0A0',
    fontSize: 14,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default PropCard;