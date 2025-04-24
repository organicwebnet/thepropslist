import React from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../navigation/types';
import type { Show } from '../types';
import { useShows } from '../contexts/ShowsContext';

export default function Shows() {
  const navigation = useNavigation<RootStackScreenProps<'MainTabs'>['navigation']>();
  const { shows, loading, setSelectedShow } = useShows();

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    navigation.navigate('ShowDetail', { 
      show,
      onEdit: (updatedShow) => {
        // TODO: Implement show update logic
        console.log('Update show:', updatedShow);
      }
    });
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
            <Text style={styles.showName}>{item.name}</Text>
            <Text style={styles.showDescription}>{item.description}</Text>
            <View style={styles.showMeta}>
              <Text style={styles.showMetaText}>
                {item.acts.length} Acts • {item.productionCompany}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shows yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first show to get started
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
    borderColor: '#404040'
  },
  showName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 4
  },
  showDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8
  },
  showMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  showMetaText: {
    fontSize: 12,
    color: '#6B7280'
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
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32
  }
}); 