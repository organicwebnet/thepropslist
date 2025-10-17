import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
  // For web platform, show a simple welcome screen
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>The Props List</Text>
        <Text style={styles.subtitle}>Props Management System</Text>
        <Text style={styles.description}>
          Welcome to The Props List - a comprehensive digital solution for managing theatrical props.
        </Text>
        <View style={styles.features}>
          <Text style={styles.featureTitle}>Features:</Text>
          <Text style={styles.feature}>• Multi-Show Management</Text>
          <Text style={styles.feature}>• QR Code Integration</Text>
          <Text style={styles.feature}>• Camera Integration</Text>
          <Text style={styles.feature}>• Task Boards</Text>
          <Text style={styles.feature}>• Real-time Collaboration</Text>
        </View>
        <Text style={styles.note}>
          For full functionality, please use the mobile app version.
        </Text>
      </View>
    );
  }

  const { user, loading, status, error } = useAuth();

  // Show loading while authentication is being determined
  if (loading || status === 'pending') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>The Props List</Text>
        <Text style={styles.loading}>Loading...</Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error.message}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                // Force reload the app
                window.location?.reload?.();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#c084fc',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#e5e5e5',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 600,
    lineHeight: 24,
  },
  features: {
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e5e5e5',
    marginBottom: 10,
  },
  feature: {
    fontSize: 16,
    color: '#a3a3a3',
    marginBottom: 5,
  },
  note: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loading: {
    fontSize: 16,
    color: '#a3a3a3',
  },
}); 
