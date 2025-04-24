import React from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../navigation/types';
import type { Show } from '../types';
import { Box } from 'lucide-react-native';
import { useShows } from '../contexts/ShowsContext';

export default function Packing() {
  const navigation = useNavigation<RootStackScreenProps<'MainTabs'>['navigation']>();
  const { shows, loading, setSelectedShow } = useShows();

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    navigation.navigate('PackingDetail', { show });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shows}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.showCard}
            onPress={() => handleShowPress(item)}
          >
            <View style={styles.iconContainer}>
              <Box size={24} color="#6B7280" />
            </View>
            <View style={styles.content}>
              <Text style={styles.showName}>{item.name}</Text>
              <Text style={styles.showMeta}>
                {item.acts.length} Acts • {item.productionCompany}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Box size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No shows to pack</Text>
            <Text style={styles.emptySubtext}>
              Create a show first to start packing props
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  showCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  content: {
    flex: 1
  },
  showName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E5E7EB',
    marginBottom: 4
  },
  showMeta: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32
  }
}); 