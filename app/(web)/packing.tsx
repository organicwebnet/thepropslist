import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useShows } from '../../src/contexts/ShowsContext';
import { useProps } from '../../src/contexts/PropsContext'; 
import { PackingPage } from '../../src/pages/PackingPage';

// Renders the PackingPage component directly for the web route
export default function WebPackingScreen() {
  const { selectedShow, loading: showsLoading, error: showsError } = useShows();
  const { props, loading: propsLoading, error: propsError } = useProps(); 

  const loading = showsLoading || propsLoading;
  const error = showsError || propsError;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading data: {error.message}</Text>
      </View>
    );
  }

  if (!selectedShow) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Please select a show first.</Text>
      </View>
    );
  }

  return <PackingPage show={selectedShow} props={props} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
  },
  errorText: {
    color: 'red',
  }
}); 