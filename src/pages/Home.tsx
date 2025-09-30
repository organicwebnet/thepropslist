import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, ScrollView, Button, FlatList, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Link, useRouter, Stack } from 'expo-router';
import { PropList } from '../components/PropList.tsx';
import type { RootStackParamList, RootStackScreenProps } from '../navigation/types.ts';
import type { Filters } from '../types/props.ts';
import type { Prop } from '../shared/types/props.ts';
import { Plus, PlusCircle } from 'phosphor-react-native';
import { useLayoutEffect } from 'react';
import { useProps } from '../hooks/useProps.ts';
import { useShows } from '../contexts/ShowsContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import type { Show } from '../types/index.ts';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { useTranslation } from '../hooks/useTranslation';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export function Home({ navigation }: RootStackScreenProps<'Home'>) {
  // const [filters, setFilters] = React.useState<Filters>({
  //   search: '',
  // });
  const [showId, /* setShowId */] = React.useState<string | null>(null);
  const { t } = useTranslation(); // setShowId appears unused
  const [isLoadingShows, setIsLoadingShows] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  // const [showData, setShowData] = useState<Show | null>(null); // showData appears unused
  const { user, loading: authLoading } = useAuth();
  const { service, isInitialized, error: firebaseError } = useFirebase();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentShowId, setCurrentShowId] = useState<string | null>(null);
  const { props, loading: propsLoading, error: propsError, getUpcomingDeliveries } = useProps(currentShowId || undefined); // addProp appears unused

  const loadShowsAndSetFirst = useCallback(async () => {
    if (user && service && isInitialized) {
      setIsLoadingShows(true);
      try {
        const showDocuments = await service.getDocuments<{ name: string }>('shows', { limit: 1 });
        if (showDocuments.length > 0) {
          const firstShowDoc = showDocuments[0];
          setCurrentShowId(firstShowDoc.id);
        } else {
          setCurrentShowId(null);
        }
        setConnectionError(null);
      } catch (err) {
        console.error("Error fetching shows list:", err);
        setConnectionError(err instanceof Error ? err.message : 'Failed to load shows');
        setCurrentShowId(null);
      }
      setIsLoadingShows(false);
    }
  }, [user, service, isInitialized, setCurrentShowId, setIsLoadingShows, setConnectionError]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setConnectionError(null);
    if (!currentShowId && user && service && isInitialized) {
      await loadShowsAndSetFirst();
    }
    setIsRefreshing(false);
  }, [currentShowId, user, service, isInitialized, loadShowsAndSetFirst]);

  useEffect(() => {
    loadShowsAndSetFirst();
  }, [loadShowsAndSetFirst]);

  // Fetch Show data when showId (for detailed display, not the props list) changes
  useEffect(() => {
    if (showId && service && isInitialized) { // Check service and isInitialized
      const fetchShow = async () => {
        try {
          // Corrected: Use service.getDocument
          const showDocument = await service.getDocument('shows', showId);
          if (showDocument && showDocument.data) {
            // const data = showDocument.data;
            // setShowData({
            //   id: showDocument.id,
            //   ...data,
            //   // Ensure createdAt and updatedAt are valid. Fallback to current date string if not present.
            //   createdAt: data.createdAt || new Date().toISOString(), 
            //   updatedAt: data.updatedAt || new Date().toISOString(),
            // } as Show);
          } else {
            console.error("No such document for showId:", showId);
            // setShowData(null);
          }
        } catch (e) {
          console.error("Error getting specific show document:", e);
          // setShowData(null);
        }
      };
      fetchShow();
    } else {
      // setShowData(null);
    }
  }, [showId, service, isInitialized]); // Added showId and isInitialized to dependency array

  // Placeholder handlers for PropList (implement properly if needed)
  const handleNavigateToEditProp = (prop: Prop) => {
    // Example navigation:
    // navigation.navigate('EditProp', { prop });
  };

  const handleDeleteProp = (propId: string) => {
    // Example deletion logic (needs service method):
    // Alert.alert('Delete Prop', 'Are you sure?', [
    //   { text: 'Cancel', style: 'cancel' },
    //   { text: 'Delete', style: 'destructive', onPress: async () => { 
    //     // await service.deleteProp(propId); 
    //     // // Refresh props list 
    //   }}
    // ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('ShowDetail', { 
            show: {
              id: showId || '',
              name: '',
              description: '',
              acts: [],
              userId: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              collaborators: [],
              stageManager: '',
              stageManagerEmail: '',
              propsSupervisor: '',
              propsSupervisorEmail: '',
              productionCompany: '',
              productionContactName: '',
              productionContactEmail: '',
              venues: [],
              isTouringShow: false,
              contacts: [],
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString()
            }
          })}
          style={styles.headerButton}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showId]);

  const handlePropPress = (prop: Prop) => {
    navigation.navigate('PropDetail', { prop });
  };

  const handleDeleteShow = async (showId: string, showName: string) => {
    if (service) {
      Alert.alert('Delete Show', `Are you sure you want to delete "${showName}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await service.deleteShow(showId);
            // setShowData(null);
            // Optionally navigate away or show a success message
          } catch (error) {
            console.error("Error deleting show:", error);
            Alert.alert('Error', 'Could not delete show.');
          }
        } },
      ]);
    } else {
              console.error("Attempted to delete show without service or showId/Name");
    }
  };

  // --- Navigation Handlers ---
  const handleNavigateToShowDetails = (show: Show) => {
    // Ensure show has the necessary fields before navigating
    const showWithDefaults: Show = {
      ...show,
      createdAt: show.createdAt || new Date().toISOString(),
      updatedAt: show.updatedAt || new Date().toISOString(), // Add default updatedAt
      collaborators: show.collaborators || [],
      venues: show.venues || [],
      contacts: show.contacts || [],
      acts: show.acts || [],
    };
    navigation.navigate('ShowDetail', { show: showWithDefaults });
  };

  const handleNavigateToPackingList = (show: Show) => {
    // Ensure show has the necessary fields before navigating
    const showWithDefaults: Show = {
      ...show,
      createdAt: show.createdAt || new Date().toISOString(),
      updatedAt: show.updatedAt || new Date().toISOString(), // Add default updatedAt
      collaborators: show.collaborators || [],
      venues: show.venues || [],
      contacts: show.contacts || [],
      acts: show.acts || [],
    };
    navigation.navigate('PackingDetail', { show: showWithDefaults });
  };

  const deleteShow = async (showIdToDelete: string) => {
    if (!user || !service || !isInitialized) return;
    
    // Add test button for debugging
    Alert.alert(
      t('show.delete.confirm'),
      t('show.delete.warning'),
      [
        {
          text: t('show.delete.cancel'),
          style: "cancel"
        },
        {
          text: "Run Diagnostic",
          onPress: async () => {
            try {
              const { ShowDeletionDiagnostic } = await import('../lib/diagnosticTool');
              const results = await ShowDeletionDiagnostic.runFullDiagnostic(showIdToDelete, service, { currentUser: user });
              ShowDeletionDiagnostic.logResults(results);
              
              const failedSteps = results.filter(r => !r.success);
              if (failedSteps.length > 0) {
                const errorMessage = failedSteps.map(s => `${s.step}: ${s.error}`).join('\n');
                Alert.alert('Diagnostic Failed', errorMessage);
              } else {
                Alert.alert('Diagnostic Passed', 'All tests passed! Show deletion should work.');
              }
            } catch (error) {
              console.error("Diagnostic error:", error);
              Alert.alert('Diagnostic Error', error.message);
            }
          }
        },
        {
          text: "Direct Delete",
          onPress: async () => {
            try {
              console.log('🧪 Attempting direct document deletion...');
              await service.deleteDocument('shows', showIdToDelete);
              if (currentShowId === showIdToDelete) {
                setCurrentShowId(null);
              }
              Alert.alert('Success', 'Show deleted successfully using direct method!');
            } catch (error) {
              console.error("Direct deletion error:", error);
              Alert.alert('Direct Delete Failed', `Error: ${error.message}`);
            }
          }
        },
        {
          text: t('show.delete.proceed'),
          onPress: async () => {
            try {
              await service.deleteShow(showIdToDelete);
              if (currentShowId === showIdToDelete) {
                setCurrentShowId(null);
              }
              Alert.alert(t('show.delete.success'), t('show.delete.success'));
            } catch (error) {
              console.error("Error deleting show:", error);
              Alert.alert(t('common.error'), t('show.delete.error'));
            }
          }
        }
      ]
    );
  };

  // The useEffect for re-fetching props when currentShowId changes is implicitly handled by useProps hook dependency array.
  // No explicit fetchProps call needed here if currentShowId is a dependency of useProps.

  // Fetch Show data (for a potentially different showId, for a different part of UI)
  const [displayShowId, setDisplayShowId] = useState<string | null>(null); // Example: if another part of UI shows details of a show clicked from a list
  const [displayShowData, setDisplayShowData] = useState<Show | null>(null);

  useEffect(() => {
    if (displayShowId && service && isInitialized) {
      const fetchShowDetail = async () => {
        try {
          const showDoc = await service.getDocument('shows', displayShowId);
          if (showDoc && showDoc.data) {
            setDisplayShowData({ id: showDoc.id, ...showDoc.data } as Show); // Assuming Show type matches
          } else {
            setDisplayShowData(null);
          }
        } catch (e) {
          console.error("Error getting specific show document:", e);
          setDisplayShowData(null);
        }
      };
      fetchShowDetail();
    } else {
      setDisplayShowData(null);
    }
  }, [displayShowId, service, isInitialized]);

  if (authLoading || isLoadingShows) {
    return <ActivityIndicator size="large" className="mt-20" />;
  }

  if (firebaseError) {
    return <Text className="text-red-500 text-center mt-10">Error initializing Firebase: {firebaseError.message}</Text>;
  }
  if (connectionError) {
    return <Text className="text-red-500 text-center mt-10">Connection Error: {connectionError}</Text>;
  }

  if (!user) {
    return <Text className="text-center mt-10">Please log in to view props.</Text>;
  }

  if (propsError) {
    return <Text className="text-red-500 text-center mt-10">Error loading props: {propsError.message}</Text>;
  }

  if (!currentShowId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>No shows found. Create a show to get started.</Text>
        <TouchableOpacity 
          style={[styles.button, styles.addShowButton]}
          onPress={() => navigation.navigate('ShowDetail', { 
            show: {
              id: '',
              name: '',
              description: '',
              acts: [],
              userId: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              collaborators: [],
              stageManager: '',
              stageManagerEmail: '',
              propsSupervisor: '',
              propsSupervisorEmail: '',
              productionCompany: '',
              productionContactName: '',
              productionContactEmail: '',
              venues: [],
              isTouringShow: false,
              contacts: [],
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString()
            }
          })}
        >
          <Text style={styles.buttonText}>Add Show</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100 dark:bg-gray-900"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <Stack.Screen options={{ title: 'Props Home' }} />
      <View className="p-4">
        <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Props for Show ID: {currentShowId || 'No show selected'}
        </Text>
        
        {propsLoading ? (
          <ActivityIndicator size="large" />
        ) : props && props.length > 0 ? (
          <PropList
            props={props}
            onEdit={(prop) => router.navigate(`/props/${prop.id}/edit`)}
                          onDelete={(id) => { /* TODO: Implement delete */ }}
          />
        ) : (
          <Text className="text-center text-gray-600 dark:text-gray-400">
            {currentShowId ? 'No props found for this show.' : 'Select a show to view props.'}
          </Text>
        )}
      </View>

      {/* Upcoming Deliveries Section */}
      <View className="p-4">
        <Text className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Upcoming Deliveries (Next 7 Days)</Text>
        {propsLoading ? (
          <ActivityIndicator size="small" />
        ) : getUpcomingDeliveries().length > 0 ? (
          getUpcomingDeliveries().map((prop: Prop) => (
            <View key={prop.id} style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{prop.name}</Text>
              <Text>Delivery Date: {prop.estimatedDeliveryDate ? new Date(prop.estimatedDeliveryDate).toLocaleString() : 'N/A'}</Text>
              <Text>Courier: {prop.courier || 'N/A'}</Text>
              <Text>Tracking #: {prop.trackingNumber || 'N/A'}</Text>
              <TouchableOpacity
                style={{ marginTop: 8, backgroundColor: '#6366F1', borderRadius: 6, padding: 8, alignSelf: 'flex-start' }}
                onPress={() => router.navigate(`/props/${prop.id}`)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>More Details</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={{ color: '#6b7280', textAlign: 'center' }}>No deliveries due in the next week.</Text>
        )}
      </View>

      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-500 p-4 rounded-full shadow-lg"
        onPress={() => {
          if (currentShowId) {
            router.navigate('/props/create');
          } else {
            Alert.alert("No Show Selected", "Please select a show before adding a prop.");
          }
        }}
      >
        <PlusCircle size={24} color="white" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerButton: {
    marginRight: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
   
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#4B5563',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  addShowButton: {
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
