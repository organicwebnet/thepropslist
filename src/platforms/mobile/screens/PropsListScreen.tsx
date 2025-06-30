import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Temporarily disable complex context dependencies for debugging
// import { useFirebase } from '../../../contexts/FirebaseContext.tsx';
// import { useProps } from '../../../hooks/useProps.ts';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { FAB } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
// import PropCard from '../../../shared/components/PropCard/index.tsx';
import { Filters } from '../../../types/props.ts';
import { Prop } from '../../../shared/types/props.ts';
import { FirebaseDocument } from '../../../shared/services/firebase/types.ts';
import { Stack, useRouter } from 'expo-router';
// import { useShows } from '../../../contexts/ShowsContext';
// Temporarily disable LinearGradient for debugging
// import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../../../styles/globalStyles';

type RootStackParamList = {
  PropsList: undefined;
  PropForm: { propId?: string };
  PropDetails: { propId: string };
};

type PropsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PropsList'>;

export function PropsListScreen() {
  console.log('PropsListScreen: Component starting to render');
  
  const navigation = useNavigation<PropsListScreenNavigationProp>();
  // const { service } = useFirebase();
  // const { selectedShow } = useShows();
  const [props, setProps] = useState<FirebaseDocument<Prop>[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Changed to false for debugging
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredProps, setFilteredProps] = useState<Prop[]>([]);
  const router = useRouter();

  console.log('PropsListScreen: State initialized');

  // Temporarily disable complex useEffect for debugging
  /*
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
  */

  const onRefresh = useCallback(() => {
    console.log('PropsListScreen: onRefresh called');
    setRefreshing(true);
    // Simulate refresh completion
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleAddProp = () => {
    console.log('PropsListScreen: handleAddProp called');
    router.navigate({ pathname: '/(tabs)/props/create', params: { showId: 'debug-show' } });
  };

  const handlePropPress = (propId: string) => {
    console.log('PropsListScreen: handlePropPress called with propId:', propId);
    router.navigate(`/(tabs)/props/${propId}`);
  };

  const handleDeleteProp = useCallback(async (propId: string) => {
    console.log('PropsListScreen: handleDeleteProp called with propId:', propId);
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
            console.log('Delete confirmed for propId:', propId);
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  }, []);

  console.log('PropsListScreen: About to render, isLoading:', isLoading, 'error:', error);

  if (isLoading) {
    console.log('PropsListScreen: Rendering loading state');
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color="#2563eb" />
        <Text style={styles.loadingText}>Loading props...</Text>
      </View>
    );
  }

  if (error) {
    console.log('PropsListScreen: Rendering error state');
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => console.log('Retry pressed')}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('PropsListScreen: filteredProps count:', filteredProps?.length || 0);
  console.log('PropsListScreen: first few props:', filteredProps?.slice(0, 3)?.map(p => ({ id: p.id, name: p.name })));

  console.log('PropsListScreen: Rendering main UI');

  // Simplified render without LinearGradient for debugging
  return (
    <View style={[globalStyles.flex1, { backgroundColor: '#1a1a2e' }]}>
      <View style={styles.container}>
        <Text style={styles.debugText}>Props List Screen - Debug Mode</Text>
        <Text style={styles.debugText}>Props count: {filteredProps?.length || 0}</Text>
        
        <FlatList
          data={filteredProps}
          keyExtractor={(item, index) => item?.id || `item-${index}`}
          renderItem={({ item, index }: { item: Prop; index: number }) => {
            console.log('PropsListScreen: Rendering item at index:', index, 'item:', item?.name);
            if (!item) {
              console.warn(`Prop data missing for item at index ${index}`);
              return (
                <View style={styles.propItem}>
                  <Text style={styles.propName}>Missing prop data</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity 
                style={styles.propItem}
                onPress={() => handlePropPress(item.id)}
              >
                <Text style={styles.propName}>{item.name || 'Unnamed Prop'}</Text>
                <Text style={styles.propCategory}>{item.category || 'No category'}</Text>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProp(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
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
              <Text style={styles.emptyText}>No props found</Text>
              <Text style={styles.emptySubtext}>Add your first prop to get started</Text>
            </View>
          }
        />
        
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleAddProp}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Original complex render commented out for debugging
  /*
  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={globalStyles.flex1}
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
          style={styles.fab}
          onPress={handleAddProp}
        >
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
  */
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
  debugText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  propItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  propName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  propCategory: {
    fontSize: 14,
    color: '#94a3b8',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#dc2626',
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
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
}); 
