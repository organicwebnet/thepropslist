import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFirebase } from '../contexts/FirebaseContext';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { FAB } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import PropCard from '../../../shared/components/PropCard/index';
import { EnhancedPropList } from '../../../components/EnhancedPropList';
import { Filters } from '../../../types/props';
import { Prop } from '../../../shared/types/props';
import { FirebaseDocument } from '../../../shared/services/firebase/types';
import { Stack, useRouter } from 'expo-router';
import { useShows } from '../../../contexts/ShowsContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAuth } from '../../../contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../../../styles/globalStyles';
import { propCategories } from '../../../shared/types/props';

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
  const { canViewAllProps } = usePermissions();
  const { user } = useAuth();
  const [props, setProps] = useState<FirebaseDocument<Prop>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredProps, setFilteredProps] = useState<Prop[]>([]);
  const router = useRouter();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Helper to normalize Firebase data to the expected Prop shape
  const normalizeProp = useCallback((doc: FirebaseDocument<any>) => {
    const data = doc.data || {};
    return {
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
      // Ensure the real Firebase ID is always used (never overwritten by data.id)
      id: doc.id,
    };
  }, [selectedShow?.id]);

  useEffect(() => {
    if (!service || !selectedShow?.id || typeof selectedShow.id !== 'string' || !selectedShow.id.trim()) {
      setProps([]);
      setFilteredProps([]);
      setIsLoading(false);
      setError('Please select a show to view props.');
      return;
    }
    setIsLoading(true);
    
    // Build query based on permissions
    // If user can view all props, show all props for the show
    // Otherwise, only show props owned by the user
    // Note: Props use 'userId' field, not 'ownerId'
    const whereClauses: any[] = [['showId', '==', selectedShow.id]];
    if (!canViewAllProps && user?.uid) {
      whereClauses.push(['userId', '==', user.uid]);
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
      { where: whereClauses }
    );
    return () => unsubscribe();
  }, [service, selectedShow?.id, canViewAllProps, user?.uid]);

  // Apply filters to props
  useEffect(() => {
    if (!props.length) {
      setFilteredProps([]);
      return;
    }

    const propsData = props.map(normalizeProp);
    const filtered = propsData.filter((prop) => {
      const matchesSearch = 
        searchQuery.trim() === '' ||
        prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prop.description && prop.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || prop.category === selectedCategory;
      const matchesStatus = !selectedStatus || prop.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
    
    setFilteredProps(filtered);
  }, [props, searchQuery, selectedCategory, selectedStatus, normalizeProp]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The refresh will be handled by the listener
  }, []);

  const handleAddProp = () => {
    router.navigate({ pathname: '/(tabs)/props/create', params: { showId: selectedShow?.id } });
  };

  const handlePropPress = (propId: string) => {
    router.navigate(`/(tabs)/props/${propId}`);
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
      style={globalStyles.flex1}
    >
      <View style={styles.container}>
        {/* Search and Filter Header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search props..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="clear" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <MaterialIcons name="filter-list" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {!selectedShow ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="theater-comedy" size={64} color="#ffffff" />
            <Text style={styles.noShowTitle}>No Show Selected</Text>
            <Text style={styles.noShowMessage}>
              Please select a show or create a new one to view and manage props.
            </Text>
            <TouchableOpacity 
              style={styles.createShowButton}
              onPress={() => router.navigate('/(tabs)/shows/create')}
            >
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.createShowButtonText}>Create Show</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <EnhancedPropList
              props={filteredProps}
              showId={selectedShow?.id}
              onPropPress={(prop) => navigation.navigate('PropDetails', { propId: prop.id })}
              onEdit={(prop) => navigation.navigate('PropForm', { propId: prop.id })}
              onDelete={(prop) => handleDeleteProp(prop.id)}
            />
            <TouchableOpacity 
              style={styles.fab}
              onPress={handleAddProp}
            >
              <MaterialIcons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Props</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <MaterialIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedCategory && styles.filterOptionActive]}
                  onPress={() => setSelectedCategory('')}
                >
                  <Text style={[styles.filterOptionText, !selectedCategory && styles.filterOptionTextActive]}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {propCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.filterOptionText, selectedCategory === category && styles.filterOptionTextActive]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedStatus && styles.filterOptionActive]}
                  onPress={() => setSelectedStatus('')}
                >
                  <Text style={[styles.filterOptionText, !selectedStatus && styles.filterOptionTextActive]}>
                    All Statuses
                  </Text>
                </TouchableOpacity>
                {['available', 'in-use', 'maintenance', 'retired', 'unknown'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterOption, selectedStatus === status && styles.filterOptionActive]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text style={[styles.filterOptionText, selectedStatus === status && styles.filterOptionTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedCategory('');
                  setSelectedStatus('');
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
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
  // Search and Filter Styles
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterOptionText: {
    color: '#ffffff',
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // No Show Selected Styles
  noShowTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noShowMessage: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  createShowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createShowButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
