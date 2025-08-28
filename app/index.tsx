import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
  const { user, loading, status } = useAuth();

  // Show loading while authentication is being determined
  if (loading || status === 'pending') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>The Props List</Text>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  // If user is authenticated, redirect to tabs
  if (user && status === 'in') {
    return <Redirect href="/(tabs)" />;
  }

  // If not authenticated, redirect to auth screen
  return <Redirect href="/auth" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#c084fc',
    marginBottom: 16,
  },
  loading: {
    fontSize: 16,
    color: '#a3a3a3',
  },
}); 
