import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Button } from 'react-native';
import { Stack, Link } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { PropList } from '../components/PropList';
import type { Prop } from '@shared/types';
import type { Show } from '../types';
import type { Filters } from '../types';

export default function Props() {
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '' });
  const [show, setShow] = useState<Show | null>(null);

  const getProps = async () => Promise.resolve([]);
  const getShow = async () => Promise.resolve(null as Show | null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const showData = await getShow();
        const propsData = await getProps();
        setShow(showData);
        setProps(propsData);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleResetFilters = () => {
    setFilters({ search: '' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View style={styles.centered}>
        <Text>{error || 'Failed to load show data.'}</Text>
      </View>
    );
  }

  const filteredProps = props.filter(prop => {
    let match = true;
    if (filters.search && !prop.name.toLowerCase().includes(filters.search.toLowerCase())) {
        match = false;
    }
    if (filters.act && prop.act !== filters.act) match = false;
    if (filters.scene && prop.scene !== filters.scene) match = false;
    if (filters.category && prop.category !== filters.category) match = false;
    if (filters.status && prop.status !== filters.status) match = false;
    
    return match;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: show.name,
          headerShown: true,
        }} 
      />
      <View style={styles.content}>
        <PropList
          props={filteredProps}
          show={show}
          filters={filters}
          onFilterChange={setFilters}
          onFilterReset={handleResetFilters}
        />
      </View>
      <Link href="/props/new" style={styles.addButton}>
        <Text style={styles.addButtonText}>Add New Prop</Text>
      </Link>
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
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 50,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 