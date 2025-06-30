import React from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../navigation/types.ts';
import type { Show } from '../types/index.ts';
import { Box } from 'lucide-react-native';
import { useShows } from '../contexts/ShowsContext.tsx';
import { usePacking } from '../hooks/usePacking.ts';
import LinearGradient from 'react-native-linear-gradient';

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
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
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
                <View style={styles.showItemDetails}>
                  <Text style={styles.showItemTitle}>{item.name}</Text>
                  <Text style={styles.showItemSubtitle}>
                    {item.acts?.length || 0} Acts • {item.productionCompany}
                  </Text>
                </View>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(30,30,30,0.7)',
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
  showItemDetails: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  showItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E7EB',
    marginRight: 4
  },
  showItemSubtitle: {
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
  },
  anotherContainer: {
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
}); 
