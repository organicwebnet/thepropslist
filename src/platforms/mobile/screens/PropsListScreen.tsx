import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFirebase } from '../../../contexts/FirebaseContext.tsx';
import { useProps } from '../../../hooks/useProps.ts';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { FAB } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import PropCard from '../../../shared/components/PropCard/index.tsx';
import { Filters } from '../../../types/props.ts';
import { Prop } from '../../../shared/types/props.ts';
import { FirebaseDocument } from '../../../shared/services/firebase/types.ts';
import { Stack, useRouter } from 'expo-router';
import { useShows } from '../../../contexts/ShowsContext';
import LinearGradient from 'react-native-linear-gradient';

type RootStackParamList = {
  PropsList: undefined;
  PropForm: { propId?: string };
  PropDetails: { propId: string };
};

type PropsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PropsList'>;

export function PropsListScreen() {
  const navigation = useNavigation<PropsListScreenNavigationProp>();
  const { service } = useFirebase();
  const { selectedShow } = useShows();
  const [props, setProps] = useState<FirebaseDocument<Prop>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredProps, setFilteredProps] = useState<Prop[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!service || !selectedShow?.id || typeof selectedShow.id !== 'string' || !selectedShow.id.trim()) {
      setProps([]);
      setFilteredProps([]);
      setIsLoading(false);
      setError('Please select a show to view props.');
      return;
    }
    setIsLoading(true);
    // Helper to normalize Firebase data to the expected Prop shape
    function normalizeProp(doc: FirebaseDocument<any>) {
      const data = doc.data || {};
      return {
        id: doc.id,
        userId: data.userId || '',
        showId: data.showId || (selectedShow ? selectedShow.id : ''),
        name: data.name || 'Unnamed Prop',
        description: data.description || '',
        category: data.category || 'Uncategorized',
        price: typeof data.price === 'number' ? data.price : 0,
        quantity: typeof data.quantity === 'number' ? data.quantity : 1,
        status: data.status || 'unknown',
        images: Array.isArray(data.images) ? data.images : [],
        imageUrl: data.imageUrl || '',
        source: data.source || 'owned',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        // Add any other fields from src/shared/types/props.ts as needed, with sensible defaults
        ...data,
      };
    }
    const unsubscribe = service.listenToCollection<Prop>(
      'props',
      (documents: FirebaseDocument<Prop>[]) => {
        const propsData = documents.map(normalizeProp);
        setProps(documents);
        setFilteredProps(propsData);
        setError(null);
        setIsLoading(false);
        setRefreshing(false);
      },
      (error: Error) => {
        console.error("Error fetching props:", error);
        setError(error.message);
        setIsLoading(false);
        setRefreshing(false);
      },
      { where: [['showId', '==', selectedShow.id]] }
    );
    return () => unsubscribe();
  }, [service, selectedShow?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The refresh will be handled by the listener
  }, []);

  const handleAddProp = () => {
    router.push({ pathname: '/(tabs)/props/create', params: { showId: selectedShow?.id } });
  };

  const handlePropPress = (propId: string) => {
    router.push(`/props/${propId}`);
  };

  const handleDeleteProp = useCallback(async (propId: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this prop?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await service.deleteDocument('props', propId);
              console.log(`Prop ${propId} deleted successfully`);
            } catch (err) {
              console.error('Error deleting prop:', err);
              setError('Failed to delete prop. Please try again.');
              Alert.alert('Error', 'Could not delete prop. Please try again.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  }, [service]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color="#2563eb" />
        <Text style={styles.loadingText}>Loading props...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => service.offline().enableSync().catch(console.error)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
          data={filteredProps}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Prop }) => {
            if (!item) {
              console.warn(`Prop data missing for item`);
              return null;
            }
            return (
              <PropCard 
                prop={item}
                onEditPress={() => handlePropPress(item.id)}
                onDeletePress={() => handleDeleteProp(item.id)}
              />
            );
          }}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563eb']}
             
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={48} color="#94a3b8" />
              <Text style={styles.emptySubtext}>Add your first prop to get started</Text>
            </View>
          }
        />
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddProp}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  listContentContainer: {
    padding: 16,
  },
  propCard: {
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modal: { backgroundColor: 'rgba(30,30,30,0.7)' },
  button: { backgroundColor: 'rgba(30,30,30,0.7)' },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 