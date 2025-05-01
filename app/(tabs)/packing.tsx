import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
// Remove imports for local search params and old hooks
// import { useLocalSearchParams } from 'expo-router';
// import { useShow } from '../../src/hooks/useShow';
// import { useProps } from '../../src/hooks/useProps';

// Import context hooks
import { useShows } from '../../src/contexts/ShowsContext';
import { useProps } from '../../src/contexts/PropsContext'; 
import { PackingPage } from '../../src/pages/PackingPage';

export default function Packing() {
  // Get data from contexts
  const { selectedShow, loading: showsLoading, error: showsError } = useShows();
  const { props, loading: propsLoading, error: propsError } = useProps(); 

  // Combine loading and error states from contexts
  const loading = showsLoading || propsLoading;
  const error = showsError || propsError;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  if (!selectedShow) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please select a show first.</Text>
      </View>
    );
  }

  // Pass context data to the page component
  return (
     <PackingPage show={selectedShow} props={props} />
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 20,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 18,
  }
}); 