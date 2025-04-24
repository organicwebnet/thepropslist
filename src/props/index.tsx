import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';
import PropsList from '../components/PropsList';
import { getProps, getShow } from '../services/propService';
import type { Prop } from '../types/Prop';
import { Filters } from '../types';
import type { Show } from '../types';

export default function PropsListPage() {
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(Filters.create());
  const [show, setShow] = useState<Show | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('DEBUG: Starting to load data...');
        setLoading(true);
        setError(null);
        // For now, we're using a hardcoded show ID. In a real app, this would come from user context/auth
        const showId = 'test-show-1';
        console.log('DEBUG: Fetching data for showId:', showId);
        
        const [fetchedProps, fetchedShow] = await Promise.all([
          getProps(showId),
          getShow(showId),
        ]);
        
        console.log('DEBUG: Data fetched successfully');
        console.log('DEBUG: Props:', JSON.stringify(fetchedProps, null, 2));
        console.log('DEBUG: Show:', JSON.stringify(fetchedShow, null, 2));
        
        setProps(fetchedProps);
        setShow(fetchedShow);
      } catch (err) {
        console.error('DEBUG: Error loading data:', err);
        if (err instanceof Error) {
          console.error('DEBUG: Error details:', err.message);
          console.error('DEBUG: Error stack:', err.stack);
        }
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleFilterChange = (newFilters: Filters) => {
    console.log('Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    console.log('Filters reset');
    setFilters(Filters.create());
  };

  if (loading) {
    console.log('Rendering loading state');
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !show) {
    console.log('Rendering error state:', error);
    return (
      <View style={styles.centered}>
        <Text>{error || 'Failed to load show data.'}</Text>
      </View>
    );
  }

  console.log('Rendering PropsList with', props.length, 'props');
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: show.name,
          headerShown: true,
        }} 
      />
      <View style={styles.content}>
        <PropsList 
          props={props}
          show={show}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 