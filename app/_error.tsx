import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

export default function ErrorBoundary({ error }: { error: Error }) {
  const router = useRouter();
  const isDev = __DEV__;

  const handleRetry = () => {
    try {
      // Get the current path and replace to it to force a refresh
      const currentPath = router.canGoBack() ? router.back() : router.replace('/');
    } catch {
      // If that fails, redirect to home
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.message}>
        We encountered an issue while loading this screen. Please try again.
      </Text>
      
      {isDev && (
        <View style={styles.debugContainer}>
          <Text style={styles.errorName}>{error.name}</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <Text style={styles.stackTrace}>{error.stack}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Pressable style={styles.button} onPress={handleRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Go Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#E53E3E',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4A5568',
  },
  debugContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 10,
  },
  stackTrace: {
    fontSize: 12,
    color: '#718096',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
