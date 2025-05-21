import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFirebase } from '../../../contexts/FirebaseContext';
import { useProps } from '../../../hooks/useProps';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { FAB } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import PropCard from '../../../shared/components/PropCard';
import { Filters } from '../../../types';
import { Prop } from '@/shared/types/props';
import { FirebaseDocument } from '../../../shared/services/firebase/types';

type RootStackParamList = {
  PropsList: undefined;
  PropForm: { propId?: string };
  PropDetails: { propId: string };
};

type PropsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PropsList'>;

export function PropsListScreen() {
  const navigation = useNavigation<PropsListScreenNavigationProp>();
  const { service } = useFirebase();
  const [props, setProps] = useState<FirebaseDocument<Prop>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = service.listenToCollection<Prop>(
      'props',
      (documents) => {
        setProps(documents);
        setError(null);
        setIsLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setError('Failed to sync props. Please check your connection.');
        setIsLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [service]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The refresh will be handled by the listener
  }, []);

  const handleAddProp = () => {
    navigation.navigate('PropForm', {});
  };

  const handlePropPress = (propId: string) => {
    navigation.navigate('PropDetails', { propId });
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
    <SafeAreaView style={styles.container}>
      <FlatList
        data={props}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: FirebaseDocument<Prop> }) => {
          const propData = item.data;
          if (!propData) {
            console.warn(`Prop data missing for document ID: ${item.id}`);
            return null;
          }
          return (
            <PropCard 
              prop={{ ...propData, id: item.id }}
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
            tintColor="#2563eb"
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
        style={styles.addButton}
        onPress={handleAddProp}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
}); 