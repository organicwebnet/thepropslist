import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, ViewStyle, ImageSourcePropType } from 'react-native';
import { Link } from 'expo-router';
import type { Prop, PropImage } from '../../types/props';

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
            // resizeMethod="resize" // Typically not needed with cover/contain
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

  return (
    <Link href={`/props/${prop.id}`} asChild>
      <TouchableOpacity
        style={[styles.container, compact && styles.compactContainer]}
        activeOpacity={0.8}
      >
        {renderImage()}
        <View style={styles.content}>
          <Text style={styles.name}>{prop.name}</Text>
          {!compact && prop.description && (
            <Text style={styles.description} numberOfLines={2}>
              {prop.description}
            </Text>
          )}
          {(onEditPress || onDeletePress) && (
            <View style={styles.buttonContainer}>
              {onEditPress && (
                <TouchableOpacity 
                  style={[styles.button, styles.editButton]} 
                  onPress={(e) => { 
                    e.stopPropagation();
                    onEditPress(prop.id); 
                  }}
                >
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
              )}
              {onDeletePress && (
                <TouchableOpacity 
                  style={[styles.button, styles.deleteButton]} 
                  onPress={(e) => { 
                    e.stopPropagation();
                    onDeletePress(prop.id); 
                  }}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );
};

const baseContainerStyle: ViewStyle = {
  position: 'relative',
  flexDirection: 'row',
  padding: 16,
  borderRadius: 8,
  backgroundColor: '#1A1A1A',
  borderWidth: 1,
  borderColor: '#404040',
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
  image: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 16,
    backgroundColor: '#404040',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 16,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
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
    marginTop: 'auto',
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