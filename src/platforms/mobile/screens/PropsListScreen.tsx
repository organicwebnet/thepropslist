import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFirebase } from '../contexts/FirebaseContext';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { FAB } from 'react-native-paper';
import PropCard from '../../../shared/components/PropCard/index';
import { EnhancedPropList } from '../../../components/EnhancedPropList';
import { Filters } from '../../../types/props';
import { Prop } from '../../../shared/types/props';
import { PropLifecycleStatus, lifecycleStatusLabels } from '../../../types/lifecycle';
import { FirebaseDocument } from '../../../shared/services/firebase/types';
import { PropStatusService } from '../../../shared/services/PropStatusService';
import { doc as fbDoc, writeBatch as rnWriteBatch } from '@react-native-firebase/firestore';
import { Stack, useRouter } from 'expo-router';
import { useShows } from '../../../contexts/ShowsContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAuth } from '../../../contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../../../styles/globalStyles';
import { propCategories } from '../../../shared/types/props';

export function PropsListScreen() {
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
  
  // Bulk selection state
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<PropLifecycleStatus | null>(null);

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

  const handleToggleSelect = (propId: string) => {
    setSelectedProps(prev => {
      const next = new Set(prev);
      if (next.has(propId)) {
        next.delete(propId);
      } else {
        next.add(propId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedProps.size === filteredProps.length) {
      setSelectedProps(new Set());
    } else {
      setSelectedProps(new Set(filteredProps.map(p => p.id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: PropLifecycleStatus) => {
    if (selectedProps.size === 0 || !service || !user) {
      return;
    }

    setIsBulkUpdating(true);
    try {
      // Use firestore instance directly to create batch (for proper typing)
      const firestore = service.getFirestoreReactNativeInstance();
      const batch = rnWriteBatch(firestore);
      const updates: Promise<void>[] = [];
      // Store notification/workflow operations to execute AFTER database updates complete
      const notificationOperations: Array<() => Promise<void>> = [];
      const workflowOperations: Array<() => Promise<{ taskCreated?: string }>> = [];

      for (const propId of selectedProps) {
        const prop = filteredProps.find(p => p.id === propId);
        if (!prop) continue;

        const previousStatus = prop.status as PropLifecycleStatus;
        
        // Skip if status hasn't changed
        if (previousStatus === newStatus) continue;

        // Get data cleanup updates
        const cleanupUpdates = PropStatusService.getDataCleanupUpdates(newStatus);
        
        // Update prop status with cleanup (get doc ref and use batch.update)
        const propRef = fbDoc(firestore, 'props', propId);
        batch.update(propRef, {
          status: newStatus,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...cleanupUpdates,
        });

        // Create enhanced status history entry
        const statusUpdate = PropStatusService.createStatusHistoryEntry({
          prop,
          previousStatus,
          newStatus,
          updatedBy: user.uid,
          firebaseService: service as any,
        });

        updates.push(
          service.addDocument(`props/${propId}/statusHistory`, statusUpdate)
            .then(() => {}) // Convert to void
        );

        // Store notification operation to execute AFTER database updates complete
        notificationOperations.push(() =>
          PropStatusService.sendStatusChangeNotifications({
            prop: prop as any, // Type compatibility
            previousStatus,
            newStatus,
            updatedBy: user.uid,
            firebaseService: service as any,
            notifyTeam: true,
          }).catch(err => {
            console.warn(`Failed to send notification for prop ${propId}:`, err);
          })
        );

        // Store workflow operation to execute AFTER database updates complete
        workflowOperations.push(() =>
          PropStatusService.handleAutomatedWorkflows({
            prop: prop as any, // Type compatibility
            previousStatus,
            newStatus,
            updatedBy: user.uid,
            firebaseService: service as any,
          }).catch(err => {
            console.warn(`Failed to run workflows for prop ${propId}:`, err);
            return { taskCreated: undefined };
          })
        );
      }

      // Execute all database updates FIRST (batch commit + status history)
      await batch.commit();
      await Promise.all(updates);

      // NOW execute notifications and workflows AFTER database is in consistent state
      // Execute in background (don't wait) but only after updates complete
      const notificationPromises = notificationOperations.map(op => op());
      const workflowPromises = workflowOperations.map(op => op());
      
      Promise.all([...notificationPromises, ...workflowPromises]).catch(err => {
        console.warn('Some notifications or workflows failed:', err);
      });

      Alert.alert('Success', `Updated status for ${selectedProps.size} prop(s)`);
      setSelectedProps(new Set());
      setIsSelectionMode(false);
      setShowBulkStatusModal(false);
      setSelectedBulkStatus(null);
    } catch (err: any) {
      console.error('Error bulk updating props:', err);
      Alert.alert('Error', `Failed to update props: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };

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
              editable={!isSelectionMode}
            />
            {searchQuery.length > 0 && !isSelectionMode && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="clear" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          {!isSelectionMode ? (
            <>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setShowFilters(true)}
              >
                <MaterialIcons name="filter-list" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.selectionButton}
                onPress={() => setIsSelectionMode(true)}
              >
                <MaterialIcons name="check-circle-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.cancelSelectionButton}
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedProps(new Set());
              }}
            >
              <MaterialIcons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bulk Actions Bar */}
        {isSelectionMode && selectedProps.size > 0 && (
          <View style={styles.bulkActionsBar}>
            <View style={styles.bulkActionsContent}>
              <Text style={styles.bulkActionsText}>
                {selectedProps.size} selected
              </Text>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={handleSelectAll}
              >
                <Text style={styles.selectAllText}>
                  {selectedProps.size === filteredProps.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkStatusButton}
                onPress={() => setShowBulkStatusModal(true)}
                disabled={isBulkUpdating}
              >
                <MaterialIcons name="edit" size={18} color="#ffffff" />
                <Text style={styles.bulkStatusButtonText}>Change Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            {isSelectionMode ? (
              <FlatList
                data={filteredProps}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.selectablePropCard,
                      selectedProps.has(item.id) && styles.selectablePropCardSelected,
                    ]}
                    onPress={() => handleToggleSelect(item.id)}
                  >
                    <View style={styles.propCardCheckbox}>
                      <MaterialIcons
                        name={selectedProps.has(item.id) ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={selectedProps.has(item.id) ? '#2563eb' : '#94a3b8'}
                      />
                    </View>
                    <View style={styles.propCardContent}>
                      <Text style={styles.propCardName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.propCardDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      <Text style={styles.propCardStatus}>
                        Status: {item.status?.replace(/_/g, ' ') || 'No status'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptySubtext}>No props found</Text>
                  </View>
                )}
              />
            ) : (
              <EnhancedPropList
                props={filteredProps}
                showId={selectedShow?.id}
                onPropPress={(prop) => handlePropPress(prop.id)}
                onEdit={(prop) => router.navigate({ pathname: '/(tabs)/props/create', params: { propId: prop.id } })}
                onDelete={(prop) => handleDeleteProp(prop.id)}
              />
            )}
            {!isSelectionMode && (
              <TouchableOpacity 
                style={styles.fab}
                onPress={handleAddProp}
              >
                <MaterialIcons name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
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

      {/* Bulk Status Update Modal */}
      <Modal
        visible={showBulkStatusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBulkStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status for {selectedProps.size} Prop(s)</Text>
              <TouchableOpacity onPress={() => setShowBulkStatusModal(false)}>
                <MaterialIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bulkStatusModalContent}>
              <Text style={styles.bulkStatusModalText}>
                Select the new status for all selected props:
              </Text>
              <FlatList
                data={Object.keys(lifecycleStatusLabels) as PropLifecycleStatus[]}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isSelected = item === selectedBulkStatus;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.bulkStatusOption,
                        isSelected && styles.bulkStatusOptionSelected,
                      ]}
                      onPress={() => setSelectedBulkStatus(item)}
                    >
                      <Text
                        style={[
                          styles.bulkStatusOptionText,
                          isSelected && styles.bulkStatusOptionTextSelected,
                        ]}
                      >
                        {lifecycleStatusLabels[item]}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check" size={20} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.bulkStatusList}
              />
              {isBulkUpdating && (
                <View style={styles.bulkUpdatingIndicator}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.bulkUpdatingText}>Updating props...</Text>
                </View>
              )}
              <View style={styles.bulkStatusModalActions}>
                <TouchableOpacity
                  style={styles.bulkStatusCancelButton}
                  onPress={() => {
                    setShowBulkStatusModal(false);
                    setSelectedBulkStatus(null);
                  }}
                  disabled={isBulkUpdating}
                >
                  <Text style={styles.bulkStatusCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.bulkStatusConfirmButton,
                    (!selectedBulkStatus || isBulkUpdating) && styles.bulkStatusConfirmButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (selectedBulkStatus) {
                      await handleBulkStatusUpdate(selectedBulkStatus);
                      setSelectedBulkStatus(null);
                    }
                  }}
                  disabled={!selectedBulkStatus || isBulkUpdating}
                >
                  <Text style={styles.bulkStatusConfirmText}>Update Status</Text>
                </TouchableOpacity>
              </View>
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
  // Bulk selection styles
  selectionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelSelectionButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  bulkActionsBar: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bulkActionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkActionsText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectAllText: {
    color: '#60a5fa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bulkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  bulkStatusButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectablePropCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectablePropCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  propCardCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  propCardContent: {
    flex: 1,
  },
  propCardName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  propCardDescription: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  propCardStatus: {
    color: '#60a5fa',
    fontSize: 12,
  },
  bulkStatusModalContent: {
    padding: 20,
    maxHeight: 500,
  },
  bulkStatusModalText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  bulkStatusList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  bulkStatusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bulkStatusOptionSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    borderColor: '#2563eb',
  },
  bulkStatusOptionText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  bulkStatusOptionTextSelected: {
    fontWeight: '600',
  },
  bulkStatusModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  bulkStatusCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  bulkStatusCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  bulkStatusConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  bulkStatusConfirmButtonDisabled: {
    opacity: 0.5,
  },
  bulkStatusConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bulkUpdatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  bulkUpdatingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
}); 
