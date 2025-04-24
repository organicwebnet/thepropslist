import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import type { Prop } from '../types';
import { Clock, HandCoins, Edit, Trash } from 'lucide-react-native';

interface PropCardProps {
  prop: Prop;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export const PropCard: React.FC<PropCardProps> = ({ 
  prop, 
  onPress, 
  onEdit,
  onDelete,
  compact = false 
}) => {
  const renderSourceIcon = () => {
    if (prop.source === 'rented') {
      return (
        <View style={styles.sourceIconContainer}>
          <Clock size={16} color="#EAB308" />
        </View>
      );
    } else if (prop.source === 'borrowed') {
      return (
        <View style={styles.sourceIconContainer}>
          <HandCoins size={16} color="#3B82F6" />
        </View>
      );
    }
    return null;
  };

  const renderStatus = () => {
    const statusStyles = {
      'Cut from Show': {
        container: [styles.statusBadge, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }],
        text: { color: '#DC2626' }
      },
      'Modified Prop': {
        container: [styles.statusBadge, { backgroundColor: 'rgba(234, 179, 8, 0.2)' }],
        text: { color: '#EAB308' }
      },
      'new': {
        container: [styles.statusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }],
        text: { color: '#22C55E' }
      }
    };

    const status = prop.status || 'new';
    const style = statusStyles[status] || statusStyles['new'];

    return (
      <View style={style.container}>
        <Text style={[styles.statusText, style.text]}>{status}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, compact ? styles.compactContainer : null]}
    >
      <View style={styles.header}>
        <View style={styles.locationInfo}>
          <Text style={styles.actScene}>
            Act {prop.act}, Scene {prop.scene}
          </Text>
          <Text style={styles.location}>{prop.location}</Text>
        </View>
        {renderStatus()}
      </View>

      <View style={styles.contentContainer}>
        {prop.imageUrl ? (
          <Image
            source={{ uri: prop.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>
              {prop.name[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.name}>{prop.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {prop.description || 'No description provided'}
          </Text>
          {prop.price && (
            <Text style={styles.price}>${prop.price.toFixed(2)} each</Text>
          )}
          {prop.dimensions && (
            <Text style={styles.dimensions}>
              L: {prop.dimensions.length} × W: {prop.dimensions.width} × H: {prop.dimensions.height} {prop.dimensions.unit}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Edit size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Trash size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#404040',
    marginBottom: 16
  },
  compactContainer: {
    marginBottom: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  actScene: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500'
  },
  location: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500'
  },
  sourceIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(234, 179, 8, 0.2)'
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#000'
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    fontSize: 24,
    color: '#9CA3AF'
  },
  textContainer: {
    flex: 1,
    gap: 4
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB'
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20
  },
  price: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
    marginTop: 4
  },
  dimensions: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4
  },
  actions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  }
}); 