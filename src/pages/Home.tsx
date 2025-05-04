import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PropList } from '../components/PropList';
import type { RootStackParamList, RootStackScreenProps } from '../navigation/types';
import type { Filters } from '../types';
import type { Prop } from '@shared/types';
import { Plus } from 'phosphor-react-native';
import { useLayoutEffect } from 'react';
import { useProps } from '../hooks/useProps';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Show } from '../types';
import { useFirebase } from '@/contexts/FirebaseContext';

export function Home({ navigation }: RootStackScreenProps<'Home'>) {
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
  });
  const [showId, setShowId] = React.useState<string | null>(null);
  const [isLoadingShows, setIsLoadingShows] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [showData, setShowData] = useState<Show | null>(null);
  const { service } = useFirebase();

  // Test Firebase connection
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Firebase connection...');
        const testQuery = await firestore().collection('shows').limit(1).get();
        console.log('Firebase connection successful, got response:', !testQuery.empty);
        setConnectionError(null);
      } catch (error) {
        console.error('Firebase connection error:', error);
        setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      }
    };
    testConnection();
  }, []);

  // Fetch the first available show
  React.useEffect(() => {
    const fetchFirstShow = async () => {
      try {
        const showsSnapshot = await firestore().collection('shows').get();
        if (!showsSnapshot.empty) {
          const firstShow = showsSnapshot.docs[0];
          setShowId(firstShow.id);
        }
        setIsLoadingShows(false);
      } catch (error) {
        console.error('Error fetching shows:', error);
        setIsLoadingShows(false);
      }
    };

    fetchFirstShow();
  }, []);

  // Use the useProps hook to fetch props
  const { props, loading, error } = useProps(showId || undefined);

  // Fetch Show data when showId changes
  useEffect(() => {
    if (showId) {
      const fetchShow = async () => {
        try {
          const docRef = firestore().collection('shows').doc(showId);
          const docSnap = await docRef.get();
          if (docSnap.exists()) {
            const data = docSnap.data();
            setShowData({
              id: docSnap.id,
              ...data,
              createdAt: data?.createdAt || new Date().toISOString(),
              updatedAt: data?.updatedAt || new Date().toISOString(),
            } as Show);
          } else {
            console.log("No such document!");
            setShowData(null); // Or handle error appropriately
          }
        } catch (e) {
          console.error("Error getting document:", e);
          setShowData(null);
        }
      };
      fetchShow();
    } else {
      setShowData(null);
    }
  }, [showId]);

  // Placeholder handlers for PropList (implement properly if needed)
  const handleNavigateToEditProp = (prop: Prop) => {
    console.log("Navigate to edit prop:", prop.id);
    // Example navigation:
    // navigation.navigate('EditProp', { prop });
  };

  const handleDeleteProp = (propId: string) => {
    console.log("Delete prop:", propId);
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
              contacts: []
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
            setShowData(null);
            // Optionally navigate away or show a success message
          } catch (error) {
            console.error("Error deleting show:", error);
            Alert.alert('Error', 'Could not delete show.');
          }
        } },
      ]);
    } else {
      console.warn("Attempted to delete show without service or showId/Name");
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

  if (connectionError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Firebase Error: {connectionError}</Text>
      </View>
    );
  }

  if (isLoadingShows || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  if (!showId) {
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
              contacts: []
            }
          })}
        >
          <Text style={styles.buttonText}>Add Show</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        {showData && (
          <PropList
            props={props}
            onEdit={handleNavigateToEditProp}
            onDelete={handleDeleteProp}
          />
        )}
      </View>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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