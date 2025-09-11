import React from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import type { Show } from '../../src/shared/services/firebase/types';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useShows } from '../../src/contexts/ShowsContext';
import LinearGradient from 'react-native-linear-gradient';

export default function PackingScreen() {
  const router = useRouter();
  const { shows, loading, setSelectedShow } = useShows();

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    // Navigate to packing list for the selected show  
    router.navigate({
      pathname: '/(tabs)/packing/list',
      params: { showId: show.id }
    } as any);
  };

  const handleCreateBox = () => {
    router.navigate('/(tabs)/packing/createBox');
  };

  const handleFindContainer = (show?: Show) => {
    if (show) {
      setSelectedShow(show);
    }
    router.navigate('/(tabs)/packing/find');
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c084fc" />
            <Text style={styles.loadingText}>Loading shows...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Packing</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleFindContainer()}>
              <MaterialCommunityIcons name="qrcode-scan" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleCreateBox}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={shows}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.showCard}
              onPress={() => handleShowPress(item)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="cube" size={24} color="#c084fc" />
              </View>
              <View style={styles.content}>
                <Text style={styles.showName}>{item.name}</Text>
                <View style={styles.showItemDetails}>
                  <Text style={styles.showItemSubtitle}>
                    {item.acts?.length || 0} Acts • {item.productionCompany || 'No production company'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>No shows to pack</Text>
              <Text style={styles.emptySubtext}>
                Create a show first to start packing props
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#c084fc',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: 'rgba(192, 132, 252, 0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  showCard: {
    backgroundColor: 'rgba(30,30,30,0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  showName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  showItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  showItemSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  rowIconButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
}); 
