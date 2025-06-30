import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Button } from 'react-native';
import { Stack, Link } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { PropList } from '../components/PropList.tsx';
import type { Prop } from '../shared/types/index.ts';
import type { Show } from '../types.ts';
import type { Filters } from '../types.ts';
import LinearGradient from 'react-native-linear-gradient';
import { globalStyles } from '../styles/globalStyles';

export function PropsPage() {
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
      <View style={globalStyles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View style={globalStyles.centered}>
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
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={globalStyles.flex1}
    >
      <View style={globalStyles.container}>
        <Stack.Screen 
          options={{ 
            title: show.name,
            headerShown: true,
          }} 
        />
        <View style={globalStyles.content}>
          <PropList
            props={filteredProps}
            onEdit={(prop: Prop) => console.log('Edit prop', prop)}
            onDelete={(id: string) => console.log('Delete prop', id)}
          />
        </View>
        <Link href={{ pathname: '/props/new' }} style={globalStyles.addButton}>
          <Text style={globalStyles.addButtonText}>Add New Prop</Text>
        </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  button: {
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 8,
    padding: 12,
  },
}); 
