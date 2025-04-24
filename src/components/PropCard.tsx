import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import type { Prop } from '../types';
import { Clock, HandCoins } from 'lucide-react-native';

interface PropCardProps {
  prop: Prop;
  onPress: () => void;
  compact?: boolean;
}

export const PropCard: React.FC<PropCardProps> = ({ prop, onPress, compact = false }) => {
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

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, compact ? styles.compactContainer : null]}
    >
      {renderSourceIcon()}
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
          <Text style={styles.details}>
            Act {prop.act}, Scene {prop.scene} • {prop.category}
          </Text>
          <View style={styles.metaContainer}>
            {prop.quantity > 1 && (
              <Text style={[styles.meta, styles.quantityText]}>
                Qty: {prop.quantity}
              </Text>
            )}
            {prop.weight && (
              <Text style={styles.meta}>
                {prop.weight} {prop.weightUnit}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#404040',
    marginBottom: 16
  },
  compactContainer: {
    marginBottom: 8
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
    alignItems: 'center',
    gap: 16,
    flex: 1
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#000'
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
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
    flex: 1
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E5E7EB'
  },
  details: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  meta: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  quantityText: {
    marginRight: 8
  }
}); 