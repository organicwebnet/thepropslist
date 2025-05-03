import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, ViewStyle, ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import type { Prop, PropImage } from '../../types/props';
import { lifecycleStatusLabels } from '@/types/lifecycle';

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

  const renderImage = () => {
    // Determine the primary image URL from the images array
    const primaryImageUrl = prop.images && prop.images.length > 0 ? prop.images[0]?.url : null;
    
    // Condition 1: Already errored or no valid primary image URL found
    if (imageError || !primaryImageUrl) {
      return (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>{prop.name?.[0]?.toUpperCase()}</Text>
        </View>
      );
    }

    let imageSource: ImageSourcePropType | null = null;
    try {
      // Condition 2: Ensure primaryImageUrl is a string (already checked implicitly by getting it from prop.images[0].url)
      if (typeof primaryImageUrl === 'string' && primaryImageUrl.trim() !== '') {
        imageSource = { uri: primaryImageUrl };
      } else {
        // This case should be rare if primaryImageUrl is correctly sourced
        console.warn('PropCard: primaryImageUrl is not a valid string:', primaryImageUrl);
        setImageError(true); 
        return (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{prop.name?.[0]?.toUpperCase()}</Text>
          </View>
        );
      }
      
      // Condition 3: FINAL check before rendering <Image>
      if (isValidImageSource(imageSource)) {
        return (
          <Image
            source={imageSource} 
            style={styles.image}
            resizeMode="cover"
            onError={(error) => {
              console.warn('PropCard: Image loading error:', error.nativeEvent?.error || error.nativeEvent);
              setImageError(true);
            }}
          />
        );
      } else {
        console.error('PropCard: Invalid imageSource structure before rendering Image:', imageSource);
        setImageError(true); 
        return (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{prop.name?.[0]?.toUpperCase()}</Text>
          </View>
        );
      }
    } catch (error) {
      console.error('PropCard: Error processing image source:', error);
       setImageError(true); 
      return (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>{prop.name?.[0]?.toUpperCase()}</Text>
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
  const statusLabel = prop.status ? (lifecycleStatusLabels[prop.status] || prop.status) : 'Unknown';

  const handleNavigate = () => {
    // Programmatic navigation
    router.push({ pathname: `/props/[id]` as any, params: { id: prop.id } });
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
            {/* Top section: Name and Description */}
            <View style={styles.topContent}>
              <Text style={styles.name}>{prop.name}</Text>
              {!compact && prop.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {prop.description}
                </Text>
              ) : null}
            </View>

            {/* Middle section: Details like Act/Scene, Category, Dimensions, Status */}
            {!compact ? (
              <View style={styles.detailsSection}>
                {/* Act/Scene and Category Row */}
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
                
                {/* Dimensions and Status Row */}
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

            {/* Bottom section: Buttons */}
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
  flexDirection: 'row',
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
          shadowOffset: { width: 0, height: 1 }, // <-- iOS shadow
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
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginRight: 16,
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
  },
  topContent: {
    marginBottom: 8,
  },
  detailsSection: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  detailText: {
    color: '#A0A0A0',
    fontSize: 13,
    marginRight: 8,
    marginBottom: 4,
  },
  tag: {
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 4,
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
    fontSize: 11,
    fontWeight: '500',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#A0A0A0',
    fontSize: 14,
    marginBottom: 8,
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