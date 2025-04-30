import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Package, Trash2, Theater, Edit, AlertTriangle, Calendar, FileText, Share2, ChevronsUp, Activity, HelpCircle } from 'lucide-react';
import type { PropFormData, PropCategory, propCategories, PropImage, DigitalAsset, DimensionUnit } from '@shared/types/props';
import type { Show } from '@/types';
import type { Prop } from '@shared/types/props';
import { lifecycleStatusLabels, lifecycleStatusPriority, PropLifecycleStatus, StatusPriority } from '@/types/lifecycle';
import { HelpTooltip } from './HelpTooltip';
import PropCard from '@/shared/components/PropCard';
import { View, Text, FlatList, StyleSheet, FlatListProps } from 'react-native';

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

  const handleEditPress = (propId: string) => {
    const propToEdit = props.find(p => p.id === propId);
    if (propToEdit && onEdit) {
      onEdit(propToEdit);
    }
  };

  const renderPropCard = ({ item }: { item: Prop }) => (
    <View style={styles.cardContainer}> 
      <PropCard 
        prop={item} 
        onEditPress={handleEditPress}
        onDeletePress={onDelete}
      />
    </View>
  );

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