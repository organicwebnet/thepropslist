import React, { useMemo } from 'react';
import { FlatList, FlatListProps, View, Text, StyleSheet } from 'react-native';
import { Prop } from '../shared/types/props';
import { UserProfile } from '../shared/types/auth';
import { RoleBasedPropCard } from './RoleBasedPropCard';
import { useRoleBasedDataView } from '../shared/hooks/useRoleBasedDataView';

interface RoleBasedPropListProps extends Omit<FlatListProps<Prop>, 'data' | 'renderItem' | 'keyExtractor'> {
  props: Prop[];
  user: UserProfile | null;
  showId?: string;
  onPropPress?: (prop: Prop) => void;
  onQuickAction?: (action: string, prop: Prop) => void;
}

export function RoleBasedPropList({ 
  props, 
  user, 
  showId,
  onPropPress,
  onQuickAction,
  ...rest 
}: RoleBasedPropListProps) {
  const { dataView, loading, error } = useRoleBasedDataView(user, showId);

  // Memoize the filtered props to avoid unnecessary re-renders
  const filteredProps = useMemo(() => {
    if (!user || !dataView) return props;
    
    // For now, return all props - filtering happens at the card level
    // In the future, we could add list-level filtering here
    return props;
  }, [props, user, dataView]);

  const renderPropCard = ({ item }: { item: Prop }) => {
    return (
      <View style={styles.cardContainer}>
        <RoleBasedPropCard
          prop={item}
          user={user}
          showId={showId}
          onPress={onPropPress}
          onQuickAction={onQuickAction}
        />
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading...' : error ? `Error: ${error}` : 'No props found.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading role-based view...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading view: {error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredProps}
      renderItem={renderPropCard}
      keyExtractor={item => item.id}
      numColumns={1}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmptyComponent}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 8,
  },
  cardContainer: {
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
  },
});
