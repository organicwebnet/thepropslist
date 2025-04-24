import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { PropList } from '../components/PropList';
import type { RootStackScreenProps } from '../navigation/types';
import type { Prop, Filters } from '../types';
import { Plus } from 'phosphor-react-native';
import { useLayoutEffect } from 'react';
import { useProps } from '../hooks/useProps';
import firestore from '@react-native-firebase/firestore';

export function Home({ navigation }: RootStackScreenProps<'Home'>) {
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
  });
  const [showId, setShowId] = React.useState<string | null>(null);
  const [isLoadingShows, setIsLoadingShows] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

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
    <View style={styles.container}>
      <PropList
        props={props}
        onPropPress={handlePropPress}
        filters={filters}
        onFilterChange={setFilters}
        isLoading={loading}
      />
    </View>
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