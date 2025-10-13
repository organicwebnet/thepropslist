import React, { useState, useEffect, useMemo } from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Prop } from '../shared/types/props.ts';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
// Temporarily comment out unused import to suppress linter error
// import defaultImage from '../assets/images/prop-placeholder.png'; 
import { PropLifecycleStatus } from '../types/lifecycle.ts';
import { Link } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { HelpTooltip } from './HelpTooltip.tsx';

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
          <Feather name="clock" size={16} color="#EAB308" />
        </View>
      );
    } else if (prop.source === 'borrowed') {
      return (
        <View style={styles.sourceIconContainer}>
          <MaterialCommunityIcons name="hand-coin" size={16} color="#3B82F6" />
        </View>
      );
    }
    return null;
  };

  const renderStatus = () => {
    type HandledStatus = 'Cut from Show' | 'Modified Prop' | 'new';
    
    const statusStyles: Record<HandledStatus, { container: any; text: any }> = {
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

    const statusKey: HandledStatus = 
      prop.status && Object.prototype.hasOwnProperty.call(statusStyles, prop.status) 
      ? prop.status as HandledStatus 
      : 'new';

    const style = statusStyles[statusKey];

    return (
      <View style={style.container}>
        <Text style={[styles.statusText, style.text]}>{prop.status || statusKey}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={compact ? styles.compactContainer : { marginBottom: 16 }}
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
        {prop.images?.[0]?.url ? (
          <Image
            source={{ uri: prop.images[0].url }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            {/* <Image source={defaultImage} style={styles.image} /> */}
            <Text style={styles.placeholderText}>
              {prop.name[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.name}>{prop.name}</Text>
          <Text style={styles.description} /* numberOfLines={2} */>
            {prop.description || 'No description provided'}
          </Text>
          {prop.price && (
            <Text style={styles.price}>£{prop.price.toFixed(2)} each</Text>
          )}
          {(prop.length || prop.width || prop.height) && (
            <Text style={styles.dimensions}>
              {[prop.length && `L: ${prop.length}`, 
                prop.width && `W: ${prop.width}`, 
                prop.height && `H: ${prop.height}`].filter(Boolean).join(' × ')}
              {prop.unit && ` ${prop.unit}`}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Feather name="edit" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Feather name="trash" size={20} color="#9CA3AF" />
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
    backgroundColor: 'purple',
  },
  name: {
    color: '#FFFF00',
    backgroundColor: 'green',
  },
  description: {
    color: '#9CA3AF',
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
