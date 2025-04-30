import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useShow } from '../../src/hooks/useShow';
import { useProps } from '../../src/hooks/useProps';
import { PackingPage } from '../../src/pages/PackingPage';

export default function Packing() {
  const { showId } = useLocalSearchParams();
  const { show, loading: showLoading, error: showError } = useShow(showId as string);
  const { props, loading: propsLoading, error: propsError } = useProps(showId as string);

  const loading = showLoading || propsLoading;
  const error = showError || propsError;

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

  if (!show) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No show selected</Text>
      </View>
    );
  }

  // return <PackingPage show={show} props={props} />;
  return (
     <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>Packing Page Placeholder</Text>
     </View>
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