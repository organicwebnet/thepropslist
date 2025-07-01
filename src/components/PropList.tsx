import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useRouter } from 'expo-router';
import { Eye, Edit3, Trash2, Search, ChevronDown, ChevronUp, ExternalLink, Printer, QrCode, Package, PackageCheck, PackageX, History, AlertTriangle, CheckCircle, Theater, Share2, ChevronsUp, Activity, HelpCircle } from 'lucide-react';
import type { PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, DimensionUnit } from '../shared/types/props.ts';
import type { Show } from '../types/index.ts';
import type { Prop } from '../shared/types/props.ts';
import { lifecycleStatusLabels, lifecycleStatusPriority, PropLifecycleStatus, StatusPriority } from '../types/lifecycle.ts';
import { HelpTooltip } from './HelpTooltip.tsx';
import PropCard from '../shared/components/PropCard/index.tsx';
import { View, Text, FlatList, StyleSheet, FlatListProps, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface ExplicitPropListProps {
  props: Prop[];
  onDelete: (id: string) => void;
  onEdit: (prop: Prop) => void;
}

type PropListProps = ExplicitPropListProps & Omit<FlatListProps<Prop>, 'data' | 'renderItem' | 'keyExtractor'>;

export function PropList({ 
  props, 
  onDelete, 
  onEdit,
  ...rest
}: PropListProps) {
  const router = useRouter();
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({});

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Debug scroll event (disabled)
    /*
    console.log('Scroll Event:', {
        contentOffset: event.nativeEvent.contentOffset,
        contentSize: event.nativeEvent.contentSize,
        layoutMeasurement: event.nativeEvent.layoutMeasurement,
    });
    */
  };

  const handleEditPress = (prop: Prop) => {
    if (prop && onEdit) {
      onEdit(prop);
    }
  };

  const renderPropCard = ({ item }: { item: Prop }) => {
    // Original PropCard rendering restored
    return (
      <View style={styles.cardContainer} key={item.id}> 
        <PropCard 
          prop={item} 
          onEditPress={() => handleEditPress(item)}
          onDeletePress={onDelete}
        />
      </View>
    );
  };

  const defaultEmptyList = () => (
     <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No props found.</Text>
      </View>
  );

  return (
    <FlatList
      data={props}
      renderItem={renderPropCard}
      keyExtractor={item => item.id}
      numColumns={1}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={defaultEmptyList}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cardContainer: {
    flex: 1,
    margin: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50, 
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
  }
});

const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'bg-gray-700';
  const priority = lifecycleStatusPriority[status as PropLifecycleStatus] || 'info';
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'low': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-green-500/20 text-green-400'; // info
  }
};

const getStatusLabel = (status: string | undefined): string => {
  if (!status) return 'Unknown';
  return lifecycleStatusLabels[status as PropLifecycleStatus] || status;
};
